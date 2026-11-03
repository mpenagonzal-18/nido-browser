import { Downloads } from './downloads';
import { pageMenu, addressMenu, editMenu } from './context-menu';
import { resolveLocale, translate } from '../shared/i18n';
import { isYoutubePage } from '../shared/youtube';
import { handleYoutubeNotice } from './youtube';
import { chooseFiles, mediaUrl, serveMedia, exportSettings, importSettings } from './local-files';
import { Sidebar } from './sidebar';
import { Blocking } from './blocking';
import { hostname, siteDomain, browsingContext } from '../shared/privacy';
import {
  app,
  BrowserWindow,
  WebContentsView,
  session,
  ipcMain,
  protocol,
  net,
  Menu,
  dialog,
} from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rm } from 'node:fs/promises';
import { z } from 'zod';
import { chromiumPrivacy, configurePrivacy, secureContents } from './privacy';
import { readSettings, recordHistory, saveSettings } from './storage';
import { APP_NAME } from '../shared/config';
import { addressToUrl, isWebUrl } from '../shared/navigation';
import { defaults, SettingsSchema } from '../shared/settings';
import type { State, TabState } from '../shared/types';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'nido',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);
app.setName(APP_NAME);
chromiumPrivacy();
let win: BrowserWindow;
let settings = defaults();
const locale = () => resolveLocale(settings.language, app.getLocale());
const tr = (source: string) => translate(source, locale());
function youtubeState() {
  for (const tab of tabs)
    if (tab.view && isYoutubePage(tab.state.url))
      tab.view.webContents.send('nido:youtube-state', { paused: blocking.youtubePaused });
}
type Tab = {
  state: TabState;
  view?: WebContentsView;
  lastActive: number;
  origins: Set<string>;
  site?: string;
};
const tabs: Tab[] = [];
let stateQueued = false;
function queueState() {
  if (stateQueued) return;
  stateQueued = true;
  setTimeout(() => {
    stateQueued = false;
    sendState();
  }, 100);
}
const blocking = new Blocking(
  () => settings,
  (id) => {
    const tab = tabs.find((t) => t.view?.webContents.id === id);
    if (tab) {
      tab.state.blocked++;
      queueState();
    }
  },
);
let active = '';
let sidebar: Sidebar;
let overlay = false;
const downloads = new Downloads(sendState);
let browsingPrivacy: ReturnType<typeof configurePrivacy>;
let temporaryPrivacy: ReturnType<typeof configurePrivacy>;
let regularPrivacy: ReturnType<typeof configurePrivacy>;
let sessionPrivacy: ReturnType<typeof configurePrivacy>;
let regularSession: Electron.Session;
let sessionOnly: Electron.Session;
let browsingSession: Electron.Session;
let temporarySession: Electron.Session;
const temporaryOrigins = new Map<string, Set<string>>();
let cleanupFinished = false;
let shuttingDown = false;
const safePreferences = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
} as const;
function current() {
  return tabs.find((t) => t.state.id === active);
}
function sendState() {
  if (!win || win.isDestroyed()) return;
  const state: State = {
    tabs: tabs.map((t) =>
      t.state.url === 'nido://app/newtab' ? { ...t.state, title: tr('Nueva pestaña') } : t.state,
    ),
    active,
    sidebar: sidebar?.visible ?? false,
    provider: sidebar?.selected ?? '',
    settings,
    locale: locale(),
    youtubePaused: blocking.youtubePaused,
    downloads: downloads.snapshot(),
    version: app.getVersion(),
    compatible: !!current()?.site,
    blockingDisabled: blocking.exempt(current()?.state.url ?? ''),
  };
  win.webContents.send('nido:state', state);
}
function layout() {
  if (!win) return;
  const [width, height] = win.getContentSize();
  const sidebarWidth = sidebar?.layout(width, height, overlay) ?? 0;
  for (const tab of tabs) {
    tab.view?.setVisible(
      !overlay && tab.state.id === active && tab.state.url !== 'nido://app/newtab',
    );
    tab.view?.setBounds({
      x: settings.sidebarSide === 'left' ? sidebarWidth : 0,
      y: 118,
      width: Math.max(0, width - sidebarWidth),
      height: Math.max(0, height - 118),
    });
  }
}
function activate(id: string) {
  const tab = tabs.find((t) => t.state.id === id);
  if (!tab) return;
  if (current()) current()!.lastActive = Date.now();
  active = id;
  tab.lastActive = Date.now();
  if (tab.state.suspended) createView(tab);
  layout();
  sendState();
}
function createView(tab: Tab) {
  if (tab.state.url === 'nido://app/newtab') {
    tab.state.suspended = false;
    return;
  }
  const view = new WebContentsView({
    webPreferences: {
      ...safePreferences,
      // Electron's sandboxed renderer gates iframe PRELOAD execution with this
      // flag. Sandbox + context isolation stay on; Node remains off in page JS.
      // Regression tests assert that cross-origin frames have no require/process.
      nodeIntegrationInSubFrames: true,
      disableBlinkFeatures: 'ServiceWorker',
      session:
        tab.site === '@persistent'
          ? regularSession
          : tab.site === '@session'
            ? sessionOnly
            : tab.site
              ? temporarySession
              : browsingSession,
      additionalArguments:
        tab.site && !tab.site.startsWith('@') ? [`--nido-temporary-site=${tab.site}`] : [],
    },
  });
  const rememberOrigin = (url: string) => {
    if (isWebUrl(url)) {
      const origin = new URL(url).origin;
      tab.origins.add(origin);
      if (tab.site && !tab.site.startsWith('@')) {
        const origins = temporaryOrigins.get(tab.site) ?? new Set<string>();
        origins.add(origin);
        temporaryOrigins.set(tab.site, origins);
      }
    }
  };
  rememberOrigin(tab.state.url);
  view.webContents.on('did-start-navigation', (_event, url) => rememberOrigin(url));
  secureContents(view.webContents);
  tab.view = view;
  tab.state.suspended = false;
  win.contentView.addChildView(view);
  view.webContents.on('context-menu', (_, params) => {
    Menu.buildFromTemplate(
      pageMenu(view.webContents, params, {
        settings,
        systemLocale: app.getLocale(),
        open: (url) => {
          openTab(url, false);
        },
        navigate: (url) => {
          void navigateTab(tab, url);
        },
      }),
    ).popup({ window: win });
  });
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url) && blocking.popupAllowed(view.webContents, url)) openTab(url);
    return { action: 'deny' };
  });
  view.webContents.on('will-frame-navigate', (event) => {
    if (!isWebUrl(event.url)) event.preventDefault();
  });
  const navigation = (event: Electron.Event, url: string) => {
    if (!isWebUrl(url)) {
      event.preventDefault();
      return;
    }
    if (browsingContext(url, settings) !== tab.site) {
      event.preventDefault();
      void navigateTab(tab, url).catch((error) => console.error('Cambio de sesión fallido', error));
    }
  };
  view.webContents.on('will-navigate', navigation);
  view.webContents.on('will-redirect', navigation);
  view.webContents.on('did-finish-load', () => {
    void blocking.cosmetic(view.webContents);
    if (isYoutubePage(view.webContents.getURL()))
      view.webContents.send('nido:youtube-state', { paused: blocking.youtubePaused });
  });
  view.webContents.on('page-title-updated', (_, title) => {
    tab.state.title = title;
    sendState();
  });
  const update = () => {
    tab.state.url = view.webContents.getURL() || tab.state.url;
    tab.state.canBack = view.webContents.navigationHistory.canGoBack();
    tab.state.canForward = view.webContents.navigationHistory.canGoForward();
    sendState();
  };
  view.webContents.on('did-navigate', (_, url) => {
    update();
    if (settings.historyEnabled) void recordHistory(url, tab.state.title);
  });
  view.webContents.on('did-navigate-in-page', update);
  view.webContents.on('before-input-event', (event, input) => {
    if (shortcut(input)) event.preventDefault();
  });
  void view.webContents.loadURL(tab.state.url).catch(() => {
    if (tab.view !== view || view.webContents.isDestroyed()) return;
    tab.state.title = tr('No se pudo cargar');
    sendState();
  });
}
function openTab(url = 'nido://app/newtab', foreground = true) {
  const tab: Tab = {
    state: {
      id: crypto.randomUUID(),
      title: tr(url.startsWith('nido:') ? 'Nueva pestaña' : 'Cargando…'),
      url,
      suspended: false,
      blocked: 0,
      canBack: false,
      canForward: false,
    },
    lastActive: Date.now(),
    origins: new Set(),
    site: browsingContext(url, settings),
  };
  tabs.push(tab);
  createView(tab);
  if (foreground) activate(tab.state.id);
  else {
    layout();
    sendState();
  }
  return tab.state.id;
}
async function closeTab(id: string) {
  const index = tabs.findIndex((t) => t.state.id === id);
  if (index < 0) return;
  if (tabs.length === 1) {
    win.close();
    return;
  }
  const [tab] = tabs.splice(index, 1);
  if (tab.view) {
    const view = tab.view;
    tab.view = undefined;
    win.contentView.removeChildView(view);
    view.webContents.close();
  }
  if (id === active) activate(tabs[Math.min(index, tabs.length - 1)].state.id);
  sendState();
  await clearContext(tab.site, tab.origins, tab);
}
function detachView(tab: Tab) {
  if (!tab.view) return;
  win.contentView.removeChildView(tab.view);
  tab.view.webContents.close();
  tab.view = undefined;
}
async function clearContext(site: string | undefined, origins: Set<string>, except: Tab) {
  if (site?.startsWith('@')) return; // Global profiles retain site sessions across tabs and navigations.
  if (!site) {
    await browsingPrivacy.clearOrigins(origins);
    return;
  }
  if (tabs.some((tab) => tab !== except && tab.site === site)) return;
  await temporaryPrivacy.clearOrigins(new Set([...origins, ...(temporaryOrigins.get(site) ?? [])]));
  temporaryOrigins.delete(site);
}
async function navigateTab(tab: Tab, url: string) {
  const site = browsingContext(url, settings);
  if (site !== tab.site) {
    detachView(tab);
    const previous = tab.site;
    tab.site = site;
    await clearContext(previous, new Set(tab.origins), tab);
    tab.origins.clear();
  }
  tab.state.url = url;
  if (url.startsWith('nido:')) {
    detachView(tab);
    tab.state.title = tr('Nueva pestaña');
    tab.state.canBack = false;
    tab.state.canForward = false;
  } else if (!tab.view) {
    if (!tab.state.suspended || tab.state.id === active) createView(tab);
  } else void tab.view.webContents.loadURL(url).catch(() => {});
  layout();
  sendState();
}
async function navigate(value: string) {
  const tab = current();
  if (!tab) return;
  const url = addressToUrl(value, settings.search, settings.searx);
  // Commit address/search editing before broadcasting the new URL. Otherwise a
  // focused field deliberately ignores state updates and keeps the old address.
  await win.webContents.executeJavaScript(
    `document.getElementById('address')?.blur(); document.getElementById('search')?.blur();`,
  );
  if (!tabs.includes(tab)) return;
  await navigateTab(tab, url);
  if (active === tab.state.id) tab.view?.webContents.focus();
}

function shortcut(input: Electron.Input): boolean {
  if (input.type !== 'keyDown' || !(input.control || input.meta)) return false;
  switch (input.key.toLowerCase()) {
    case 'a':
      if (input.shift) {
        sidebar.toggle();
        return true;
      }
      return false;
    case 'j':
      win.webContents.send('nido:show-downloads');
      return true;
    case 't':
      openTab();
      return true;
    case 'w':
      void closeTab(active).catch((error) =>
        console.error('No se pudieron limpiar los datos de la pestaña', error),
      );
      return true;
    case 'l':
      win.webContents.focus();
      win.webContents.send('nido:focus-address');
      return true;
    case 'r':
      current()?.view?.webContents.reload();
      return true;
    case 'tab': {
      const i = tabs.findIndex((t) => t.state.id === active);
      activate(tabs[(i + (input.shift ? tabs.length - 1 : 1)) % tabs.length].state.id);
      return true;
    }
  }
  return false;
}
const Command = z.discriminatedUnion('action', [
  z.object({ action: z.literal('state'), payload: z.unknown().optional() }),
  ...[
    'new',
    'reload',
    'back',
    'forward',
    'home',
    'minimize',
    'maximize',
    'quit',
    'toggle-blocking',
    'toggle-compatibility',
    'update-lists',
    'sidebar-toggle',
    'clear-ai',
    'choose-music',
    'choose-wallpaper',
    'export-settings',
    'import-settings',
    'reset-settings',
    'clear-history',
    'clear-browsing-data',
    'clear-downloads',
  ].map((action) => z.object({ action: z.literal(action), payload: z.unknown().optional() })),
  ...['activate', 'close', 'navigate', 'provider', 'media-url'].map((action) =>
    z.object({ action: z.literal(action), payload: z.string().max(4096) }),
  ),
  z.object({
    action: z.literal('download'),
    payload: z.object({
      id: z.string().uuid(),
      action: z.enum(['pause', 'resume', 'cancel', 'open', 'folder']),
    }),
  }),
  z.object({ action: z.literal('settings'), payload: SettingsSchema }),
  z.object({ action: z.literal('overlay'), payload: z.boolean() }),
  z.object({
    action: z.literal('reorder'),
    payload: z.object({ id: z.string(), target: z.string() }),
  }),
]);
app.whenReady().then(async () => {
  settings = await readSettings();
  const browsing = (browsingSession = session.fromPartition('nido-browsing', { cache: true }));
  regularSession = session.fromPartition('persist:nido-browsing', { cache: true });
  regularPrivacy = configurePrivacy(regularSession, () => settings, false, false, true);
  sessionOnly = session.fromPartition('nido-session', { cache: true });
  sessionPrivacy = configurePrivacy(sessionOnly, () => settings, false, false, true);
  await sessionPrivacy.clearAll();
  temporarySession = session.fromPartition('nido-compatible', { cache: true });
  temporaryPrivacy = configurePrivacy(temporarySession, () => settings, false, true);
  await temporaryPrivacy.clearAll();
  browsingPrivacy = configurePrivacy(browsing, () => settings);
  await browsingPrivacy.clearAll();
  await blocking.load();
  blocking.attach(browsing);
  blocking.attach(temporarySession);
  blocking.attach(regularSession);
  blocking.attach(sessionOnly);
  protocol.handle('nido', (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'app') return new Response('No encontrado', { status: 404 });
    if (url.pathname.startsWith('/media/')) return serveMedia(request);
    if (!['/', '/newtab', '/index.js', '/style.css'].includes(url.pathname))
      return new Response('No encontrado', { status: 404 });
    const file =
      url.pathname === '/index.js'
        ? 'index.js'
        : url.pathname === '/style.css'
          ? 'style.css'
          : 'index.html';
    return net.fetch(pathToFileURL(path.join(__dirname, '../renderer', file)).href);
  });
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 780,
    minHeight: 500,
    frame: false,
    icon: path.join(app.getAppPath(), 'assets/icon.png'),
    backgroundColor: '#131a18',
    webPreferences: { ...safePreferences, preload: path.join(__dirname, '../preload/index.js') },
  });
  sidebar = new Sidebar(
    win,
    () => settings,
    blocking,
    openTab,
    () => {
      layout();
      sendState();
    },
    shortcut,
  );
  await sidebar.prepare();
  for (const ses of [browsing, temporarySession, regularSession, sessionOnly, sidebar.session])
    downloads.attach(ses);
  let confirmingClose = false;
  win.on('close', (event) => {
    if (!cleanupFinished) {
      event.preventDefault();
      if (!downloads.active) app.quit();
      else if (!confirmingClose) {
        confirmingClose = true;
        void dialog
          .showMessageBox(win, {
            type: 'question',
            title: tr('Descargas activas'),
            message: tr('Cerrar Nido cancelará las descargas activas.'),
            buttons: [tr('Seguir descargando'), tr('Cerrar Nido')],
            defaultId: 0,
            cancelId: 0,
          })
          .then(({ response }) => {
            confirmingClose = false;
            if (response === 1) app.quit();
          })
          .catch(() => {
            confirmingClose = false;
          });
      }
    }
  });
  win.webContents.on('context-menu', async (_, params) => {
    try {
      const target = await win.webContents.executeJavaScript(`(() => {
      const el = document.elementFromPoint(${Number(params.x)}, ${Number(params.y)});
      const tab = el?.closest('[data-tab-id]');
      return { id: tab?.getAttribute('data-tab-id'), address: ['address','search'].includes(el?.id) };
    })()`);
      if (win.isDestroyed()) return;
      let template: Electron.MenuItemConstructorOptions[];
      if (target.id && tabs.some((t) => t.state.id === target.id)) {
        const id: string = target.id;
        template = [
          {
            label: tr('Nueva pestaña'),
            click: () => {
              openTab();
            },
          },
          {
            label: tr('Duplicar pestaña'),
            click: () => {
              const tab = tabs.find((t) => t.state.id === id);
              if (tab) openTab(tab.state.url);
            },
          },
          { type: 'separator' },
          {
            label: tr('Cerrar pestaña'),
            click: () => {
              void closeTab(id);
            },
          },
          {
            label: tr('Cerrar las demás pestañas'),
            click: () => {
              void (async () => {
                for (const tab of [...tabs]) if (tab.state.id !== id) await closeTab(tab.state.id);
              })();
            },
          },
        ];
      } else if (target.address)
        template = await addressMenu(params, {
          settings,
          systemLocale: app.getLocale(),
          open: (url) => {
            openTab(url, false);
          },
          navigate: (url) => {
            void navigate(url).catch((error) => console.error('Navigation failed', error));
          },
        });
      else if (params.isEditable) template = editMenu(params, locale());
      else
        template = [
          {
            label: tr('Nueva pestaña'),
            click: () => {
              openTab();
            },
          },
        ];
      if (!win.isDestroyed()) Menu.buildFromTemplate(template).popup({ window: win });
    } catch (error) {
      if (!win.isDestroyed()) console.error('Context menu failed', error);
    }
  });
  win.on('resize', layout);
  secureContents(win.webContents);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.on('before-input-event', (event, input) => {
    if (shortcut(input)) event.preventDefault();
  });
  async function applySettings(next: unknown) {
    const previous = settings;
    settings = SettingsSchema.parse(next);
    await saveSettings(settings);
    if (previous.allowSessionCookies !== settings.allowSessionCookies) {
      browsingPrivacy();
      await browsingPrivacy.clearAll();
      for (const entry of tabs) if (!entry.site) entry.view?.webContents.reload();
    }
    if (
      previous.browsingMode !== settings.browsingMode ||
      JSON.stringify(previous.compatibilitySites) !== JSON.stringify(settings.compatibilitySites)
    ) {
      for (const entry of tabs)
        if (browsingContext(entry.state.url, settings) !== entry.site)
          await navigateTab(entry, entry.state.url);
    }
    if (
      previous.youtubeAutoPause !== settings.youtubeAutoPause ||
      JSON.stringify(previous.videoExclusions) !== JSON.stringify(settings.videoExclusions)
    ) {
      if (!settings.youtubeAutoPause) blocking.resumeYoutube();
      blocking.refreshYoutube();
      for (const entry of tabs)
        if (entry.view && isYoutubePage(entry.state.url)) entry.view.webContents.reload();
    }
    await sidebar.reconcile(previous);
    layout();
    sendState();
  }
  ipcMain.on('nido:youtube-warning', (event, raw) => {
    handleYoutubeNotice(
      blocking,
      settings,
      event,
      raw,
      (contents) => tabs.some((tab) => tab.view?.webContents === contents),
      () => {
        youtubeState();
        sendState();
      },
    );
  });
  ipcMain.handle('nido:command', async (event, raw) => {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame)
      throw new Error(tr('IPC no autorizado'));
    const command = Command.parse(raw);
    const tab = current();
    switch (command.action) {
      case 'download': {
        const payload = command.payload as {
          id: string;
          action: 'pause' | 'resume' | 'cancel' | 'open' | 'folder';
        };
        await downloads.action(payload.id, payload.action);
        break;
      }
      case 'clear-downloads':
        downloads.clear();
        break;
      case 'media-url':
        return mediaUrl(command.payload as string, settings);
      case 'choose-music': {
        const files = await chooseFiles(win, 'music', locale());
        if (files.length) {
          settings.music.paths = files;
          await saveSettings(settings);
          sendState();
        }
        return files;
      }
      case 'choose-wallpaper': {
        const files = await chooseFiles(win, 'wallpaper', locale());
        if (files[0]) {
          settings.wallpaper.image = files[0];
          settings.wallpaper.kind = 'image';
          await saveSettings(settings);
          sendState();
        }
        return files;
      }
      case 'export-settings':
        await exportSettings(win, settings);
        break;
      case 'import-settings': {
        const imported = await importSettings(win, locale());
        if (imported) await applySettings(imported);
        break;
      }
      case 'reset-settings':
        await applySettings(defaults());
        break;
      case 'clear-browsing-data': {
        for (const entry of tabs) detachView(entry);
        await Promise.all([
          regularPrivacy.clearAll(),
          sessionPrivacy.clearAll(),
          browsingPrivacy.clearAll(),
          temporaryPrivacy.clearAll(),
        ]);
        temporaryOrigins.clear();
        for (const entry of tabs) if (!entry.state.suspended) createView(entry);
        layout();
        sendState();
        return tr('Cookies y datos de navegación borrados. La sesión de IA no se ha borrado.');
      }
      case 'clear-history':
        await rm(path.join(app.getPath('userData'), 'history.json'), { force: true });
        break;
      case 'sidebar-toggle':
        sidebar.toggle();
        break;
      case 'provider':
        sidebar.select(command.payload as string);
        break;
      case 'clear-ai':
        await sidebar.clear();
        return tr('Datos de IA borrados');
      case 'overlay':
        overlay = command.payload as boolean;
        layout();
        break;
      case 'settings':
        await applySettings(command.payload);
        break;
      case 'update-lists':
        await blocking.updateManually();
        return tr('Listas actualizadas. Recarga las páginas.');
      case 'toggle-compatibility': {
        if (settings.browsingMode !== 'strict') return;
        if (!tab || !isWebUrl(tab.state.url)) return;
        const site = tab.site ?? siteDomain(tab.state.url);
        const sites = tab.site
          ? settings.compatibilitySites.filter((value) => value !== site)
          : [...settings.compatibilitySites, site];
        await applySettings({ ...settings, compatibilitySites: sites });
        break;
      }
      case 'toggle-blocking': {
        if (
          tab &&
          isYoutubePage(tab.state.url) &&
          (blocking.youtubePaused || !settings.youtubeAutoPause)
        ) {
          blocking.resumeYoutube();
          if (!settings.youtubeAutoPause)
            await applySettings({ ...settings, youtubeAutoPause: true });
          else tab.view?.webContents.reload();
          youtubeState();
          sendState();
          break;
        }
        const host = hostname(tab?.state.url ?? '');
        if (host) {
          if (blocking.disabledSites.has(host)) blocking.disabledSites.delete(host);
          else blocking.disabledSites.add(host);
          tab?.view?.webContents.reload();
          sendState();
        }
        break;
      }
      case 'state':
        sendState();
        break;
      case 'new':
        openTab();
        break;
      case 'activate':
        activate(command.payload as string);
        break;
      case 'close':
        await closeTab(command.payload as string);
        break;
      case 'navigate':
        await navigate(command.payload as string);
        break;
      case 'reload':
        tab?.view?.webContents.reload();
        break;
      case 'back':
        if (tab?.view?.webContents.navigationHistory.canGoBack())
          tab.view.webContents.navigationHistory.goBack();
        break;
      case 'forward':
        if (tab?.view?.webContents.navigationHistory.canGoForward())
          tab.view.webContents.navigationHistory.goForward();
        break;
      case 'home':
        await navigate('');
        break;
      case 'reorder': {
        const p = command.payload as { id: string; target: string };
        const from = tabs.findIndex((t) => t.state.id === p.id);
        const to = tabs.findIndex((t) => t.state.id === p.target);
        if (from >= 0 && to >= 0) tabs.splice(to, 0, tabs.splice(from, 1)[0]);
        sendState();
        break;
      }
      case 'minimize':
        win.minimize();
        break;
      case 'maximize':
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
        break;
      case 'quit':
        win.close();
        break;
    }
  });
  await win.loadURL('nido://app/');
  openTab();
  const timer = setInterval(() => {
    sidebar.unloadIdle();
    for (const tab of tabs)
      if (
        tab.state.id !== active &&
        tab.view &&
        Date.now() - tab.lastActive > settings.suspendMinutes * 60_000
      ) {
        win.contentView.removeChildView(tab.view);
        tab.view.webContents.close();
        tab.view = undefined;
        tab.state.suspended = true;
      }
    sendState();
  }, 30_000);
  timer.unref();
});
app.on('before-quit', (event) => {
  if (cleanupFinished) return;
  event.preventDefault();
  if (shuttingDown) return;
  shuttingDown = true;
  downloads.stop();
  browsingPrivacy?.dispose();
  temporaryPrivacy?.dispose();
  regularPrivacy?.dispose();
  sessionPrivacy?.dispose();
  // Destroy remote producers before clearing their storage. Keep the native
  // window alive until cleanup finishes, so child views can be detached safely.
  sidebar?.closeAll();
  for (const tab of tabs) {
    const contents = tab.view?.webContents;
    tab.view = undefined;
    if (contents && !contents.isDestroyed()) contents.close();
  }
  void (async () => {
    try {
      await browsingPrivacy?.clearAll();
      await temporaryPrivacy?.clearAll();
      await sessionPrivacy?.clearAll();
      regularSession?.flushStorageData();
      await regularSession?.cookies.flushStore();
      await sidebar?.session.cookies.flushStore();
    } catch (error) {
      console.error('No se pudo completar la limpieza al cerrar', error);
      process.exitCode = 1;
    } finally {
      cleanupFinished = true;
      app.quit();
    }
  })();
});
app.on('window-all-closed', () => app.quit());

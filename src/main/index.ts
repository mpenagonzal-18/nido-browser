import { chooseFiles, mediaUrl, serveMedia, exportSettings, importSettings } from './local-files';
import { Sidebar } from './sidebar';
import { Blocking } from './blocking';
import { hostname } from '../shared/privacy';
import {
  app,
  BrowserWindow,
  WebContentsView,
  session,
  ipcMain,
  protocol,
  net,
  Menu,
  clipboard,
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
type Tab = { state: TabState; view?: WebContentsView; lastActive: number };
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
let refreshCookies: () => void;
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
    tabs: tabs.map((t) => t.state),
    active,
    sidebar: sidebar?.visible ?? false,
    provider: sidebar?.selected ?? '',
    settings,
    version: app.getVersion(),
    blockingDisabled: blocking.disabledSites.has(hostname(current()?.state.url ?? '')),
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
      session: session.fromPartition('nido-browsing', { cache: false }),
    },
  });
  secureContents(view.webContents);
  tab.view = view;
  tab.state.suspended = false;
  win.contentView.addChildView(view);
  view.webContents.on('context-menu', (_, params) => {
    Menu.buildFromTemplate([
      {
        label: 'Copiar texto seleccionado para la IA',
        enabled: Boolean(params.selectionText),
        click: () => clipboard.writeText(params.selectionText),
      },
      {
        label: 'Copiar URL de la página actual',
        click: () => clipboard.writeText(view.webContents.getURL()),
      },
    ]).popup({ window: win });
  });
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url) && blocking.popupAllowed(view.webContents, url)) openTab(url);
    return { action: 'deny' };
  });
  view.webContents.on('will-frame-navigate', (event) => {
    if (!isWebUrl(event.url)) event.preventDefault();
  });
  view.webContents.on('will-navigate', (event, url) => {
    if (!isWebUrl(url)) event.preventDefault();
  });
  view.webContents.on('will-redirect', (event, url) => {
    if (!isWebUrl(url)) event.preventDefault();
  });
  view.webContents.on('did-finish-load', () => void blocking.cosmetic(view.webContents));
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
    tab.state.title = 'No se pudo cargar';
    sendState();
  });
}
function openTab(url = 'nido://app/newtab') {
  const tab: Tab = {
    state: {
      id: crypto.randomUUID(),
      title: url.startsWith('nido:') ? 'Nueva pestaña' : 'Cargando…',
      url,
      suspended: false,
      blocked: 0,
      canBack: false,
      canForward: false,
    },
    lastActive: Date.now(),
  };
  tabs.push(tab);
  createView(tab);
  activate(tab.state.id);
  return tab.state.id;
}
function closeTab(id: string) {
  const index = tabs.findIndex((t) => t.state.id === id);
  if (index < 0) return;
  const [tab] = tabs.splice(index, 1);
  if (tab.view) {
    win.contentView.removeChildView(tab.view);
    tab.view.webContents.close();
  }
  if (!tabs.length) openTab();
  else if (id === active) activate(tabs[Math.min(index, tabs.length - 1)].state.id);
  sendState();
}
function navigate(value: string) {
  const url = addressToUrl(value, settings.search, settings.searx);
  const tab = current();
  if (!tab) return;
  tab.state.url = url;
  if (url.startsWith('nido:')) {
    if (tab.view) {
      win.contentView.removeChildView(tab.view);
      tab.view.webContents.close();
      tab.view = undefined;
    }
    tab.state.title = 'Nueva pestaña';
    tab.state.canBack = false;
    tab.state.canForward = false;
    layout();
    sendState();
  } else if (!tab.view) {
    createView(tab);
    layout();
  } else {
    void tab.view.webContents.loadURL(url).catch(() => {});
    layout();
  }
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
    case 't':
      openTab();
      return true;
    case 'w':
      closeTab(active);
      return true;
    case 'l':
      win.webContents.send('nido:focus-address');
      win.webContents.focus();
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
    'update-lists',
    'sidebar-toggle',
    'clear-ai',
    'choose-music',
    'choose-wallpaper',
    'export-settings',
    'import-settings',
    'reset-settings',
    'clear-history',
  ].map((action) => z.object({ action: z.literal(action), payload: z.unknown().optional() })),
  ...['activate', 'close', 'navigate', 'provider', 'media-url'].map((action) =>
    z.object({ action: z.literal(action), payload: z.string().max(4096) }),
  ),
  z.object({ action: z.literal('settings'), payload: SettingsSchema }),
  z.object({ action: z.literal('overlay'), payload: z.boolean() }),
  z.object({
    action: z.literal('reorder'),
    payload: z.object({ id: z.string(), target: z.string() }),
  }),
]);
app.whenReady().then(async () => {
  settings = await readSettings();
  const browsing = session.fromPartition('nido-browsing', { cache: false });
  refreshCookies = configurePrivacy(browsing, () => settings);
  await blocking.load();
  blocking.attach(browsing);
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
      refreshCookies();
      await browsing.clearStorageData();
      for (const entry of tabs) entry.view?.webContents.reload();
    }
    await sidebar.reconcile(previous);
    layout();
    sendState();
  }
  ipcMain.handle('nido:command', async (event, raw) => {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame)
      throw new Error('IPC no autorizado');
    const command = Command.parse(raw);
    const tab = current();
    switch (command.action) {
      case 'media-url':
        return mediaUrl(command.payload as string, settings);
      case 'choose-music': {
        const files = await chooseFiles(win, 'music');
        if (files.length) {
          settings.music.paths = files;
          await saveSettings(settings);
          sendState();
        }
        return files;
      }
      case 'choose-wallpaper': {
        const files = await chooseFiles(win, 'wallpaper');
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
        const imported = await importSettings(win);
        if (imported) await applySettings(imported);
        break;
      }
      case 'reset-settings':
        await applySettings(defaults());
        break;
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
        return 'Datos de IA borrados';
      case 'overlay':
        overlay = command.payload as boolean;
        layout();
        break;
      case 'settings':
        await applySettings(command.payload);
        break;
      case 'update-lists':
        await blocking.updateManually();
        return 'Listas actualizadas. Recarga las páginas.';
      case 'toggle-blocking': {
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
        closeTab(command.payload as string);
        break;
      case 'navigate':
        navigate(command.payload as string);
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
        navigate('');
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
app.on('window-all-closed', () => {
  sidebar?.closeAll();
  for (const tab of tabs)
    if (tab.view && !tab.view.webContents.isDestroyed()) tab.view.webContents.close();
  void session
    .fromPartition('nido-browsing')
    .clearStorageData()
    .finally(() => app.quit());
});

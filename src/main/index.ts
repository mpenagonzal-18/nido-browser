import { app, BrowserWindow, WebContentsView, session, ipcMain, protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { chromiumPrivacy, configurePrivacy, secureContents, upgradeHttp } from './privacy';
import { readSettings, recordHistory } from './storage';
import { APP_NAME } from '../shared/config';
import { addressToUrl, isWebUrl } from '../shared/navigation';
import { defaults } from '../shared/settings';
import type { State, TabState } from '../shared/types';

protocol.registerSchemesAsPrivileged([{ scheme: 'nido', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
app.setName(APP_NAME);
chromiumPrivacy();
let win: BrowserWindow;
let settings = defaults();
type Tab = { state: TabState; view?: WebContentsView; lastActive: number };
const tabs: Tab[] = [];
let active = '';
const safePreferences = { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } as const;
function current() { return tabs.find(t => t.state.id === active); }
function sendState() {
  if (!win || win.isDestroyed()) return;
  const state: State = { tabs: tabs.map(t => t.state), active, sidebar: false, provider: settings.providers[0]?.id ?? '', settings, version: app.getVersion(), blockingDisabled: false };
  win.webContents.send('nido:state', state);
}
function layout() {
  if (!win) return;
  const [width, height] = win.getContentSize();
  for (const tab of tabs) {
    tab.view?.setVisible(tab.state.id === active && tab.state.url !== 'nido://app/newtab');
    tab.view?.setBounds({ x: 0, y: 118, width, height: Math.max(0, height - 118) });
  }
}
function activate(id: string) { const tab = tabs.find(t => t.state.id === id); if (!tab) return; active = id; tab.lastActive = Date.now(); if (tab.state.suspended) createView(tab); layout(); sendState(); }
function createView(tab: Tab) {
  if (tab.state.url === 'nido://app/newtab') { tab.state.suspended = false; return; }
  const view = new WebContentsView({ webPreferences: { ...safePreferences, session: session.fromPartition('nido-browsing', { cache: false }) } });
  secureContents(view.webContents);
  tab.view = view; tab.state.suspended = false; win.contentView.addChildView(view);
  view.webContents.setWindowOpenHandler(({ url }) => { if (isWebUrl(url)) openTab(url); return { action: 'deny' }; });
  view.webContents.on('will-navigate', (event, url) => { if (!isWebUrl(url)) event.preventDefault(); });
  view.webContents.on('will-redirect', (event, url) => { if (!isWebUrl(url)) event.preventDefault(); });
  view.webContents.on('page-title-updated', (_, title) => { tab.state.title = title; sendState(); });
  const update = () => { tab.state.url = view.webContents.getURL() || tab.state.url; tab.state.canBack = view.webContents.navigationHistory.canGoBack(); tab.state.canForward = view.webContents.navigationHistory.canGoForward(); sendState(); };
  view.webContents.on('did-navigate', (_, url) => { update(); if (settings.historyEnabled) void recordHistory(url, tab.state.title); }); view.webContents.on('did-navigate-in-page', update);
  view.webContents.on('before-input-event', (event, input) => { if (shortcut(input)) event.preventDefault(); });
  void view.webContents.loadURL(tab.state.url).catch(() => { tab.state.title = 'No se pudo cargar'; sendState(); });
}
function openTab(url = 'nido://app/newtab') {
  const tab: Tab = { state: { id: crypto.randomUUID(), title: url.startsWith('nido:') ? 'Nueva pestaña' : 'Cargando…', url, suspended: false, blocked: 0, canBack: false, canForward: false }, lastActive: Date.now() };
  tabs.push(tab); createView(tab); activate(tab.state.id); return tab.state.id;
}
function closeTab(id: string) { const index = tabs.findIndex(t => t.state.id === id); if (index < 0) return; const [tab] = tabs.splice(index, 1); if (tab.view) { win.contentView.removeChildView(tab.view); tab.view.webContents.close(); } if (!tabs.length) openTab(); else if (id === active) activate(tabs[Math.min(index, tabs.length - 1)].state.id); sendState(); }
function navigate(value: string) { const url = addressToUrl(value, settings.search, settings.searx); const tab = current(); if (!tab) return; tab.state.url = url; if (url.startsWith('nido:')) { layout(); sendState(); } else if (!tab.view) { createView(tab); layout(); } else { void tab.view.webContents.loadURL(url).catch(() => {}); layout(); } }
function shortcut(input: Electron.Input): boolean {
  if (input.type !== 'keyDown' || !(input.control || input.meta)) return false;
  switch (input.key.toLowerCase()) {
    case 't': openTab(); return true;
    case 'w': closeTab(active); return true;
    case 'l': win.webContents.send('nido:focus-address'); win.webContents.focus(); return true;
    case 'r': current()?.view?.webContents.reload(); return true;
    case 'tab': { const i = tabs.findIndex(t => t.state.id === active); activate(tabs[(i + (input.shift ? tabs.length - 1 : 1)) % tabs.length].state.id); return true; }
  }
  return false;
}
const Command = z.discriminatedUnion('action', [
  z.object({ action: z.literal('state'), payload: z.unknown().optional() }),
  ...['new', 'reload', 'back', 'forward', 'home', 'minimize', 'maximize', 'quit'].map(action => z.object({ action: z.literal(action), payload: z.unknown().optional() })),
  ...['activate', 'close', 'navigate'].map(action => z.object({ action: z.literal(action), payload: z.string().max(4096) })),
  z.object({ action: z.literal('reorder'), payload: z.object({ id: z.string(), target: z.string() }) }),
]);
app.whenReady().then(async () => {
  settings = await readSettings();
  const browsing = session.fromPartition('nido-browsing', { cache: false });
  configurePrivacy(browsing, () => settings);
  browsing.webRequest.onBeforeRequest((details, callback) => { const upgraded = details.resourceType === 'mainFrame' ? upgradeHttp(details.url) : undefined; callback(upgraded ? { redirectURL: upgraded } : {}); });
  protocol.handle('nido', request => {
    const url = new URL(request.url); const file = url.pathname === '/index.js' ? 'index.js' : url.pathname === '/style.css' ? 'style.css' : 'index.html';
    return net.fetch(pathToFileURL(path.join(__dirname, '../renderer', file)).href);
  });
  win = new BrowserWindow({ width: 1280, height: 860, minWidth: 780, minHeight: 500, frame: false, backgroundColor: '#131a18', webPreferences: { ...safePreferences, preload: path.join(__dirname, '../preload/index.js') } });
  win.on('resize', layout);
  secureContents(win.webContents);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('before-input-event', (event, input) => { if (shortcut(input)) event.preventDefault(); });
  ipcMain.handle('nido:command', (event, raw) => {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('IPC no autorizado');
    const command = Command.parse(raw); const tab = current();
    switch (command.action) {
      case 'state': sendState(); break;
      case 'new': openTab(); break;
      case 'activate': activate(command.payload as string); break;
      case 'close': closeTab(command.payload as string); break;
      case 'navigate': navigate(command.payload as string); break;
      case 'reload': tab?.view?.webContents.reload(); break;
      case 'back': if (tab?.view?.webContents.navigationHistory.canGoBack()) tab.view.webContents.navigationHistory.goBack(); break;
      case 'forward': if (tab?.view?.webContents.navigationHistory.canGoForward()) tab.view.webContents.navigationHistory.goForward(); break;
      case 'home': navigate(''); break;
      case 'reorder': { const p = command.payload as { id: string; target: string }; const from = tabs.findIndex(t => t.state.id === p.id); const to = tabs.findIndex(t => t.state.id === p.target); if (from >= 0 && to >= 0) tabs.splice(to, 0, tabs.splice(from, 1)[0]); sendState(); break; }
      case 'minimize': win.minimize(); break;
      case 'maximize': if (win.isMaximized()) win.unmaximize(); else win.maximize(); break;
      case 'quit': win.close(); break;
    }
  });
  await win.loadURL('nido://app/'); openTab();
  const timer = setInterval(() => { for (const tab of tabs) if (tab.state.id !== active && tab.view && Date.now() - tab.lastActive > settings.suspendMinutes * 60_000) { win.contentView.removeChildView(tab.view); tab.view.webContents.close(); tab.view = undefined; tab.state.suspended = true; } sendState(); }, 30_000); timer.unref();
});
app.on('window-all-closed', () => { for (const tab of tabs) if (tab.view && !tab.view.webContents.isDestroyed()) tab.view.webContents.close(); void session.fromPartition('nido-browsing').clearStorageData().finally(() => app.quit()); });

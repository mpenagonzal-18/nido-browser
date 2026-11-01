import { WebContentsView, session, type BrowserWindow, clipboard, Menu } from 'electron';
import type { Settings } from '../shared/settings';
import { domainMatches, hostname, providerAllows } from '../shared/privacy';
import { isWebUrl } from '../shared/navigation';
import { configurePrivacy, secureContents } from './privacy';
import type { Blocking } from './blocking';
export class Sidebar {
  visible = false;
  selected = '';
  private views = new Map<string, { view: WebContentsView; lastUsed: number }>();
  private initialized = false;
  readonly session = session.fromPartition('persist:ai-sidebar', { cache: false });
  constructor(private win: BrowserWindow, private settings: () => Settings, private blocking: Blocking, private openTab: (url: string) => unknown, private changed: () => void, private key: (input: Electron.Input) => boolean) {}
  private initialize() {
    if (this.initialized) return;
    configurePrivacy(this.session, this.settings, true); this.blocking.attach(this.session, true); this.initialized = true;
  }
  toggle() { this.visible = !this.visible; if (this.visible) this.select(this.selected || this.settings().providers[0]?.id || ''); this.changed(); }
  select(id: string) {
    const provider = this.settings().providers.find(p => p.id === id); if (!provider) return;
    if (this.selected && this.views.has(this.selected)) this.views.get(this.selected)!.lastUsed = Date.now();
    this.selected = id; this.initialize();
    if (!this.views.has(id)) {
      const view = new WebContentsView({ webPreferences: { session: this.session, contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true } });
      secureContents(view.webContents); this.win.contentView.addChildView(view);
      this.views.set(id, { view, lastUsed: Date.now() });
      const sameProvider = (url: string) => isWebUrl(url) && domainMatches(hostname(url), hostname(provider.url));
      const navigation = (event: Electron.Event, url: string) => { if (!sameProvider(url)) { event.preventDefault(); if (isWebUrl(url)) this.openTab(url); } };
      view.webContents.on('will-navigate', navigation); view.webContents.on('will-redirect', navigation);
      view.webContents.on('will-frame-navigate', event => { if (!event.isMainFrame && !providerAllows(event.url, this.settings().providers)) event.preventDefault(); });
      view.webContents.setWindowOpenHandler(({ url }) => { if (sameProvider(url)) void view.webContents.loadURL(url).catch(() => {}); else if (isWebUrl(url)) this.openTab(url); return { action: 'deny' }; });
      view.webContents.on('before-input-event', (event, input) => { if (this.key(input)) event.preventDefault(); });
      view.webContents.on('did-finish-load', () => void this.blocking.cosmetic(view.webContents, true));
      view.webContents.on('context-menu', (_, params) => { Menu.buildFromTemplate([{ label: 'Copiar texto seleccionado para la IA', enabled: Boolean(params.selectionText), click: () => clipboard.writeText(params.selectionText) }, { label: 'Copiar URL de la página actual', click: () => clipboard.writeText(view.webContents.getURL()) }]).popup({ window: this.win }); });
      void view.webContents.loadURL(provider.url).catch(() => {});
    }
    this.changed();
  }
  layout(width: number, height: number, covered: boolean) {
    const sidebarWidth = Math.min(this.settings().sidebarWidth, Math.max(280, width - 360));
    for (const [id, { view }] of this.views) {
      view.setVisible(this.visible && !covered && id === this.selected);
      view.setBounds({ x: this.settings().sidebarSide === 'left' ? 0 : width - sidebarWidth, y: 162, width: sidebarWidth, height: Math.max(0, height - 162) });
    }
    return this.visible && !covered ? sidebarWidth : 0;
  }
  unloadIdle() {
    const timeout = this.settings().providerUnloadMinutes * 60_000; if (!timeout) return;
    for (const [id, entry] of this.views) if ((!this.visible || id !== this.selected) && Date.now() - entry.lastUsed > timeout) this.destroy(id);
  }
  private destroy(id: string) { const entry = this.views.get(id); if (!entry) return; this.win.contentView.removeChildView(entry.view); entry.view.webContents.close(); this.views.delete(id); }
  async reconcile(previous: Settings) {
    const removed = previous.providers.some(p => !this.settings().providers.some(n => n.id === p.id && n.url === p.url));
    if (removed) { this.closeAll(); await this.session.clearStorageData(); await this.session.clearCache(); }
    if (!this.settings().providers.some(p => p.id === this.selected)) this.selected = this.settings().providers[0]?.id ?? '';
    if (this.visible && this.selected) this.select(this.selected);
  }
  async clear() { this.closeAll(); await this.session.clearStorageData(); await this.session.clearCache(); this.session.clearAuthCache(); this.visible = false; this.changed(); }
  closeAll() { for (const id of this.views.keys()) this.destroy(id); }
}

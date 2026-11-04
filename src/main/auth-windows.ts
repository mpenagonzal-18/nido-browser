import { app, Menu, type BrowserWindow, type WebContents } from 'electron';
import path from 'node:path';
import { showGoogleAuthHelp } from './auth-help';
import { isGoogleLoginRejected, safePopupUrl, needsNativePopup } from '../shared/auth';
import type { Settings } from '../shared/settings';
import type { Blocking } from './blocking';
import { secureContents } from './privacy';
import { pageMenu } from './context-menu';
export const POPUP_PREFERENCES = {
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: true,
  allowRunningInsecureContent: false,
  webSecurity: true,
  webviewTag: false,
  safeDialogs: true,
} as const;
export class AuthWindows {
  private windows = new Set<BrowserWindow>();
  private owners = new Map<BrowserWindow, WebContents>();
  private pending = 0;
  private closing = false;
  constructor(
    private parent: () => BrowserWindow,
    private settings: () => Settings,
    private blocking: Blocking,
    private openTab: (url: string) => unknown,
  ) {}
  attach(source: WebContents) {
    source.setWindowOpenHandler((details) => {
      if (this.closing || !safePopupUrl(details.url)) return { action: 'deny' };
      if (
        details.url &&
        details.url !== 'about:blank' &&
        !this.blocking.popupAllowed(source, details.url)
      )
        return { action: 'deny' };
      if (!needsNativePopup(details)) {
        this.openTab(details.url);
        return { action: 'deny' };
      }
      if (this.windows.size + this.pending >= 4) return { action: 'deny' };
      this.pending++;
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: this.parent(),
          width: 520,
          height: 720,
          minWidth: 420,
          minHeight: 400,
          show: true,
          transparent: false,
          opacity: 1,
          kiosk: false,
          closable: true,
          focusable: true,
          skipTaskbar: false,
          frame: true,
          autoHideMenuBar: true,
          fullscreen: false,
          alwaysOnTop: false,
          webPreferences: {
            ...POPUP_PREFERENCES,
            session: source.session,
            preload: path.join(__dirname, '../preload/popup.js'),
            disableBlinkFeatures: 'ServiceWorker',
          },
        },
      };
    });
    source.on('did-create-window', (window) => {
      this.pending = Math.max(0, this.pending - 1);
      if (this.closing) {
        window.destroy();
        return;
      }
      this.windows.add(window);
      this.owners.set(window, source);
      window.on('closed', () => {
        this.windows.delete(window);
        this.owners.delete(window);
      });
      const contents = window.webContents;
      secureContents(contents);
      this.attach(contents);
      const showOrigin = () => {
        if (window.isDestroyed()) return;
        const value = contents.getURL();
        let origin = 'about:blank';
        try {
          origin = new URL(value).origin;
        } catch {
          /* Empty initial window. */
        }
        window.setTitle(`Nido — ${origin}`);
      };
      contents.on('page-title-updated', (event) => {
        event.preventDefault();
        showOrigin();
      });
      let rejectionExplained = false;
      contents.on('did-navigate', () => {
        showOrigin();
        if (!rejectionExplained && isGoogleLoginRejected(contents.getURL())) {
          rejectionExplained = true;
          void showGoogleAuthHelp(window, contents.getURL(), this.settings()).catch(() => {});
        }
      });
      contents.on('did-navigate-in-page', showOrigin);
      const navigation = (event: Electron.Event, url: string) => {
        if (!safePopupUrl(url)) event.preventDefault();
      };
      contents.on('will-navigate', navigation);
      contents.on('will-redirect', navigation);
      contents.on('will-frame-navigate', (event) => {
        if (!safePopupUrl(event.url)) event.preventDefault();
      });
      contents.on('context-menu', (_event, params) => {
        Menu.buildFromTemplate(
          pageMenu(contents, params, {
            settings: this.settings(),
            systemLocale: app.getLocale(),
            open: this.openTab,
            navigate: (url) => {
              if (safePopupUrl(url)) void contents.loadURL(url).catch(() => {});
            },
          }),
        ).popup({ window });
      });
      showOrigin();
    });
  }
  hasOpenPopup(source: WebContents) {
    return [...this.owners.values()].includes(source);
  }
  closeAll() {
    this.closing = true;
    for (const window of this.windows) if (!window.isDestroyed()) window.destroy();
    this.windows.clear();
    this.owners.clear();
  }
}

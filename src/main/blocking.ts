import { ElectronBlocker, fromElectronDetails, Request } from '@ghostery/adblocker-electron';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { app, net, webContents, type Session, type WebContents } from 'electron';
import path from 'node:path';
import { hostname, videoExcluded, providerAllows } from '../shared/privacy';
import { upgradeHttp } from './privacy';
import type { Settings } from '../shared/settings';
export const LIST_SOURCES = [
  'https://raw.githubusercontent.com/easylist/easylist/gh-pages/easylist.txt',
  'https://raw.githubusercontent.com/easylist/easylist/gh-pages/easyprivacy.txt',
];
export class Blocking {
  private engine?: ElectronBlocker;
  readonly disabledSites = new Set<string>();
  constructor(
    private getSettings: () => Settings,
    private count: (contentsId: number) => void,
  ) {}
  async load() {
    let text: string;
    try {
      text = await readFile(path.join(app.getPath('userData'), 'filters.txt'), 'utf8');
    } catch {
      text = (
        await Promise.all(
          ['easylist.txt', 'easyprivacy.txt'].map((name) =>
            readFile(path.join(app.getAppPath(), 'assets/lists', name), 'utf8'),
          ),
        )
      ).join('\n');
    }
    this.engine = ElectronBlocker.parse(text, {
      enableCompression: true,
      loadNetworkFilters: true,
      loadCosmeticFilters: true,
      loadCSPFilters: false,
      enableHtmlFiltering: false,
      loadExtendedSelectors: false,
    });
  }
  exempt(url: string, sidebar = false) {
    return (
      videoExcluded(url, this.getSettings().videoExclusions) ||
      this.disabledSites.has(hostname(url)) ||
      (sidebar && providerAllows(url, this.getSettings().providers))
    );
  }
  popupAllowed(contents: WebContents, url: string, sidebar = false) {
    const sourceUrl = contents.getURL();
    if (this.exempt(sourceUrl, sidebar) || this.exempt(url, sidebar)) return true;
    const blocked = this.engine?.match(
      Request.fromRawDetails({ url, sourceUrl, type: 'subFrame' }),
    ).match;
    if (blocked) this.count(contents.id);
    return !blocked;
  }
  attach(ses: Session, sidebar = false) {
    ses.webRequest.onBeforeRequest((details, callback) => {
      if (
        sidebar &&
        details.resourceType === 'subFrame' &&
        !providerAllows(details.url, this.getSettings().providers)
      ) {
        callback({ cancel: true });
        return;
      }
      const topUrl = webContents.fromId(details.webContentsId ?? -1)?.getURL() ?? details.referrer;
      // This gate precedes ALL engine calls, including subresources and frames.
      const exempt =
        this.exempt(details.initiatorOrigin ?? '', sidebar) ||
        this.exempt(details.url, sidebar) ||
        this.exempt(topUrl, sidebar);
      if (
        !exempt &&
        details.resourceType !== 'media' &&
        details.resourceType !== 'mainFrame' &&
        this.engine?.match(fromElectronDetails(details)).match
      ) {
        this.count(details.webContentsId ?? -1);
        callback({ cancel: true });
        return;
      }
      const upgrade = details.resourceType === 'mainFrame' ? upgradeHttp(details.url) : undefined;
      callback(upgrade ? { redirectURL: upgrade } : {});
    });
  }
  async cosmetic(contents: WebContents, sidebar = false) {
    const url = contents.getURL();
    if (
      !this.engine ||
      this.exempt(url, sidebar) ||
      !/^https?:/.test(url) ||
      contents.isDestroyed()
    )
      return;
    // CSS only: no scriptlets, no mutation observers or remote-content preload.
    // Collect DOM tokens once; static CSS continues to match later banner nodes.
    try {
      const tokens = await contents.executeJavaScript(
        `({classes:[...new Set([...document.querySelectorAll('[class]')].flatMap(e=>[...e.classList]))].slice(0,10000),ids:[...document.querySelectorAll('[id]')].map(e=>e.id).slice(0,10000)})`,
      );
      if (contents.isDestroyed() || contents.getURL() !== url || this.exempt(url, sidebar)) return;
      const { styles } = this.engine.getCosmeticsFilters({
        url,
        hostname: hostname(url),
        domain: Request.fromRawDetails({ url }).domain,
        classes: tokens.classes,
        ids: tokens.ids,
        getBaseRules: true,
        getRulesFromHostname: true,
        getRulesFromDOM: true,
        getInjectionRules: false,
        getExtendedRules: false,
      });
      if (styles) await contents.insertCSS(styles, { cssOrigin: 'user' });
    } catch {
      /* navigation may destroy the document while gathering tokens */
    }
  }
  async updateManually() {
    const texts = await Promise.all(
      LIST_SOURCES.map(async (url) => {
        const response = await net.fetch(url, { credentials: 'omit' });
        if (!response.ok) throw new Error(`Listas: HTTP ${response.status}`);
        const text = await response.text();
        if (!text.startsWith('[Adblock') || text.length < 100_000 || text.length > 10_000_000)
          throw new Error('Lista no válida');
        return text;
      }),
    );
    const text = texts.join('\n');
    const engine = ElectronBlocker.parse(text, {
      enableCompression: true,
      loadCSPFilters: false,
      enableHtmlFiltering: false,
      loadExtendedSelectors: false,
    });
    const dir = app.getPath('userData');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'filters.tmp'), text);
    await rename(path.join(dir, 'filters.tmp'), path.join(dir, 'filters.txt'));
    this.engine = engine;
  }
}

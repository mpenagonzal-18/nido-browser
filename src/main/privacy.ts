import { app, dialog, type Session, type WebContents } from 'electron';
import path from 'node:path';
import { requestHeaders, responseHeaders, providerAllows, upgradeHttp } from '../shared/privacy';
import type { Settings } from '../shared/settings';
export const CHROME_UA = `Mozilla/5.0 (${process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64' : 'X11; Linux x86_64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
export function chromiumPrivacy() {
  app.commandLine.appendSwitch('disable-background-networking');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-domain-reliability');
  app.commandLine.appendSwitch('disable-sync');
  app.commandLine.appendSwitch('no-pings');
  app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');
  app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication,MediaRouter,OptimizationHints,InterestFeedContentSuggestions,Translate,SpeculationRulesPrefetch,Prerender2');
}
export function configurePrivacy(ses: Session, getSettings: () => Settings, sidebar = false) {
  ses.setUserAgent(CHROME_UA);
  ses.setSpellCheckerEnabled(false);
  ses.setPermissionCheckHandler(() => false);
  ses.setDevicePermissionHandler(() => false);
  ses.setPermissionRequestHandler((contents, permission, callback, details) => {
    const origin = details.requestingUrl || contents.getURL();
    const media: string[] = 'mediaTypes' in details ? (details.mediaTypes ?? []) : [];
    const known = ['geolocation', 'notifications'].includes(permission) || (permission === 'media' && media.length > 0);
    if (!known || (sidebar && (permission !== 'media' || media.some(type => type !== 'audio')))) { callback(false); return; }
    void dialog.showMessageBox({ type: 'question', title: 'Permiso por sitio', message: `${new URL(origin).origin} solicita ${permission === 'media' ? media.join(', ') : permission}.`, detail: 'Solo se permite tras esta confirmación. No se guarda la autorización.', buttons: ['Denegar', 'Permitir esta vez'], defaultId: 0, cancelId: 0 }).then(result => callback(result.response === 1)).catch(() => callback(false));
  });
  ses.on('will-download', event => event.preventDefault());
  let cookiePreload: string | undefined;
  const refreshCookies = () => {
    if (cookiePreload) ses.unregisterPreloadScript(cookiePreload);
    cookiePreload = !sidebar && !getSettings().allowSessionCookies ? ses.registerPreloadScript({ type: 'frame', filePath: path.join(__dirname, '../preload/cookies.js'), matches: ['http://*/*', 'https://*/*'], matchOriginAsFallback: true }) : undefined;
  };
  refreshCookies();
  ses.webRequest.onBeforeSendHeaders((details, callback) => callback({ requestHeaders: requestHeaders(details.requestHeaders, sidebar ? providerAllows(details.url, getSettings().providers) : getSettings().allowSessionCookies) }));
  ses.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: responseHeaders(details.responseHeaders ?? {}, sidebar ? providerAllows(details.url, getSettings().providers) : getSettings().allowSessionCookies) }));
  ses.cookies.on('changed', (_, cookie, _cause, removed) => {
    if (removed) return;
    const host = (cookie.domain ?? '').replace(/^\./, '');
    const url = `${cookie.secure ? 'https' : 'http'}://${host}${cookie.path}`;
    if (sidebar ? !providerAllows(url, getSettings().providers) : !getSettings().allowSessionCookies) void ses.cookies.remove(url, cookie.name);
  });
  return refreshCookies;
}
export function secureContents(contents: WebContents) {
  contents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  contents.on('will-attach-webview', event => event.preventDefault());
}
export { upgradeHttp };

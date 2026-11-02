import { resolveLocale, translate } from '../shared/i18n';
import { app, dialog, type Session, type WebContents, webContents } from 'electron';
import { isWebUrl } from '../shared/navigation';
import path from 'node:path';
import {
  requestHeaders,
  responseHeaders,
  providerAllows,
  upgradeHttp,
  firstPartyRequest,
  domainMatches,
  hostname,
  compatibleSite,
} from '../shared/privacy';
import type { Settings } from '../shared/settings';
export const CHROME_UA = `Mozilla/5.0 (${process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64' : 'X11; Linux x86_64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
export function chromiumPrivacy() {
  app.commandLine.appendSwitch('disable-background-networking');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-domain-reliability');
  app.commandLine.appendSwitch('disable-sync');
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  app.commandLine.appendSwitch('no-pings');
  app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');
  app.commandLine.appendSwitch(
    'disable-features',
    'AutofillServerCommunication,MediaRouter,OptimizationHints,InterestFeedContentSuggestions,Translate,SpeculationRulesPrefetch,Prerender2',
  );
}
export function configurePrivacy(
  ses: Session,
  getSettings: () => Settings,
  sidebar = false,
  temporary = false,
  regular = false,
) {
  const tr = (source: string, values: Record<string, string | number> = {}) =>
    translate(source, resolveLocale(getSettings().language, app.getLocale()), values);
  ses.setUserAgent(CHROME_UA);
  ses.setSpellCheckerEnabled(false);
  const permissions = new Set<string>();
  ses.setPermissionCheckHandler((_contents, permission, requestingOrigin, details) => {
    if (sidebar && (permission !== 'media' || details.mediaType !== 'audio')) return false;
    const suffix = permission === 'media' ? `:${details.mediaType ?? 'unknown'}` : '';
    return permissions.has(`${requestingOrigin}:${permission}${suffix}`);
  });
  ses.setDevicePermissionHandler(() => false);
  ses.setPermissionRequestHandler((contents, permission, callback, details) => {
    const origin = details.requestingUrl || contents.getURL();
    if (!isWebUrl(origin)) {
      callback(false);
      return;
    }
    const media: string[] = 'mediaTypes' in details ? (details.mediaTypes ?? []) : [];
    const known =
      ['geolocation', 'notifications'].includes(permission) ||
      (permission === 'media' && media.length > 0);
    if (!known || (sidebar && (permission !== 'media' || media.some((type) => type !== 'audio')))) {
      callback(false);
      return;
    }
    void dialog
      .showMessageBox({
        type: 'question',
        title: tr('Permiso por sitio'),
        message: tr('{origin} solicita {permission}.', {
          origin: new URL(origin).origin,
          permission:
            permission === 'media'
              ? media.map((type) => tr(type === 'audio' ? 'micrófono' : 'cámara')).join(', ')
              : tr(permission === 'geolocation' ? 'ubicación' : 'notificaciones'),
        }),
        detail: tr(
          'Solo se permite tras esta confirmación. La autorización dura esta ejecución y no se guarda en disco.',
        ),
        buttons: [tr('Denegar'), tr('Permitir esta vez')],
        defaultId: 0,
        cancelId: 0,
      })
      .then((result) => {
        if (result.response === 1) {
          for (const suffix of permission === 'media' ? media.map((type) => `:${type}`) : [''])
            permissions.add(`${new URL(origin).origin}:${permission}${suffix}`);
        }
        callback(result.response === 1);
      })
      .catch(() => callback(false));
  });
  ses.on('will-download', (event) => event.preventDefault());
  // Clear APIs are asynchronous. Serialize overlapping periodic/origin/shutdown
  // sweeps, and keep failures observable instead of treating them as success.
  let clearing = Promise.resolve();
  const enqueue = (operation: () => Promise<void>) => {
    clearing = clearing.catch(() => {}).then(operation);
    return clearing;
  };
  const clearOrigins = (origins: Iterable<string>) =>
    enqueue(async () => {
      for (const origin of new Set(origins))
        if (isWebUrl(origin)) await ses.clearStorageData({ origin });
      await ses.clearCache();
    });
  const sweep = () =>
    enqueue(async () => {
      await ses.clearStorageData(
        getSettings().allowSessionCookies
          ? {
              storages: [
                'filesystem',
                'indexdb',
                'localstorage',
                'shadercache',
                'serviceworkers',
                'cachestorage',
              ],
            }
          : undefined,
      );
    });
  const clearAll = () =>
    enqueue(async () => {
      permissions.clear();
      await ses.clearStorageData();
      await ses.clearCache();
      await ses.clearAuthCache();
    });
  const timer =
    !sidebar && !temporary && !regular
      ? setInterval(() => {
          void sweep().catch((error) =>
            console.error('No se pudo completar la limpieza periódica', error),
          );
        }, 15_000)
      : undefined;
  timer?.unref();
  let cookiePreload: string | undefined;
  const refreshCookies = () => {
    if (cookiePreload) ses.unregisterPreloadScript(cookiePreload);
    if (!sidebar)
      cookiePreload = ses.registerPreloadScript({
        type: 'frame',
        filePath: path.join(
          __dirname,
          regular
            ? '../preload/regular.js'
            : temporary
              ? '../preload/temporary-site.js'
              : getSettings().allowSessionCookies
                ? '../preload/session-cookies.js'
                : '../preload/cookies.js',
        ),
        matches: ['http://*/*', 'https://*/*'],
        matchOriginAsFallback: true,
      });
  };
  refreshCookies();
  const destinations = new Map<number, string>();
  const allowCookies = (
    details:
      Electron.OnBeforeSendHeadersListenerDetails | Electron.OnHeadersReceivedListenerDetails,
  ) => {
    if (sidebar) return providerAllows(details.url, getSettings().providers);
    const contents = details.webContents ?? webContents.fromId(details.webContentsId ?? -1);
    if (!contents || contents.isDestroyed()) return false;
    if (details.resourceType === 'mainFrame' && contents && isWebUrl(details.url)) {
      const id = contents.id;
      if (!destinations.has(id)) contents.once('destroyed', () => destinations.delete(id));
      destinations.set(id, details.url);
    }
    const topUrl = contents ? (destinations.get(contents.id) ?? contents.getURL()) : undefined;
    if (
      temporary &&
      (!compatibleSite(details.url, getSettings().compatibilitySites) ||
        !topUrl ||
        !compatibleSite(topUrl, getSettings().compatibilitySites))
    )
      return false;
    return (
      (regular || temporary || getSettings().allowSessionCookies) &&
      firstPartyRequest(details, topUrl)
    );
  };
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    // This Chromium-generated header identifies service-worker script loads, even
    // when registration was attempted outside the document's guarded JS world.
    if (
      !sidebar &&
      Object.keys(details.requestHeaders).some((name) => name.toLowerCase() === 'service-worker')
    ) {
      callback({ cancel: true });
      return;
    }
    callback({ requestHeaders: requestHeaders(details.requestHeaders, allowCookies(details)) });
  });
  ses.webRequest.onHeadersReceived((details, callback) =>
    callback({
      responseHeaders: responseHeaders(details.responseHeaders ?? {}, allowCookies(details)),
    }),
  );
  ses.cookies.on('changed', (_, cookie, _cause, removed) => {
    if (removed || regular) return; // Approved first-party cookies survive closed tabs in normal profiles.
    const host = (cookie.domain ?? '').replace(/^\./, '');
    const url = `${cookie.secure ? 'https' : 'http'}://${host}${cookie.path}`;
    const allowed = sidebar
      ? providerAllows(url, getSettings().providers)
      : (temporary || getSettings().allowSessionCookies) &&
        webContents
          .getAllWebContents()
          .some(
            (contents) =>
              contents.session === ses &&
              (isWebUrl(contents.getURL()) || isWebUrl(destinations.get(contents.id) ?? '')) &&
              (domainMatches(hostname(contents.getURL()), host) ||
                domainMatches(hostname(destinations.get(contents.id) ?? ''), host)),
          );
    if (!allowed)
      void ses.cookies
        .remove(url, cookie.name)
        .catch((error) => console.error('No se pudo eliminar una cookie no autorizada', error));
  });
  return Object.assign(refreshCookies, {
    clearPermissions: () => permissions.clear(),
    clearOrigins,
    clearAll,
    sweep,
    dispose: () => {
      if (timer) clearInterval(timer);
    },
  });
}

export function secureContents(contents: WebContents) {
  contents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  contents.on('will-attach-webview', (event) => event.preventDefault());
}
export { upgradeHttp };

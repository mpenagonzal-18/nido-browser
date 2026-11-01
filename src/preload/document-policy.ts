import { contextBridge } from 'electron';

export function installDocumentPolicy(allowFirstPartyCookies: boolean) {
  // Session storage is tied to live documents and is not covered by Chromium's
  // origin storage deletion in every version. Hold native references ONLY in
  // the isolated preload world and sweep them independently of page scripts.
  const stores: Storage[] = [];
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      const store = window[name];
      store.clear();
      stores.push(store);
    } catch {
      /* opaque origin */
    }
  }
  setInterval(() => {
    for (const store of stores) {
      try {
        store.clear();
      } catch {
        /* navigated frame */
      }
    }
  }, 15_000);

  contextBridge.executeInMainWorld({
    func: (allowCookies: boolean) => {
      // A cross-origin frame cannot inspect top.location. Fail closed, including
      // same-site but cross-origin frames; the network policy also checks sites.
      let firstParty = false;
      try {
        firstParty = true;
        let frame: Window = window;
        while (frame !== frame.top) {
          frame = frame.parent;
          if (frame.location.origin !== location.origin) {
            firstParty = false;
            break;
          }
        }
      } catch {
        firstParty = false;
      }
      if (!allowCookies || !firstParty) {
        Object.defineProperty(Document.prototype, 'cookie', {
          get: () => '',
          set: () => {},
          configurable: false,
        });
      }
      Object.defineProperty(window, 'cookieStore', { value: undefined, configurable: false });
      for (const name of ['localStorage', 'sessionStorage'] as const) {
        try {
          window[name].clear();
        } catch {
          /* opaque origins already reject storage */
        }
      }
      for (const name of ['localStorage', 'sessionStorage', 'indexedDB', 'caches'] as const) {
        Object.defineProperty(window, name, {
          get: () => {
            throw new DOMException(
              'Nido desactiva el almacenamiento de las pestañas.',
              'SecurityError',
            );
          },
          configurable: false,
        });
      }
      Object.defineProperty(Navigator.prototype, 'serviceWorker', {
        value: undefined,
        configurable: false,
      });
    },
    args: [allowFirstPartyCookies],
  });
}

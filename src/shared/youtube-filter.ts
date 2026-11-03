/** Serialized into YouTube's page world. Contains no Node/IPC access or remote code. */
export function installYoutubePlayerFilter() {
  const adKeys = new Set(['playerAds', 'adPlacements', 'adSlots', 'adBreakHeartbeatParams']);
  let active = true;
  const cleanup: Array<() => void> = [];
  function prune(value: unknown): boolean {
    let changed = false;
    let budget = 30000;
    const visited = new WeakSet<object>();
    const walk = (node: unknown, depth: number) => {
      if (
        !active ||
        !node ||
        typeof node !== 'object' ||
        depth > 40 ||
        --budget < 0 ||
        visited.has(node)
      )
        return;
      visited.add(node);
      for (const key of Object.keys(node)) {
        if (adKeys.has(key)) {
          try {
            changed = Reflect.deleteProperty(node, key) || changed;
          } catch {
            /* Leave read-only data intact. */
          }
        } else {
          try {
            walk((node as Record<string, unknown>)[key], depth + 1);
          } catch {
            /* Do not execute failing site getters. */
          }
        }
      }
    };
    walk(value, 0);
    return changed;
  }
  function cleanText(text: string): string {
    if (
      !active ||
      text.length > 12_000_000 ||
      !/"(?:playerAds|adPlacements|adSlots|adBreakHeartbeatParams)"\s*:/.test(text)
    )
      return text;
    try {
      const prefix = /^\)\]\}'(?:\r?\n)?/.exec(text)?.[0] ?? '';
      const value: unknown = JSON.parse(text.slice(prefix.length));
      return prune(value) ? prefix + JSON.stringify(value) : text;
    } catch {
      return text;
    }
  }
  function playerRequest(value: string): boolean {
    try {
      const url = new URL(value, location.href);
      return (
        /^https?:$/.test(url.protocol) &&
        /(^|\.)youtube(?:-nocookie)?\.com$/.test(url.hostname) &&
        (/^\/youtubei\/v1\/(?:player|next)(?:\/|$)/.test(url.pathname) ||
          (url.pathname === '/watch' && url.searchParams.has('pbj')))
      );
    } catch {
      return false;
    }
  }
  // Initial HTML player/bootstrap objects must be filtered before page scripts read them.
  for (const key of ['ytInitialPlayerResponse', 'ytInitialData']) {
    const descriptor = Object.getOwnPropertyDescriptor(window, key);
    if (
      descriptor &&
      (!descriptor.configurable ||
        descriptor.writable === false ||
        descriptor.get ||
        descriptor.set)
    )
      continue;
    let value: unknown = descriptor?.value;
    prune(value);
    const get = () => value;
    try {
      Object.defineProperty(window, key, {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        get,
        set: (next) => {
          if (active) prune(next);
          value = next;
        },
      });
      cleanup.push(() => {
        if (Object.getOwnPropertyDescriptor(window, key)?.get === get)
          Object.defineProperty(window, key, {
            configurable: true,
            enumerable: descriptor?.enumerable ?? true,
            writable: descriptor?.writable ?? true,
            value,
          });
      });
    } catch {
      /* A site's own non-configurable globals take precedence. */
    }
  }
  const nativeFetch = window.fetch;
  const wrappedResponses = new WeakSet<Response>();
  function patchResponse(response: Response): Response {
    if (wrappedResponses.has(response)) return response;
    wrappedResponses.add(response);
    const json = response.json.bind(response),
      text = response.text.bind(response),
      clone = response.clone.bind(response);
    Object.defineProperties(response, {
      json: {
        configurable: true,
        value: async () => {
          const value: unknown = await json();
          if (active) prune(value);
          return value;
        },
      },
      text: { configurable: true, value: async () => cleanText(await text()) },
      clone: { configurable: true, value: () => patchResponse(clone()) },
    });
    return response; // Preserve native URL, status, headers, bodyUsed, errors and cancellation.
  }
  const fetch: typeof window.fetch = async (...args) => {
    const response = await Reflect.apply(nativeFetch, window, args);
    const input = args[0];
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    return active && (playerRequest(url) || playerRequest(response.url))
      ? patchResponse(response)
      : response;
  };
  window.fetch = fetch;
  cleanup.push(() => {
    if (window.fetch === fetch) window.fetch = nativeFetch;
  });

  const proto = XMLHttpRequest.prototype;
  const nativeOpen = proto.open;
  const urls = new WeakMap<XMLHttpRequest, string>();
  const open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    urls.set(this, String(url));
    return Reflect.apply(nativeOpen, this, [method, url, ...rest]);
  } as typeof nativeOpen;
  proto.open = open;
  cleanup.push(() => {
    if (proto.open === open) proto.open = nativeOpen;
  });
  const cachedText = new WeakMap<XMLHttpRequest, { original: string; filtered: string }>();
  for (const name of ['responseText', 'response'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (!descriptor?.get || !descriptor.configurable) continue;
    const get = function (this: XMLHttpRequest) {
      const value: unknown = descriptor.get!.call(this);
      if (!active || this.readyState !== 4 || !playerRequest(urls.get(this) ?? this.responseURL))
        return value;
      if (typeof value === 'string') {
        const cached = cachedText.get(this);
        if (cached?.original === value) return cached.filtered;
        const filtered = cleanText(value);
        cachedText.set(this, { original: value, filtered });
        return filtered;
      }
      if (this.responseType === 'json') prune(value);
      return value;
    };
    Object.defineProperty(proto, name, { ...descriptor, get });
    cleanup.push(() => {
      if (Object.getOwnPropertyDescriptor(proto, name)?.get === get)
        Object.defineProperty(proto, name, descriptor);
    });
  }
  const stop = () => {
    active = false;
    for (const restore of cleanup.reverse()) {
      try {
        restore();
      } catch {
        /* Sites may redefine their own properties. */
      }
    }
    window.removeEventListener('nido:youtube-filter-stop', stop);
  };
  window.addEventListener('nido:youtube-filter-stop', stop);
}
export const YOUTUBE_AD_CSS = `
ytd-ad-slot-renderer,ytd-display-ad-renderer,ytd-promoted-sparkles-web-renderer,
ytd-promoted-video-renderer,ytd-in-feed-ad-layout-renderer,ytd-action-companion-ad-renderer,
#player-ads,#masthead-ad,.ytp-ad-overlay-container { display:none !important; }
`;

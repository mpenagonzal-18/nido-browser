import { describe, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({
  app: {},
  net: {},
  webContents: { fromId: () => ({ getURL: () => 'https://www.youtube.com/watch?v=x' }) },
}));
import { Blocking } from '../src/main/blocking';
import { defaults } from '../src/shared/settings';
import type {
  Session,
  WebContents,
  CallbackResponse,
  OnBeforeRequestListenerDetails,
} from 'electron';
describe('exclusión antes del motor y de cualquier inyección', () => {
  it('no consulta filtros para ninguna petición de una página YouTube', () => {
    const blocking = new Blocking(defaults, vi.fn());
    const match = vi.fn();
    Reflect.set(blocking, 'engine', { match });
    let listener: (
      details: OnBeforeRequestListenerDetails,
      callback: (result: CallbackResponse) => void,
    ) => void;
    blocking.attach({
      webRequest: { onBeforeRequest: (fn: typeof listener) => (listener = fn) },
    } as unknown as Session);
    const cb = vi.fn();
    listener!(
      {
        url: 'https://ads.example.test/banner.js',
        resourceType: 'script',
        webContentsId: 1,
      } as OnBeforeRequestListenerDetails,
      cb,
    );
    expect(match).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({});
  });
  it.each(defaults().videoExclusions)('no ejecuta scripts ni CSS en %s', async (host) => {
    const blocking = new Blocking(defaults, vi.fn());
    const cosmetic = vi.fn();
    Reflect.set(blocking, 'engine', { getCosmeticsFilters: cosmetic });
    const contents = {
      getURL: () => `https://${host}/`,
      executeJavaScript: vi.fn(),
      insertCSS: vi.fn(),
    };
    await blocking.cosmetic(contents as unknown as WebContents);
    expect(cosmetic).not.toHaveBeenCalled();
    expect(contents.executeJavaScript).not.toHaveBeenCalled();
    expect(contents.insertCSS).not.toHaveBeenCalled();
  });
});

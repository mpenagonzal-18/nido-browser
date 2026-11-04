import { describe, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({
  app: {},
  net: {},
  webContents: { fromId: () => ({ getURL: () => 'https://www.youtube.com/watch?v=x' }) },
}));
import { Blocking } from '../src/main/blocking';
import { YOUTUBE_DOMAINS } from '../src/shared/youtube';
import { defaults } from '../src/shared/settings';
import type {
  Session,
  WebContents,
  CallbackResponse,
  OnBeforeRequestListenerDetails,
} from 'electron';
describe('exclusión antes del motor y de cualquier inyección', () => {
  it('no consulta filtros para ninguna petición de una página YouTube', () => {
    const blocking = new Blocking(() => ({ ...defaults(), youtubeAutoPause: false }), vi.fn());
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
  it.each(YOUTUBE_DOMAINS)('no ejecuta scripts ni CSS en %s', async (host) => {
    const blocking = new Blocking(() => ({ ...defaults(), youtubeAutoPause: false }), vi.fn());
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

it('filtra YouTube inicialmente, pausa solo YouTube y permite reactivarlo', () => {
  const blocking = new Blocking(defaults, vi.fn());
  const match = vi.fn(() => ({ match: true }));
  Reflect.set(blocking, 'engine', { match });
  const contents = { getURL: () => 'https://www.youtube.com/watch?v=test' } as WebContents;
  expect(blocking.popupAllowed(contents, 'https://ads.example.test/')).toBe(false);
  expect(blocking.pauseYoutube()).toBe(true);
  expect(blocking.pauseYoutube()).toBe(false);
  expect(blocking.popupAllowed(contents, 'https://ads.example.test/')).toBe(true);
  expect(match).toHaveBeenCalledTimes(1);
  expect(blocking.exempt('https://r1.googlevideo.com/video')).toBe(true);
  expect(blocking.exempt('https://other.example.test')).toBe(false);
  blocking.resumeYoutube();
  expect(blocking.popupAllowed(contents, 'https://ads.example.test/')).toBe(false);
  expect(match).toHaveBeenCalledTimes(2);
});

it('excluye recursos de páginas de identidad antes de consultar filtros', () => {
  const blocking = new Blocking(() => ({ ...defaults(), youtubeAutoPause: false }), vi.fn());
  const match = vi.fn();
  Reflect.set(blocking, 'engine', { match });
  expect(blocking.exempt('https://accounts.google.com/v3/signin')).toBe(true);
  expect(blocking.exempt('https://accounts.google.com.attacker.test/')).toBe(false);
});

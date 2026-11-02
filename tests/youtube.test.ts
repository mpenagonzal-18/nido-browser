import { describe, expect, it, vi } from 'vitest';
import type { IpcMainEvent } from 'electron';
import type { Blocking } from '../src/main/blocking';
import { handleYoutubeNotice } from '../src/main/youtube';
import { defaults, parseSettings } from '../src/shared/settings';
import { resolveLocale, translate } from '../src/shared/i18n';
import {
  isAntiAdblockNotice,
  isYoutubePage,
  isYoutubeResource,
  YOUTUBE_DOMAINS,
} from '../src/shared/youtube';

describe('idiomas y migración', () => {
  it('resuelve el idioma del sistema y respeta una elección explícita', () => {
    expect(resolveLocale('system', 'es-MX')).toBe('es');
    expect(resolveLocale('system', 'de-DE')).toBe('en');
    expect(resolveLocale('es', 'en-US')).toBe('es');
    expect(translate('Ajustes', 'en')).toBe('Settings');
    expect(translate('Cerrar {title}', 'en', { title: 'My page' })).toContain('My page');
    expect(translate('Nombre personalizado', 'en')).toBe('Nombre personalizado');
  });
  it('migra solo las antiguas exclusiones predeterminadas sin tocar sesiones', () => {
    const old = { ...defaults(), youtubeAutoPause: undefined, videoExclusions: YOUTUBE_DOMAINS };
    const next = parseSettings(old);
    expect(next.videoExclusions).toEqual([]);
    expect(next.youtubeAutoPause).toBe(true);
    expect(next.browsingMode).toBe('persistent');
    expect(parseSettings({ ...old, videoExclusions: ['example.com'] }).videoExclusions).toEqual([
      'example.com',
    ]);
    expect(parseSettings({ ...old, youtubeAutoPause: false }).videoExclusions).toEqual(
      YOUTUBE_DOMAINS,
    );
    expect(parseSettings({ language: 'en' }).language).toBe('en');
  });
});
describe('avisos de YouTube', () => {
  it.each([
    'Ad blockers are not allowed on YouTube',
    'Ad blockers violate YouTube’s Terms of Service',
    'Los bloqueadores de anuncios infringen las condiciones de servicio de YouTube',
    'Los bloqueadores de anuncios no se permiten en YouTube',
    'Les bloqueurs de publicité ne sont pas autorisés sur YouTube',
  ])('reconoce %s', (text) => expect(isAntiAdblockNotice(text)).toBe(true));
  it.each(['An error occurred. Please try again.', 'Ad blocker tutorial', 'Disable captions'])(
    'ignora %s',
    (text) => expect(isAntiAdblockNotice(text)).toBe(false),
  );
  it('rechaza dominios parecidos y distingue CDN de página', () => {
    expect(isYoutubePage('https://youtube.com.attacker.test')).toBe(false);
    expect(isYoutubePage('https://r1.googlevideo.com')).toBe(false);
    expect(isYoutubeResource('https://r1.googlevideo.com')).toBe(true);
  });
  function fixture() {
    const frame = { url: 'https://www.youtube.com/watch?v=test' };
    const contents = {
      mainFrame: frame,
      getURL: () => frame.url,
      isDestroyed: () => false,
      reload: vi.fn(),
      once: vi.fn(),
      executeJavaScript: vi.fn(async () => undefined),
    };
    let paused = false;
    const blocking = {
      exempt: vi.fn(() => paused),
      pauseYoutube: vi.fn(() => {
        if (paused) return false;
        paused = true;
        return true;
      }),
    } as unknown as Blocking;
    const event = { sender: contents, senderFrame: frame } as unknown as IpcMainEvent;
    return { contents, blocking, event };
  }
  it('pausa antes de recargar, solo una vez, y conserva posición sin borrar datos', async () => {
    const { contents, blocking, event } = fixture();
    const notify = vi.fn(() => expect(blocking.exempt(contents.getURL())).toBe(true));
    const notice = { type: 'anti-adblock', position: 42 };
    expect(handleYoutubeNotice(blocking, defaults(), event, notice, () => true, notify)).toBe(true);
    expect(contents.reload).toHaveBeenCalledTimes(1);
    const restore = contents.once.mock.calls[0] as unknown as [string, () => void];
    restore[1]();
    expect(contents.executeJavaScript).toHaveBeenCalledWith(expect.stringContaining(')(42)'));
    expect(handleYoutubeNotice(blocking, defaults(), event, notice, () => true, notify)).toBe(
      false,
    );
    expect(contents.reload).toHaveBeenCalledTimes(1);
  });
  it('rechaza mensajes ajenos, iframes, datos inválidos y exclusiones', () => {
    const { blocking, event } = fixture();
    const notice = { type: 'anti-adblock', position: 0 };
    const run = (ev = event, raw: unknown = notice, owns = true) =>
      handleYoutubeNotice(blocking, defaults(), ev, raw, () => owns, vi.fn());
    expect(run(event, notice, false)).toBe(false);
    expect(run({ ...event, senderFrame: { url: 'https://youtube.com' } } as IpcMainEvent)).toBe(
      false,
    );
    expect(run(event, { ...notice, position: -1 })).toBe(false);
    expect(run(event, { ...notice, extra: true })).toBe(false);
    vi.mocked(blocking.exempt).mockReturnValue(true);
    expect(run()).toBe(false);
    expect(blocking.pauseYoutube).not.toHaveBeenCalled();
  });
});

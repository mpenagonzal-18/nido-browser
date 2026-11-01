import { describe, expect, it } from 'vitest';
import {
  providerAllows,
  sameSite,
  firstPartyRequest,
  requestHeaders,
  responseHeaders,
  videoExcluded,
  upgradeHttp,
} from '../src/shared/privacy';
import { defaults } from '../src/shared/settings';
describe('cabeceras y cookies', () => {
  it('elimina cookies sin distinguir mayúsculas y reduce Referer al origen', () => {
    expect(
      requestHeaders({ cOoKiE: 'secret', Referer: 'https://site.test/private?q=secret' }, false),
    ).toEqual({ Referer: 'https://site.test/', DNT: '1', 'Sec-GPC': '1' });
    expect(responseHeaders({ 'sEt-CoOkIe': ['secret'], Server: ['test'] }, false)).toEqual({
      Server: ['test'],
    });
  });
  it('permite cookies solo cuando se activa el interruptor', () => {
    expect(requestHeaders({ Cookie: 'x=1' }, true).Cookie).toBe('x=1');
    expect(responseHeaders({ 'Set-Cookie': ['x=1'] }, true)['Set-Cookie']).toEqual(['x=1']);
  });
  it('fuerza HTTPS excepto servicios locales o puertos explícitos', () => {
    expect(upgradeHttp('http://example.com/path')).toBe('https://example.com/path');
    expect(upgradeHttp('http://localhost:3000')).toBeUndefined();
  });
});
describe('dominios de vídeo', () => {
  const domains = defaults().videoExclusions;
  it.each([
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'r1.googlevideo.com',
    'i.ytimg.com',
    'www.youtube-nocookie.com',
  ])('excluye completamente %s', (host) =>
    expect(videoExcluded(`https://${host}/watch`, domains)).toBe(true),
  );
  it.each(['youtube.com.attacker.test', 'notyoutube.com', 'ytimg.com.evil'])(
    'no confunde %s con YouTube',
    (host) => expect(videoExcluded(`https://${host}`, domains)).toBe(false),
  );
});
describe('conservación de cookies de la sidebar', () => {
  const providers = defaults().providers;
  it.each([
    'https://claude.ai',
    'https://chatgpt.com',
    'https://gemini.google.com',
    'https://sub.claude.ai',
  ])('permite %s', (url) => {
    const allow = providerAllows(url, providers);
    expect(allow).toBe(true);
    expect(responseHeaders({ 'Set-Cookie': ['session=1'] }, allow)['Set-Cookie']).toEqual([
      'session=1',
    ]);
  });
  it.each([
    'https://accounts.google.com',
    'https://tracker.test',
    'https://claude.ai.evil.test',
    'https://evilclaude.ai',
    'file:///tmp/claude.ai',
  ])('no conserva cookies ajenas: %s', (url) => {
    const allow = providerAllows(url, providers);
    expect(allow).toBe(false);
    expect(responseHeaders({ 'Set-Cookie': ['session=1'] }, allow)).toEqual({});
    expect(requestHeaders({ Cookie: 'session=1' }, allow).Cookie).toBeUndefined();
  });
  it('respeta proveedores locales y retirados', () => {
    expect(providerAllows('http://localhost:3000/chat', [{ url: 'http://localhost:3000' }])).toBe(
      true,
    );
    expect(providerAllows('https://claude.ai', [])).toBe(false);
  });
});

describe('cookies propias frente a terceros', () => {
  it.each([
    ['https://a.example.co.uk', 'https://b.example.co.uk', true],
    ['https://alice.github.io', 'https://bob.github.io', false],
    ['https://site.test', 'http://site.test', false],
    ['http://127.0.0.2:3000', 'http://127.0.0.3:3000', false],
    ['http://localhost:3000', 'http://localhost:4000', true],
    ['https://site.test', 'https://site.test.evil.test', false],
  ])('same-site %s / %s = %s', (a, b, expected) => expect(sameSite(a, b)).toBe(expected));
  it('deniega contextos sin origen, opacos y frames ajenos aunque pidan un recurso del sitio principal', () => {
    const request = {
      url: 'https://site.test/api',
      resourceType: 'xhr',
      frame: { url: 'https://site.test' },
    };
    expect(firstPartyRequest({ ...request, frame: undefined }, 'https://site.test')).toBe(false);
    expect(firstPartyRequest({ ...request, initiatorOrigin: 'null' }, 'https://site.test')).toBe(
      false,
    );
    expect(
      firstPartyRequest(
        { ...request, initiatorOrigin: 'https://tracker.test' },
        'https://site.test',
      ),
    ).toBe(false);
    expect(
      firstPartyRequest({ ...request, initiatorOrigin: 'https://site.test' }, 'https://site.test'),
    ).toBe(true);
  });
  it('admite navegación principal propia y rechaza respuestas de terceros aun con cookies temporales', () => {
    expect(
      firstPartyRequest({ url: 'https://new.test', resourceType: 'mainFrame' }, 'https://old.test'),
    ).toBe(true);
    const allowed = firstPartyRequest(
      {
        url: 'https://tracker.test',
        resourceType: 'subFrame',
        initiatorOrigin: 'https://site.test',
      },
      'https://site.test',
    );
    expect(responseHeaders({ 'Set-Cookie': ['tracker=secret'] }, allowed)).toEqual({});
    expect(requestHeaders({ Cookie: 'tracker=secret' }, allowed).Cookie).toBeUndefined();
  });
});

it('deniega frames anidados tras un tercero y peticiones sin frame verificable', () => {
  const base = {
    url: 'https://site.test/api',
    resourceType: 'xhr',
    initiatorOrigin: 'https://site.test',
  };
  expect(firstPartyRequest(base, 'https://site.test')).toBe(false);
  expect(
    firstPartyRequest(
      {
        ...base,
        frame: {
          url: 'https://site.test',
          parent: { url: 'https://tracker.test', parent: { url: 'https://site.test' } },
        },
      },
      'https://site.test',
    ),
  ).toBe(false);
  expect(
    firstPartyRequest(
      { ...base, frame: { url: 'https://site.test', parent: { url: 'https://site.test' } } },
      'https://site.test',
    ),
  ).toBe(true);
});

it('deniega cookies si el frame se destruye durante la comprobación', () => {
  const frame = {
    get url(): string {
      throw new Error('Frame detached');
    },
  };
  expect(
    firstPartyRequest(
      {
        url: 'https://site.test/api',
        resourceType: 'xhr',
        initiatorOrigin: 'https://site.test',
        frame,
      },
      'https://site.test',
    ),
  ).toBe(false);
});

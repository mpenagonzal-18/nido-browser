import { readFileSync } from 'node:fs';
import { FiltersEngine, Request } from '@ghostery/adblocker';
import { describe, expect, it } from 'vitest';
const text =
  readFileSync('assets/lists/easylist.txt', 'utf8') +
  '\n' +
  readFileSync('assets/lists/easyprivacy.txt', 'utf8');
const engine = FiltersEngine.parse(text);
describe('listas locales reales', () => {
  it('bloquea un banner conocido', () => {
    const r = engine.match(
      Request.fromRawDetails({
        url: 'https://pagead2.googlesyndication.com/pagead/ads',
        sourceUrl: 'https://example.com',
        type: 'script',
      }),
    );
    expect(r.match).toBe(true);
  });
  it('contiene reglas cosméticas de banners', () => {
    const r = engine.getCosmeticsFilters({
      url: 'https://example.com',
      hostname: 'example.com',
      domain: 'example.com',
      classes: ['adsbygoogle-box'],
      getBaseRules: true,
      getRulesFromDOM: true,
    });
    expect(r.styles).toContain('.adsbygoogle-box');
  });
});

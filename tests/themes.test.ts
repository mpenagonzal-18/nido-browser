import { expect, it } from 'vitest';
import { COLOR_THEMES, themePalette } from '../src/shared/themes';
import { resolvedAppearance } from '../src/shared/appearance';
import { parseSettings, defaults } from '../src/shared/settings';
it('ofrece veinte paletas y fuentes locales sin recursos de red', () => {
  expect(COLOR_THEMES).toHaveLength(20);
  expect(new Set(COLOR_THEMES.map((t) => t.id)).size).toBe(20);
  for (const theme of COLOR_THEMES) {
    expect(theme.gradient).toMatch(/^linear-gradient\(/);
    const look = resolvedAppearance({ ...defaults(), appearancePreset: theme.id }, false);
    expect(look.fonts.ui + look.fonts.heading + theme.gradient).not.toMatch(/url\(|https:/);
    expect(themePalette(theme.id, false)['--bg']).not.toBe(themePalette(theme.id, true)['--bg']);
    expect(parseSettings({ appearancePreset: theme.id }).appearancePreset).toBe(theme.id);
  }
});
it('un preset fija colores, fondo y fuentes aunque cambien los valores personalizados', () => {
  const base = { ...defaults(), appearancePreset: 'aurora' as const };
  const altered = {
    ...base,
    accent: '#80004b',
    customFont: 'mono' as const,
    wallpaper: { ...base.wallpaper, kind: 'image' as const, image: '/other.png', blur: 20 },
  };
  expect(resolvedAppearance(altered, false)).toEqual(resolvedAppearance(base, false));
  expect(resolvedAppearance(altered, true).accent).not.toBe(
    resolvedAppearance(altered, false).accent,
  );
  const custom = resolvedAppearance({ ...altered, appearancePreset: 'custom' }, false);
  expect(custom.accent).toBe('#80004b');
  expect(custom.wallpaper.image).toBe('/other.png');
  expect(custom.fonts.ui).toContain('Consolas');
  expect(altered.wallpaper.image).toBe('/other.png');
});
it('migra temas elegidos y conserva imágenes, acentos y sesiones antiguas', () => {
  const old = {
    ...defaults(),
    appearancePreset: undefined,
    accent: '#80004b',
    wallpaper: { kind: 'image', image: '/local/photo.png' },
  };
  const next = parseSettings(old);
  expect(next.appearancePreset).toBe('custom');
  expect(next.wallpaper.image).toBe('/local/photo.png');
  expect(next.accent).toBe('#80004b');
  expect(next.browsingMode).toBe('persistent');
  expect(
    parseSettings({
      ...old,
      colorTheme: 'ocean',
      gradientPreset: 'ocean',
      wallpaper: { kind: 'gradient' },
    }).appearancePreset,
  ).toBe('ocean');
});

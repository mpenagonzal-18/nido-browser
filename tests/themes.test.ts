import { expect, it } from 'vitest';
import { COLOR_THEMES, themePalette } from '../src/shared/themes';
import { parseSettings, defaults } from '../src/shared/settings';
it('ofrece diez paletas distintas en claro y oscuro sin recursos de red', () => {
  expect(COLOR_THEMES).toHaveLength(10);
  expect(new Set(COLOR_THEMES.map((t) => t.id)).size).toBe(10);
  for (const theme of COLOR_THEMES) {
    expect(theme.gradient).toMatch(/^linear-gradient\(/);
    expect(theme.gradient).not.toMatch(/url|https:/);
    expect(themePalette(theme.id, false)['--bg']).not.toBe(themePalette(theme.id, true)['--bg']);
    expect(parseSettings({ colorTheme: theme.id, gradientPreset: theme.id }).colorTheme).toBe(
      theme.id,
    );
  }
});
it('conserva personalización, imagen y login al migrar perfiles antiguos', () => {
  const old = {
    ...defaults(),
    colorTheme: undefined,
    gradientPreset: undefined,
    accent: '#80004b',
    wallpaper: { kind: 'image', image: '/local/photo.png' },
  };
  const settings = parseSettings(old);
  expect(settings.colorTheme).toBe('forest');
  expect(settings.gradientPreset).toBe('custom');
  expect(settings.wallpaper.kind).toBe('image');
  expect(settings.wallpaper.image).toBe('/local/photo.png');
  expect(settings.accent).toBe('#80004b');
  expect(settings.browsingMode).toBe('persistent');
});

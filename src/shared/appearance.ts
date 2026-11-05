import { COLOR_THEMES, FONT_STYLES, themePalette } from './themes';
import type { Settings } from './settings';
export function resolvedAppearance(settings: Settings, light: boolean) {
  const preset = COLOR_THEMES.find((t) => t.id === settings.appearancePreset);
  return {
    locked: !!preset,
    accent: preset ? (light ? preset.light : preset.dark) : settings.accent,
    heroAccent: preset?.dark ?? settings.accent,
    fontStyle: preset?.font ?? settings.customFont,
    paletteId: preset?.id ?? settings.colorTheme,
    fonts: FONT_STYLES[preset?.font ?? settings.customFont],
    palette: themePalette(preset?.id ?? settings.colorTheme, light),
    wallpaper: preset
      ? { kind: 'gradient' as const, color: preset.dark, image: '', blur: 0, dim: 0.18 }
      : settings.wallpaper,
    gradient:
      preset?.gradient ?? COLOR_THEMES.find((t) => t.id === settings.gradientPreset)?.gradient,
  };
}

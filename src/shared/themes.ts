export const COLOR_THEMES = [
  {
    id: 'forest',
    name: 'Bosque',
    hue: 145,
    gradient: 'linear-gradient(135deg,#102e29,#35634b,#b4a66a)',
  },
  {
    id: 'ocean',
    name: 'Océano',
    hue: 210,
    gradient: 'linear-gradient(135deg,#101f4b,#176b8b,#61c6bd)',
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    hue: 18,
    gradient: 'linear-gradient(135deg,#36254d,#b65069,#efa967)',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    hue: 170,
    gradient: 'linear-gradient(135deg,#152b4d,#218b81,#9470bc)',
  },
  {
    id: 'lavender',
    name: 'Lavanda',
    hue: 265,
    gradient: 'linear-gradient(135deg,#292143,#7463ad,#c79fc5)',
  },
  {
    id: 'rose',
    name: 'Rosa',
    hue: 335,
    gradient: 'linear-gradient(135deg,#381d38,#9e4e76,#e4a5ad)',
  },
  {
    id: 'ember',
    name: 'Brasa',
    hue: 30,
    gradient: 'linear-gradient(135deg,#302326,#9b452d,#e6a047)',
  },
  {
    id: 'midnight',
    name: 'Medianoche',
    hue: 230,
    gradient: 'linear-gradient(135deg,#101525,#273663,#705d96)',
  },
  {
    id: 'sand',
    name: 'Dunas',
    hue: 40,
    gradient: 'linear-gradient(135deg,#4c3930,#a5845e,#e6cf9d)',
  },
  {
    id: 'arctic',
    name: 'Ártico',
    hue: 195,
    gradient: 'linear-gradient(135deg,#1b3548,#608eac,#b6d6da)',
  },
] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number]['id'];
export function themePalette(id: ColorTheme, light: boolean) {
  const { hue } = COLOR_THEMES.find((t) => t.id === id)!;
  return {
    '--bg': `hsl(${hue} 22% ${light ? 96 : 9}%)`,
    '--surface': `hsl(${hue} 20% ${light ? 90 : 15}%)`,
    '--text': `hsl(${hue} 15% ${light ? 15 : 92}%)`,
    '--muted': `hsl(${hue} 12% ${light ? 38 : 67}%)`,
  };
}

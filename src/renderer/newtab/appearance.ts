import { resolvedAppearance } from '../../shared/appearance';
import type { Settings } from '../../shared/settings';
let lastImage = '';
let imageUrl = '';
const mode = matchMedia('(prefers-color-scheme: dark)');
let latest: Settings;
let generation = 0;
mode.addEventListener('change', () => {
  if (latest) void applyAppearance(latest);
});
export async function applyAppearance(settings: Settings) {
  latest = settings;
  const ticket = ++generation;
  document.documentElement.dataset.theme =
    settings.theme === 'auto' ? (mode.matches ? 'dark' : 'light') : settings.theme;
  const light = document.documentElement.dataset.theme === 'light';
  const appearance = resolvedAppearance(settings, light);
  document.documentElement.style.setProperty('--accent', appearance.accent);
  document.documentElement.style.setProperty('--hero-accent', appearance.heroAccent);
  document.documentElement.style.setProperty('--font-ui', appearance.fonts.ui);
  document.documentElement.style.setProperty('--font-heading', appearance.fonts.heading);
  for (const [key, value] of Object.entries(appearance.palette))
    document.documentElement.style.setProperty(key, value);
  const bg = document.getElementById('wallpaper')!;
  const wallpaper = appearance.wallpaper;
  bg.style.filter = `blur(${wallpaper.blur}px)`;
  const shade = `linear-gradient(rgb(0 0 0 / ${wallpaper.dim}),rgb(0 0 0 / ${wallpaper.dim}))`;
  if (wallpaper.kind === 'image' && wallpaper.image) {
    if (lastImage !== wallpaper.image) {
      try {
        imageUrl = String(await window.nido.call('media-url', wallpaper.image));
        lastImage = wallpaper.image;
      } catch {
        imageUrl = '';
      }
    }
    if (ticket !== generation) return;
    bg.style.background = `${shade}, url("${imageUrl}") center / cover`;
  } else if (wallpaper.kind === 'solid') bg.style.background = `${shade}, ${wallpaper.color}`;
  else if (appearance.gradient) bg.style.background = `${shade}, ${appearance.gradient}`;
  else
    bg.style.background = `${shade}, radial-gradient(ellipse at 75% 75%,${appearance.accent}35,transparent 65%),linear-gradient(135deg,${wallpaper.color},${appearance.accent}28)`;
}

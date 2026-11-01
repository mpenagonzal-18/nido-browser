import type { Settings } from '../../shared/settings';
let lastImage = '';
let imageUrl = '';
const mode = matchMedia('(prefers-color-scheme: dark)');
let latest: Settings;
mode.addEventListener('change', () => {
  if (latest) void applyAppearance(latest);
});
export async function applyAppearance(settings: Settings) {
  latest = settings;
  document.documentElement.style.setProperty('--accent', settings.accent);
  document.documentElement.dataset.theme =
    settings.theme === 'auto' ? (mode.matches ? 'dark' : 'light') : settings.theme;
  const bg = document.getElementById('wallpaper')!;
  const wallpaper = settings.wallpaper;
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
    bg.style.background = `${shade}, url("${imageUrl}") center / cover`;
  } else if (wallpaper.kind === 'solid') bg.style.background = `${shade}, ${wallpaper.color}`;
  else
    bg.style.background = `${shade}, radial-gradient(ellipse at 75% 75%,${settings.accent}35,transparent 65%),linear-gradient(135deg,${wallpaper.color},${settings.accent}28)`;
}

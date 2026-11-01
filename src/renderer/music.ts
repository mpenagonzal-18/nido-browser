import type { Settings } from '../shared/settings';
export function musicPlayer(save: (settings: Settings) => void) {
  const root = document.getElementById('music-controls')!;
  const audio = document.getElementById('audio') as HTMLAudioElement;
  let settings: Settings; let index = 0; let loaded = ''; let generation = 0;
  const button = (text: string, title: string, action: () => void) => { const el = document.createElement('button'); el.textContent = text; el.title = title; el.setAttribute('aria-label', title); el.onclick = action; root.append(el); return el; };
  button('♫', 'Elegir música local', () => { void window.nido.call('choose-music'); });
  button('‹', 'Pista anterior', () => { void skip(-1); });
  const play = button('▷', 'Reproducir / pausar', () => { if (audio.paused) void start(); else audio.pause(); });
  button('›', 'Pista siguiente', () => { void skip(1); });
  const volume = document.createElement('input'); volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '.01'; volume.title = 'Volumen'; volume.setAttribute('aria-label', 'Volumen'); root.append(volume);
  volume.oninput = () => { audio.volume = Number(volume.value); settings.music.volume = audio.volume; save(settings); };
  const loop = button('↻', 'Repetir lista', () => { settings.music.loop = !settings.music.loop; save(settings); });
  const shuffle = button('⤨', 'Orden aleatorio', () => { settings.music.shuffle = !settings.music.shuffle; save(settings); });
  async function start() {
    const file = settings.music.paths[index]; if (!file) { await window.nido.call('choose-music'); return; }
    const ticket = ++generation;
    try { if (loaded !== file) { const url = String(await window.nido.call('media-url', file)); if (ticket !== generation) return; audio.src = url; loaded = file; } await audio.play(); }
    catch { play.title = 'No se pudo reproducir. Comprueba que el archivo existe y su formato.'; }
  }
  async function skip(delta: number) { const count = settings.music.paths.length; if (!count) return; index = settings.music.shuffle && count > 1 ? (index + 1 + Math.floor(Math.random() * (count - 1))) % count : (index + delta + count) % count; await start(); }
  audio.onplay = () => { play.textContent = 'Ⅱ'; }; audio.onpause = () => { play.textContent = '▷'; };
  audio.onended = () => { if (settings.music.shuffle || index < settings.music.paths.length - 1 || settings.music.loop) void skip(1); else { audio.pause(); play.textContent = '▷'; } };
  return (next: Settings) => {
    const changed = settings && JSON.stringify(settings.music.paths) !== JSON.stringify(next.music.paths);
    settings = structuredClone(next); audio.volume = settings.music.volume; volume.value = String(settings.music.volume);
    loop.style.color = settings.music.loop ? 'var(--accent)' : ''; shuffle.style.color = settings.music.shuffle ? 'var(--accent)' : '';
    if (changed) { audio.pause(); audio.removeAttribute('src'); loaded = ''; index = 0; generation++; }
  };
}

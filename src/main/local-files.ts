import { app, dialog, net, type BrowserWindow } from 'electron';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SettingsSchema, type Settings } from '../shared/settings';
const audio = new Set(['.mp3', '.ogg', '.wav', '.flac']);
const images = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const grants = new Map<string, string>();
export async function chooseFiles(win: BrowserWindow, kind: 'music' | 'wallpaper') {
  const extensions = [...(kind === 'music' ? audio : images)].map(ext => ext.slice(1));
  const result = await dialog.showOpenDialog(win, { properties: kind === 'music' ? ['openFile', 'multiSelections'] : ['openFile'], filters: [{ name: kind, extensions }] });
  return result.canceled ? [] : result.filePaths;
}
export async function mediaUrl(file: string, settings: Settings) {
  if (!path.isAbsolute(file) || (!audio.has(path.extname(file).toLowerCase()) && !images.has(path.extname(file).toLowerCase()))) throw new Error('Archivo local no permitido');
  if (settings.wallpaper.image !== file && !settings.music.paths.includes(file)) throw new Error('Archivo no seleccionado');
  if (!(await stat(file)).isFile()) throw new Error('No es un archivo');
  for (const [token, stored] of grants) if (stored === file) return `nido://app/media/${token}`;
  const token = crypto.randomUUID(); grants.set(token, file); return `nido://app/media/${token}`;
}
export async function serveMedia(request: Request) {
  const token = new URL(request.url).pathname.split('/')[2]; const file = grants.get(token);
  if (!file) return new Response('No autorizado', { status: 403 });
  return net.fetch(pathToFileURL(file).href, { headers: request.headers });
}
export async function exportSettings(win: BrowserWindow, settings: Settings) {
  const result = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), 'nido-settings.json'), filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (!result.canceled && result.filePath) await writeFile(result.filePath, JSON.stringify(settings, null, 2), { mode: 0o600 });
}
export async function importSettings(win: BrowserWindow): Promise<Settings | undefined> {
  const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (result.canceled) return;
  const file = result.filePaths[0]; if ((await stat(file)).size > 1_000_000) throw new Error('Configuración demasiado grande');
  return SettingsSchema.parse(JSON.parse(await readFile(file, 'utf8')));
}

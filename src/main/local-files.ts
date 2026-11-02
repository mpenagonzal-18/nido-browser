import { resolveLocale, translate, type Locale } from '../shared/i18n';
import { app, dialog, net, type BrowserWindow } from 'electron';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseSettings, type Settings } from '../shared/settings';
const audio = new Set(['.mp3', '.ogg', '.wav', '.flac']);
const images = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const grants = new Map<string, string>();
export async function chooseFiles(
  win: BrowserWindow,
  kind: 'music' | 'wallpaper',
  locale: Locale = 'es',
) {
  const extensions = [...(kind === 'music' ? audio : images)].map((ext) => ext.slice(1));
  const result = await dialog.showOpenDialog(win, {
    properties: kind === 'music' ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: [
      { name: translate(kind === 'music' ? 'Música local' : 'Color y fondo', locale), extensions },
    ],
  });
  return result.canceled ? [] : result.filePaths;
}
export async function mediaUrl(file: string, settings: Settings) {
  const locale = resolveLocale(settings.language, app.getLocale());
  if (
    !path.isAbsolute(file) ||
    (!audio.has(path.extname(file).toLowerCase()) && !images.has(path.extname(file).toLowerCase()))
  )
    throw new Error(translate('Archivo local no permitido', locale));
  if (settings.wallpaper.image !== file && !settings.music.paths.includes(file))
    throw new Error(translate('Archivo no seleccionado', locale));
  if (!(await stat(file)).isFile()) throw new Error(translate('No es un archivo', locale));
  for (const [token, stored] of grants) if (stored === file) return `nido://app/media/${token}`;
  const token = crypto.randomUUID();
  grants.set(token, file);
  return `nido://app/media/${token}`;
}
export async function serveMedia(request: Request) {
  const token = new URL(request.url).pathname.split('/')[2];
  const file = grants.get(token);
  if (!file) return new Response('No autorizado', { status: 403 });
  return net.fetch(pathToFileURL(file).href, { headers: request.headers });
}
export async function exportSettings(win: BrowserWindow, settings: Settings) {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), 'nido-settings.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!result.canceled && result.filePath)
    await writeFile(result.filePath, JSON.stringify(settings, null, 2), { mode: 0o600 });
}
export async function importSettings(
  win: BrowserWindow,
  locale: Locale = 'es',
): Promise<Settings | undefined> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled) return;
  const file = result.filePaths[0];
  if ((await stat(file)).size > 1_000_000)
    throw new Error(translate('Configuración demasiado grande', locale));
  return parseSettings(JSON.parse(await readFile(file, 'utf8')));
}

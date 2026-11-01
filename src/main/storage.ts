import { app } from 'electron';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { defaults, SettingsSchema, type Settings } from '../shared/settings';
export async function readSettings(): Promise<Settings> {
  try {
    return SettingsSchema.parse(
      JSON.parse(await readFile(path.join(app.getPath('userData'), 'settings.json'), 'utf8')),
    );
  } catch {
    return defaults();
  }
}
let saving = Promise.resolve();
export function saveSettings(settings: Settings): Promise<void> {
  const snapshot = structuredClone(settings);
  if (!snapshot.music.remember) snapshot.music.paths = [];
  saving = saving
    .catch(() => {})
    .then(async () => {
      const dir = app.getPath('userData');
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, 'settings.json');
      await writeFile(file + '.tmp', JSON.stringify(snapshot, null, 2), { mode: 0o600 });
      await rename(file + '.tmp', file);
    });
  return saving;
}
export async function recordHistory(url: string, title: string) {
  const file = path.join(app.getPath('userData'), 'history.json');
  let entries: { url: string; title: string; at: string }[] = [];
  try {
    entries = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    /* first entry */
  }
  entries.push({ url, title, at: new Date().toISOString() });
  await writeFile(file, JSON.stringify(entries.slice(-5000)), { mode: 0o600 });
}

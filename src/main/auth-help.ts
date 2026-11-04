import { app, dialog, shell, type BrowserWindow } from 'electron';
import { isGoogleLoginRejected } from '../shared/auth';
import { resolveLocale, translate } from '../shared/i18n';
import type { Settings } from '../shared/settings';
export async function showGoogleAuthHelp(parent: BrowserWindow, url: string, settings: Settings) {
  if (!isGoogleLoginRejected(url) || parent.isDestroyed()) return;
  const tr = (source: string) =>
    translate(source, resolveLocale(settings.language, app.getLocale()));
  const result = await dialog.showMessageBox(parent, {
    type: 'info',
    title: tr('Google no admite este acceso'),
    message: tr(
      'Google puede rechazar navegadores integrados como Electron aunque la conexión HTTPS sea válida.',
    ),
    detail: tr(
      'Nido mantiene sandbox, aislamiento y validación de certificados. Abrir Google en el navegador del sistema permite continuar allí; esa sesión no se transfiere a Nido. No se importan cookies ni contraseñas.',
    ),
    buttons: [tr('Volver a Nido'), tr('Abrir Google en el navegador del sistema')],
    defaultId: 0,
    cancelId: 0,
  });
  // A fixed HTTPS destination: never forward untrusted continue/redirect/client data.
  if (result.response === 1) await shell.openExternal('https://accounts.google.com/');
}

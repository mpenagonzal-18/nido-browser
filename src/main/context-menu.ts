import {
  clipboard,
  type ContextMenuParams,
  type MenuItemConstructorOptions,
  type WebContents,
} from 'electron';
import { addressToUrl, isWebUrl } from '../shared/navigation';
import type { Settings } from '../shared/settings';
import { resolveLocale, translate, type Locale } from '../shared/i18n';
export interface ContextActions {
  settings: Settings;
  systemLocale: string;
  open: (url: string) => void;
  navigate: (url: string) => void;
}
export function clipboardDestination(text: string, settings: Settings): string | undefined {
  if (!text.trim() || text.length > 4096) return;
  try {
    return addressToUrl(text, settings.search, settings.searx);
  } catch {
    return;
  }
}
export function editMenu(
  params: ContextMenuParams,
  locale: Locale = 'es',
): MenuItemConstructorOptions[] {
  const tr = (source: string) => translate(source, locale);
  const f = params.editFlags;
  return [
    { role: 'undo', label: tr('Deshacer'), enabled: f.canUndo },
    { role: 'redo', label: tr('Rehacer'), enabled: f.canRedo },
    { type: 'separator' },
    { role: 'cut', label: tr('Cortar'), enabled: f.canCut },
    { role: 'copy', label: tr('Copiar'), enabled: f.canCopy },
    { role: 'paste', label: tr('Pegar'), enabled: f.canPaste },
    { role: 'selectAll', label: tr('Seleccionar todo'), enabled: f.canSelectAll },
  ];
}
export async function addressMenu(
  params: ContextMenuParams,
  actions: ContextActions,
): Promise<MenuItemConstructorOptions[]> {
  const destination = clipboardDestination(await clipboard.readText(), actions.settings);
  const tr = (s: string) =>
    translate(s, resolveLocale(actions.settings.language, actions.systemLocale));
  return [
    ...editMenu(params, resolveLocale(actions.settings.language, actions.systemLocale)),
    { type: 'separator' },
    {
      label: tr('Pegar y acceder'),
      enabled: !!destination,
      click: () => {
        if (destination) actions.navigate(destination);
      },
    },
  ];
}
export function pageMenu(
  contents: WebContents,
  params: ContextMenuParams,
  actions: ContextActions,
): MenuItemConstructorOptions[] {
  const tr = (s: string) =>
    translate(s, resolveLocale(actions.settings.language, actions.systemLocale));
  const menu: MenuItemConstructorOptions[] = [];
  const link = isWebUrl(params.linkURL) ? params.linkURL : undefined;
  if (link)
    menu.push(
      { label: tr('Abrir enlace en una nueva pestaña'), click: () => actions.open(link) },
      { label: tr('Copiar dirección del enlace'), click: () => clipboard.writeText(link) },
      { label: tr('Guardar enlace como…'), click: () => contents.downloadURL(link) },
      { type: 'separator' },
    );
  if (params.mediaType === 'image' && isWebUrl(params.srcURL)) {
    const url = params.srcURL;
    menu.push(
      { label: tr('Abrir imagen en una nueva pestaña'), click: () => actions.open(url) },
      { label: tr('Guardar imagen como…'), click: () => contents.downloadURL(url) },
      { label: tr('Copiar dirección de la imagen'), click: () => clipboard.writeText(url) },
      { type: 'separator' },
    );
  }
  if (params.isEditable)
    menu.push(...editMenu(params, resolveLocale(actions.settings.language, actions.systemLocale)), {
      type: 'separator',
    });
  else if (params.selectionText) menu.push({ role: 'copy', label: tr('Copiar') });
  if (params.selectionText) {
    const selected = params.selectionText;
    const target = clipboardDestination(selected, actions.settings);
    if (target)
      menu.push({ label: tr('Ir a la selección o buscarla'), click: () => actions.open(target) });
    menu.push(
      {
        label: tr('Copiar texto seleccionado para la IA'),
        click: () => clipboard.writeText(selected),
      },
      { type: 'separator' },
    );
  }
  menu.push(
    {
      label: tr('Atrás'),
      enabled: contents.navigationHistory.canGoBack(),
      click: () => contents.navigationHistory.goBack(),
    },
    {
      label: tr('Adelante'),
      enabled: contents.navigationHistory.canGoForward(),
      click: () => contents.navigationHistory.goForward(),
    },
    { label: tr('Recargar'), click: () => contents.reload() },
    {
      label: tr('Copiar URL de la página actual'),
      click: () => clipboard.writeText(contents.getURL()),
    },
  );
  return menu;
}

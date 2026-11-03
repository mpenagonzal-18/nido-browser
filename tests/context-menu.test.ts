import { expect, it, vi } from 'vitest';
vi.mock('electron', () => ({
  clipboard: { readText: vi.fn(async () => 'https://example.org/path'), writeText: vi.fn() },
}));
import { addressMenu, clipboardDestination, pageMenu } from '../src/main/context-menu';
import { defaults } from '../src/shared/settings';
import type { ContextMenuParams, WebContents } from 'electron';
const params = (overrides: Partial<ContextMenuParams> = {}): ContextMenuParams =>
  ({
    linkURL: '',
    srcURL: '',
    selectionText: '',
    isEditable: false,
    mediaType: 'none',
    editFlags: {
      canUndo: true,
      canRedo: false,
      canCut: true,
      canCopy: true,
      canPaste: true,
      canDelete: true,
      canSelectAll: true,
      canEditRichly: false,
    },
    ...overrides,
  }) as ContextMenuParams;
it('pegar y acceder valida el portapapeles y navega solo al elegir la acción', async () => {
  const navigate = vi.fn();
  const items = await addressMenu(params(), {
    settings: defaults(),
    systemLocale: 'es',
    navigate,
    open: vi.fn(),
  });
  expect(navigate).not.toHaveBeenCalled();
  const go = items.find((x) => x.label === 'Pegar y acceder')!;
  (go.click as () => void)();
  expect(navigate).toHaveBeenCalledWith('https://example.org/path');
  expect(clipboardDestination('javascript:alert(1)', defaults())).toBeUndefined();
  expect(clipboardDestination('file:///etc/passwd', defaults())).toBeUndefined();
  expect(clipboardDestination('   ', defaults())).toBeUndefined();
  expect(clipboardDestination('una búsqueda', defaults())).toContain('duckduckgo.com');
});
it('enlaces y selección no navegan al construir el menú y deniegan esquemas peligrosos', () => {
  const open = vi.fn();
  const contents = {
    navigationHistory: { canGoBack: () => false, canGoForward: () => false },
    getURL: () => 'https://page.test',
  } as unknown as WebContents;
  const actions = { settings: defaults(), systemLocale: 'es', open, navigate: vi.fn() };
  const menu = pageMenu(
    contents,
    params({ linkURL: 'https://link.test/', selectionText: 'hola mundo' }),
    actions,
  );
  expect(open).not.toHaveBeenCalled();
  (menu.find((x) => x.label === 'Abrir enlace en una nueva pestaña')!.click as () => void)();
  expect(open).toHaveBeenCalledWith('https://link.test/');
  expect(
    pageMenu(
      contents,
      params({ linkURL: 'javascript:alert(1)', srcURL: 'file:///secret', mediaType: 'image' }),
      actions,
    ).some((x) => x.label?.includes('como…')),
  ).toBe(false);
});

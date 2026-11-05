import { expect, it } from 'vitest';
import { tabShortcutTarget } from '../src/shared/tab-shortcuts';
it('rota y vuelve al principio sin depender del foco del renderer', () => {
  const key = { type: 'keyDown', key: 'Tab', control: true };
  expect(tabShortcutTarget(key, 2, 3, 'win32')).toBe(0);
  expect(tabShortcutTarget({ ...key, shift: true }, 0, 3, 'linux')).toBe(2);
  expect(tabShortcutTarget({ ...key, key: 'PageDown' }, 0, 3, 'win32')).toBe(1);
  expect(tabShortcutTarget({ ...key, key: 'PageUp' }, 0, 3, 'win32')).toBe(2);
});
it('selecciona 1–8 y 9 es siempre la última, con Cmd en macOS', () => {
  expect(tabShortcutTarget({ type: 'keyDown', key: '2', control: true }, 0, 4, 'win32')).toBe(1);
  expect(tabShortcutTarget({ type: 'keyDown', key: '9', control: true }, 0, 4, 'linux')).toBe(3);
  expect(
    tabShortcutTarget({ type: 'keyDown', key: '&', code: 'Digit1', meta: true }, 2, 3, 'darwin'),
  ).toBe(0);
  expect(
    tabShortcutTarget({ type: 'keyDown', key: 'ArrowLeft', meta: true, alt: true }, 0, 3, 'darwin'),
  ).toBe(2);
});
it('no captura Cmd+Tab, combinaciones de edición ni índices inexistentes', () => {
  for (const input of [
    { type: 'keyDown', key: 'Tab', meta: true },
    { type: 'keyUp', key: 'Tab', control: true },
    { type: 'keyDown', key: '2' },
    { type: 'keyDown', key: '2', control: true, shift: true },
    { type: 'keyDown', key: '8', control: true },
  ])
    expect(tabShortcutTarget(input, 0, 3, 'darwin')).toBeUndefined();
  expect(
    tabShortcutTarget({ type: 'keyDown', key: 'Tab', control: true }, 0, 0, 'linux'),
  ).toBeUndefined();
});

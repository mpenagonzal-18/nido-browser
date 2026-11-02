import { expect, it, vi } from 'vitest';
vi.mock('electron', () => ({
  app: { getLocale: () => 'es' },
  dialog: { showMessageBox: vi.fn(async () => ({ response: 1 })) },
}));
import { configurePrivacy } from '../src/main/privacy';
import { defaults } from '../src/shared/settings';
import type { Session } from 'electron';
it('autorizar dictado no autoriza cámara ni persiste tras borrar datos IA', async () => {
  let request: Parameters<Session['setPermissionRequestHandler']>[0];
  let check: Parameters<Session['setPermissionCheckHandler']>[0];
  const ses = {
    setUserAgent: vi.fn(),
    setSpellCheckerEnabled: vi.fn(),
    setDevicePermissionHandler: vi.fn(),
    setPermissionCheckHandler: (fn: typeof check) => (check = fn),
    setPermissionRequestHandler: (fn: typeof request) => (request = fn),
    on: vi.fn(),
    cookies: { on: vi.fn() },
    webRequest: { onBeforeSendHeaders: vi.fn(), onHeadersReceived: vi.fn() },
  } as unknown as Session;
  const controls = configurePrivacy(ses, defaults, true);
  const callback = vi.fn();
  request!({ getURL: () => 'https://claude.ai' } as never, 'media', callback, {
    requestingUrl: 'https://claude.ai',
    mediaTypes: ['audio'],
  } as never);
  await vi.waitFor(() => expect(callback).toHaveBeenCalledWith(true));
  expect(
    check!(null, 'media', 'https://claude.ai', { isMainFrame: true, mediaType: 'audio' }),
  ).toBe(true);
  expect(
    check!(null, 'media', 'https://claude.ai', { isMainFrame: true, mediaType: 'video' }),
  ).toBe(false);
  const deny = vi.fn();
  request!({ getURL: () => 'https://claude.ai' } as never, 'media', deny, {
    requestingUrl: 'https://claude.ai',
    mediaTypes: ['video'],
  } as never);
  expect(deny).toHaveBeenCalledWith(false);
  controls.clearPermissions();
  expect(
    check!(null, 'media', 'https://claude.ai', { isMainFrame: true, mediaType: 'audio' }),
  ).toBe(false);
});

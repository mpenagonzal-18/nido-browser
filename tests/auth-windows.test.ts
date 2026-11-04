import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ app: {}, Menu: {} }));
import { AuthWindows } from '../src/main/auth-windows';
import { defaults } from '../src/shared/settings';
import type { Blocking } from '../src/main/blocking';
import type {
  BrowserWindow,
  HandlerDetails,
  WebContents,
  WindowOpenHandlerResponse,
} from 'electron';
it('ignora preferencias inseguras, mantiene sesión y limita aperturas simultáneas', () => {
  let handler: (details: HandlerDetails) => WindowOpenHandlerResponse;
  const source = Object.assign(new EventEmitter(), {
    session: {},
    setWindowOpenHandler: (fn: typeof handler) => {
      handler = fn;
    },
  });
  const manager = new AuthWindows(
    () => ({}) as BrowserWindow,
    defaults,
    { popupAllowed: () => true } as unknown as Blocking,
    vi.fn(),
  );
  manager.attach(source as unknown as WebContents);
  const details = {
    url: 'https://accounts.google.com/signin',
    disposition: 'new-window',
    frameName: 'oauth',
    features: 'nodeIntegration=yes,webSecurity=no,preload=/bad.js',
  } as HandlerDetails;
  const first = handler!(details);
  expect(first.action).toBe('allow');
  expect(first.overrideBrowserWindowOptions?.webPreferences).toMatchObject({
    session: source.session,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    sandbox: true,
    contextIsolation: true,
    webSecurity: true,
    webviewTag: false,
    allowRunningInsecureContent: false,
  });
  expect(first.overrideBrowserWindowOptions?.webPreferences?.preload).toMatch(/popup\.js$/);
  for (let i = 0; i < 3; i++) expect(handler!(details).action).toBe('allow');
  expect(handler!(details).action).toBe('deny');
  manager.closeAll();
  expect(handler!(details).action).toBe('deny');
});

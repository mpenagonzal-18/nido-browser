import { contextBridge } from 'electron';
// Registered on every frame (including about:blank/srcdoc descendants) of the
// cookie-free browsing session. No privileged API is exposed to remote content.
contextBridge.executeInMainWorld({
  func: () => {
    Object.defineProperty(Document.prototype, 'cookie', {
      get: () => '',
      set: () => {},
      configurable: false,
    });
    Object.defineProperty(window, 'cookieStore', { value: undefined, configurable: false });
  },
});

import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('nido', {
  call: (action: string, payload?: unknown) =>
    ipcRenderer.invoke('nido:command', { action, payload }),
  onState: (callback: (state: unknown) => void) => {
    const handler = (_: unknown, state: unknown) => callback(state);
    ipcRenderer.on('nido:state', handler);
    return () => ipcRenderer.removeListener('nido:state', handler);
  },
  onDownloads: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('nido:show-downloads', handler);
    return () => ipcRenderer.removeListener('nido:show-downloads', handler);
  },
  onFocusAddress: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('nido:focus-address', handler);
    return () => ipcRenderer.removeListener('nido:focus-address', handler);
  },
});

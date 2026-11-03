import { ipcRenderer, contextBridge, webFrame } from 'electron';
import { installYoutubePlayerFilter, YOUTUBE_AD_CSS } from '../shared/youtube-filter';
import { isYoutubePage, observeYoutubeNotice } from '../shared/youtube';
if (process.isMainFrame && isYoutubePage(location.href)) {
  let stop: (() => void) | undefined;
  let filtering = false;
  let css = '';
  const filter = (enabled: boolean) => {
    if (enabled === filtering) return;
    if (enabled) {
      contextBridge.executeInMainWorld({ func: installYoutubePlayerFilter });
      css = webFrame.insertCSS(YOUTUBE_AD_CSS, { cssOrigin: 'user' });
    } else {
      contextBridge.executeInMainWorld({
        func: () => window.dispatchEvent(new Event('nido:youtube-filter-stop')),
      });
      if (css) webFrame.removeInsertedCSS(css);
      css = '';
    }
    filtering = enabled;
  };
  filter(true);
  const start = () => {
    stop?.();
    stop = observeYoutubeNotice((position) =>
      ipcRenderer.send('nido:youtube-warning', { type: 'anti-adblock', position }),
    );
  };
  ipcRenderer.on('nido:youtube-state', (_event, state: unknown) => {
    if (
      !state ||
      typeof state !== 'object' ||
      !('paused' in state) ||
      typeof state.paused !== 'boolean'
    )
      return;
    filter(!state.paused);
    if (state.paused) {
      stop?.();
      stop = undefined;
    } else if (!stop) start();
  });
  start();
}

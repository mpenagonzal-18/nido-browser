import { ipcRenderer } from 'electron';
import { isYoutubePage, observeYoutubeNotice } from '../shared/youtube';
if (process.isMainFrame && isYoutubePage(location.href)) {
  let stop: (() => void) | undefined;
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
    if (state.paused) {
      stop?.();
      stop = undefined;
    } else if (!stop) start();
  });
  start();
}

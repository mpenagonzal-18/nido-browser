import type { IpcMainEvent, WebContents } from 'electron';
import { z } from 'zod';
import type { Settings } from '../shared/settings';
import { isYoutubePage, restoreVideoPosition } from '../shared/youtube';
import type { Blocking } from './blocking';
const Notice = z
  .object({ type: z.literal('anti-adblock'), position: z.number().finite().min(0).max(10_000_000) })
  .strict();
export function handleYoutubeNotice(
  blocking: Blocking,
  settings: Settings,
  event: Pick<IpcMainEvent, 'sender' | 'senderFrame'>,
  raw: unknown,
  ownsTab: (contents: WebContents) => boolean,
  notify: () => void,
): boolean {
  const parsed = Notice.safeParse(raw);
  const contents = event.sender;
  if (!parsed.success || contents.isDestroyed() || !settings.youtubeAutoPause || !ownsTab(contents))
    return false;
  const url = contents.getURL();
  if (
    event.senderFrame !== contents.mainFrame ||
    !isYoutubePage(event.senderFrame.url) ||
    !isYoutubePage(url) ||
    blocking.exempt(url)
  )
    return false;
  if (!blocking.pauseYoutube()) return false;
  notify(); // The bypass is active before any reload/request can start.
  const position = parsed.data.position;
  if (position > 0)
    contents.once('did-finish-load', () => {
      if (!contents.isDestroyed() && contents.getURL() === url)
        void contents
          .executeJavaScript(`(${restoreVideoPosition.toString()})(${position})`)
          .catch(() => {});
    });
  contents.reload(); // At most once automatically for this run, until explicit resume.
  return true;
}

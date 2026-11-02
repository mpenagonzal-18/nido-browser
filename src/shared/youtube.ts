export const YOUTUBE_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'googlevideo.com',
  'ytimg.com',
  'youtube-nocookie.com',
];
export function isYoutubeResource(value: string): boolean {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    return YOUTUBE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
export function isYoutubePage(value: string): boolean {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    return ['youtube.com', 'youtu.be', 'youtube-nocookie.com'].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
export function isAntiAdblockNotice(text: string): boolean {
  const value = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return (
    /(?:ad[ -]?block(?:er|ers|ing)?|bloqueador(?:es)? de anuncios|bloqueurs? de publicite|werbeblocker|bloqueadores? de anuncios)/.test(
      value,
    ) &&
    /(?:not allowed|violate|terms of service|turn off|disable|allow ads|no se permiten|infringen|condiciones|desactiv|permitir anuncios|ne sont pas autorises|conditions|desactiv|nicht erlaubt|nutzungsbedingungen|deaktivier|nao sao permitidos|termos)/.test(
      value,
    )
  );
}
/** Watches only known player/dialog notice surfaces, never arbitrary page text. */
export function observeYoutubeNotice(report: (position: number) => void): () => void {
  const selectors =
    'ytd-enforcement-message-view-model,yt-enforcement-message-view-model,ytd-player-error-message-renderer,.ytp-error-content-wrap-reason,tp-yt-paper-dialog,yt-playability-error-supported-renderers';
  let stopped = false;
  let pending: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    if (stopped) return;
    for (const node of document.querySelectorAll<HTMLElement>(selectors)) {
      const style = getComputedStyle(node);
      if (
        !node.getClientRects().length ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        node.closest('[hidden],[aria-hidden="true"]')
      )
        continue;
      const text = `${node.textContent ?? ''} ${node.shadowRoot?.textContent ?? ''}`;
      if (!isAntiAdblockNotice(text)) continue;
      const position = document.querySelector('video')?.currentTime ?? 0;
      stop();
      report(Number.isFinite(position) ? Math.max(0, position) : 0);
      return;
    }
  };
  const schedule = () => {
    if (!stopped && !pending)
      pending = setTimeout(() => {
        pending = undefined;
        check();
      }, 250);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden', 'aria-hidden', 'style', 'class'],
  });
  const pulse = setInterval(check, 2000); // Includes notices inside an open shadow root.
  function stop() {
    stopped = true;
    observer.disconnect();
    clearInterval(pulse);
    if (pending) clearTimeout(pending);
  }
  schedule();
  return stop;
}
/** Bounded restore after the one automatic reload; never forces playback. */
export function restoreVideoPosition(position: number) {
  if (!(position > 0) || !Number.isFinite(position)) return;
  const finish = () => {
    const video = document.querySelector('video');
    if (!video || video.readyState < 1) return false;
    try {
      video.currentTime = Number.isFinite(video.duration)
        ? Math.min(position, Math.max(0, video.duration - 0.1))
        : position;
      return true;
    } catch {
      return false;
    }
  };
  if (finish()) return;
  const timer = setInterval(() => {
    if (finish()) clearInterval(timer);
  }, 500);
  setTimeout(() => clearInterval(timer), 30000);
}

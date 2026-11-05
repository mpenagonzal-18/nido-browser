export interface TabKey {
  type: string;
  key: string;
  code?: string;
  control?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}
export function tabShortcutTarget(
  input: TabKey,
  active: number,
  count: number,
  platform: string,
): number | undefined {
  if (input.type !== 'keyDown' || count < 1 || active < 0) return;
  const key = input.key.toLowerCase();
  let direction = 0;
  if (input.control && !input.meta && !input.alt) {
    if (key === 'tab') direction = input.shift ? -1 : 1;
    else if (!input.shift && key === 'pageup') direction = -1;
    else if (!input.shift && key === 'pagedown') direction = 1;
  }
  if (platform === 'darwin' && input.meta && input.alt && !input.control && !input.shift) {
    if (key === 'arrowleft') direction = -1;
    if (key === 'arrowright') direction = 1;
  }
  if (direction) return (active + direction + count) % count;
  const modifier =
    platform === 'darwin' ? input.meta && !input.control : input.control && !input.meta;
  if (!modifier || input.alt || input.shift) return;
  const digit = /^[1-9]$/.test(key)
    ? Number(key)
    : /^Digit[1-9]$/.test(input.code ?? '')
      ? Number(input.code!.slice(-1))
      : 0;
  if (digit === 9) return count - 1;
  if (digit > 0 && digit <= count) return digit - 1;
}

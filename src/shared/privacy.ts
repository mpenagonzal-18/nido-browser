import { isWebUrl } from './navigation';
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
}
export function domainMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}
export function providerAllows(url: string, providers: { url: string }[]): boolean {
  return isWebUrl(url) && providers.some((p) => domainMatches(hostname(url), hostname(p.url)));
}
export function videoExcluded(url: string, domains: string[]): boolean {
  return domains.some((domain) => domainMatches(hostname(url), domain.toLowerCase()));
}
export function requestHeaders(
  headers: Record<string, string>,
  allowCookies: boolean,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const name = key.toLowerCase();
    if ((!allowCookies && name === 'cookie') || name === 'dnt' || name === 'sec-gpc') continue;
    if (name === 'referer') {
      try {
        result[key] = new URL(value).origin + '/';
      } catch {
        /* omit malformed referrer */
      }
    } else result[key] = value;
  }
  result.DNT = '1';
  result['Sec-GPC'] = '1';
  return result;
}
export function responseHeaders(
  headers: Record<string, string[]>,
  allowCookies: boolean,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([key]) => allowCookies || !['set-cookie', 'set-cookie2'].includes(key.toLowerCase()),
    ),
  );
}
export function upgradeHttp(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'http:' ||
      parsed.port ||
      ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    )
      return;
    parsed.protocol = 'https:';
    return parsed.href;
  } catch {
    return;
  }
}

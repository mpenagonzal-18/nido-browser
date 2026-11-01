export type SearchEngine = 'duckduckgo' | 'brave' | 'startpage' | 'searxng';
export function isWebUrl(value: string): boolean {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function addressToUrl(
  input: string,
  engine: SearchEngine = 'duckduckgo',
  searx = 'https://search.example.org/search',
): string {
  const value = input.trim();
  if (!value) return 'nido://app/newtab';
  if (/^https?:\/\//i.test(value) && isWebUrl(value)) return new URL(value).href;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^[\w.-]+:\d+(?:\/|$)/.test(value))
    throw new Error('Esquema no permitido');
  if (!/\s/.test(value) && /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(value))
    return `http://${value}`;
  if (!/\s/.test(value) && /^[\w-]+(?:\.[\w-]+)+(?:[/:?#]|$)/.test(value))
    return `https://${value}`;
  const base = {
    duckduckgo: 'https://duckduckgo.com/',
    brave: 'https://search.brave.com/search',
    startpage: 'https://www.startpage.com/sp/search',
    searxng: searx,
  }[engine];
  if (!isWebUrl(base)) throw new Error('URL de buscador inválida');
  const url = new URL(base);
  url.searchParams.set('q', value);
  return url.href;
}

import { expect, it } from 'vitest';
import { addressToUrl } from '../src/shared/navigation';
it.each([
  ['example.com/a', 'https://example.com/a'],
  ['https://example.com', 'https://example.com/'],
  ['localhost:3000', 'http://localhost:3000'],
  ['', 'nido://app/newtab'],
])('resuelve %s', (input, output) => expect(addressToUrl(input)).toBe(output));
it('codifica búsquedas y permite SearXNG', () => {
  expect(new URL(addressToUrl('té & calma')).searchParams.get('q')).toBe('té & calma');
  expect(addressToUrl('hola mundo', 'searxng', 'https://s.test/search')).toBe(
    'https://s.test/search?q=hola+mundo',
  );
});
it.each([
  'javascript:alert(1)',
  'file:///etc/passwd',
  'data:text/html,test',
  'nido://app/media/secret',
])('rechaza %s', (input) => expect(() => addressToUrl(input)).toThrow());

import { expect, it } from 'vitest';
import {
  isGoogleLoginRejected,
  isIdentityPage,
  safePopupUrl,
  needsNativePopup,
} from '../src/shared/auth';
it('reconoce el rechazo de Google sin confiar en query, título o dominios parecidos', () => {
  expect(
    isGoogleLoginRejected(
      'https://accounts.google.com/v3/signin/rejected?continue=https://youtube.com',
    ),
  ).toBe(true);
  for (const url of [
    'https://accounts.google.com/signin/v2/deniedsigninrejected',
    'https://accounts.google.com/signin/rejected',
  ])
    expect(isGoogleLoginRejected(url)).toBe(true);
  for (const url of [
    'http://accounts.google.com/v3/signin/rejected',
    'https://accounts.google.com.attacker.test/v3/signin/rejected',
    'https://example.test/?continue=https://accounts.google.com/v3/signin/rejected',
    'https://accounts.google.com/signin',
  ])
    expect(isGoogleLoginRejected(url)).toBe(false);
});
it('limita la compatibilidad de filtros a los orígenes de identidad concretos', () => {
  expect(isIdentityPage('https://accounts.google.com/signin')).toBe(true);
  expect(isIdentityPage('https://login.microsoftonline.com/tenant/oauth2/authorize')).toBe(false);
  for (const url of [
    'https://google.com',
    'https://ads.google.com',
    'https://accounts.google.com.attacker.test',
    'http://accounts.google.com',
  ])
    expect(isIdentityPage(url)).toBe(false);
});
it('conserva popups con opener y niega esquemas peligrosos', () => {
  for (const url of ['about:blank', '', 'https://accounts.google.com'])
    expect(safePopupUrl(url)).toBe(true);
  for (const url of [
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,test',
    'nido://app',
  ])
    expect(safePopupUrl(url)).toBe(false);
  const plain = {
    url: 'https://example.test',
    frameName: '_blank',
    features: '',
    disposition: 'foreground-tab',
  };
  expect(needsNativePopup(plain)).toBe(false);
  expect(needsNativePopup({ ...plain, frameName: 'oauth' })).toBe(true);
  expect(needsNativePopup({ ...plain, url: 'about:blank' })).toBe(true);
  expect(needsNativePopup({ ...plain, postBody: {} })).toBe(true);
});

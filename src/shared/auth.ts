import { isWebUrl } from './navigation';
const IDENTITY_ORIGINS = new Set(['https://accounts.google.com']);
export function isIdentityPage(value: string): boolean {
  try {
    return IDENTITY_ORIGINS.has(new URL(value).origin);
  } catch {
    return false;
  }
}
export function isGoogleLoginRejected(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === 'https://accounts.google.com' &&
      /^\/(?:v\d+\/)?signin\/(?:rejected|v2\/deniedsigninrejected)\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
export function safePopupUrl(url: string): boolean {
  return url === '' || url === 'about:blank' || isWebUrl(url);
}
export function needsNativePopup(details: {
  url: string;
  frameName: string;
  features: string;
  disposition: string;
  postBody?: unknown;
}): boolean {
  return (
    details.url === '' ||
    details.url === 'about:blank' ||
    details.disposition === 'new-window' ||
    !!details.postBody ||
    isIdentityPage(details.url) ||
    !!details.features ||
    (!!details.frameName && !['_blank', '_self', '_top', '_parent'].includes(details.frameName))
  );
}

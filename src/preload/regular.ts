import { installDocumentPolicy } from './document-policy';
// Global normal browsing: first-party storage is available on every web origin.
installDocumentPolicy(true, '*');

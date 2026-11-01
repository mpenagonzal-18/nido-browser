import { installDocumentPolicy } from './document-policy';
const site =
  process.argv.find((arg) => arg.startsWith('--nido-temporary-site='))?.split('=')[1] ?? '';
installDocumentPolicy(true, site);

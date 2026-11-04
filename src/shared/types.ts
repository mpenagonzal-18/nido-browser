import type { Locale } from './i18n';
import type { Settings } from './settings';
export interface TabState {
  id: string;
  title: string;
  url: string;
  suspended: boolean;
  blocked: number;
  canBack: boolean;
  canForward: boolean;
}
export interface DownloadState {
  id: string;
  name: string;
  received: number;
  total: number;
  status: 'progressing' | 'interrupted' | 'completed' | 'cancelled';
  paused: boolean;
  canResume: boolean;
  path?: string;
}
export interface State {
  downloads: DownloadState[];
  tabs: TabState[];
  active: string;
  sidebar: boolean;
  provider: string;
  settings: Settings;
  version: string;
  blockingDisabled: boolean;
  compatible: boolean;
  locale: Locale;
  youtubePaused: boolean;
  googleLoginRejected: boolean;
}
export interface Bridge {
  call(action: string, payload?: unknown): Promise<unknown>;
  onState(callback: (state: State) => void): () => void;
  onDownloads(callback: () => void): () => void;
  onFocusAddress(callback: () => void): () => void;
}
declare global {
  interface Window {
    nido: Bridge;
  }
}

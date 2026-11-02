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
export interface State {
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
}
export interface Bridge {
  call(action: string, payload?: unknown): Promise<unknown>;
  onState(callback: (state: State) => void): () => void;
  onFocusAddress(callback: () => void): () => void;
}
declare global {
  interface Window {
    nido: Bridge;
  }
}

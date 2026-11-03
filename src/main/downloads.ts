import { app, shell, type DownloadItem, type Session } from 'electron';
import path from 'node:path';
import type { DownloadState } from '../shared/types';
export class Downloads {
  private entries = new Map<string, { state: DownloadState; item: DownloadItem }>();
  private timer?: ReturnType<typeof setTimeout>;
  private stopping = false;
  constructor(private changed: () => void) {}
  get active() {
    return [...this.entries.values()].some(
      (e) => e.state.status === 'progressing' || e.state.canResume,
    );
  }
  snapshot(): DownloadState[] {
    return [...this.entries.values()].map((e) => ({ ...e.state })).reverse();
  }
  private notify() {
    if (!this.timer && !this.stopping)
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.changed();
      }, 150);
  }
  attach(session: Session) {
    session.on('will-download', (_event, item) => {
      // Never choose a remote-controlled path or open a downloaded file automatically.
      item.setSaveDialogOptions({
        defaultPath: path.join(
          app.getPath('downloads'),
          path.basename(item.getFilename().replace(/\\/g, '/')) || 'download',
        ),
      });
      const state: DownloadState = {
        id: crypto.randomUUID(),
        name: item.getFilename(),
        received: 0,
        total: item.getTotalBytes(),
        status: 'progressing',
        paused: false,
        canResume: false,
      };
      this.entries.set(state.id, { state, item });
      this.trim();
      const sync = () => {
        state.received = item.getReceivedBytes();
        state.total = item.getTotalBytes();
        state.paused = item.isPaused();
        state.canResume = item.canResume();
      };
      item.on('updated', (_event, status) => {
        sync();
        state.status = status;
        this.notify();
      });
      item.once('done', (_event, status) => {
        sync();
        state.status = status;
        state.path = item.getSavePath();
        this.trim();
        this.notify();
      });
      this.notify();
    });
  }
  private trim() {
    for (const [id, entry] of this.entries) {
      if (this.entries.size <= 100) break;
      if (
        ['completed', 'cancelled', 'interrupted'].includes(entry.state.status) &&
        !entry.state.canResume
      )
        this.entries.delete(id);
    }
  }
  async action(id: string, action: 'pause' | 'resume' | 'cancel' | 'open' | 'folder') {
    const entry = this.entries.get(id);
    if (!entry) return;
    const { item, state } = entry;
    if (action === 'pause' && state.status === 'progressing') item.pause();
    if (action === 'resume' && (state.paused || state.canResume)) item.resume();
    if (action === 'cancel' && state.status !== 'completed') item.cancel();
    if (state.status === 'completed' && state.path) {
      if (action === 'open') {
        const error = await shell.openPath(state.path);
        if (error) throw new Error(error);
      }
      if (action === 'folder') shell.showItemInFolder(state.path);
    }
    state.paused = item.isPaused();
    state.canResume = item.canResume();
    this.notify();
  }
  clear() {
    for (const [id, { state }] of this.entries)
      if (state.status !== 'progressing' && !state.canResume) this.entries.delete(id);
    this.changed();
  }
  stop() {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    for (const { item, state } of this.entries.values())
      if (state.status === 'progressing' || state.canResume) item.cancel();
  }
}

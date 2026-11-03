import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  shell: { openPath: vi.fn(async () => ''), showItemInFolder: vi.fn() },
}));
import { shell, type Session } from 'electron';
import { Downloads } from '../src/main/downloads';
it('solo abre rutas de descargas completadas, nunca un ID o archivo ajeno', async () => {
  const events = new EventEmitter();
  const manager = new Downloads(vi.fn());
  manager.attach(events as unknown as Session);
  const item = Object.assign(new EventEmitter(), {
    getFilename: () => '../../escaped.bin',
    getSavePath: () => '/tmp/chosen.bin',
    getTotalBytes: () => 20,
    getReceivedBytes: () => 20,
    canResume: () => false,
    isPaused: () => false,
    setSaveDialogOptions: vi.fn(),
    cancel: vi.fn(),
  });
  events.emit('will-download', {}, item);
  expect(item.setSaveDialogOptions).toHaveBeenCalledWith({ defaultPath: '/tmp/escaped.bin' });
  const id = manager.snapshot()[0].id;
  await manager.action('/etc/passwd', 'open');
  await manager.action(id, 'open');
  expect(shell.openPath).not.toHaveBeenCalled();
  item.emit('done', {}, 'completed');
  await manager.action(id, 'open');
  expect(shell.openPath).toHaveBeenCalledExactlyOnceWith('/tmp/chosen.bin');
  manager.clear();
  expect(manager.snapshot()).toEqual([]);
  manager.stop();
});

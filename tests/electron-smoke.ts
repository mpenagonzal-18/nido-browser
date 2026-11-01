import { app, BrowserWindow, session, webContents } from 'electron';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import path from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import type { State } from '../src/shared/types';
const started = Date.now();
app.setPath('userData', process.env.NIDO_SMOKE_PROFILE!);
app.getAppPath = () => path.resolve('.');
// Load the production build, not a substitute implementation.
createRequire(path.join(process.cwd(), 'dist/smoke.cjs'))('./main/index.js');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until<T>(fn: () => T | Promise<T>, label: string): Promise<NonNullable<T>> {
  for (let i = 0; i < 200; i++) {
    const value = await fn();
    if (value) return value as NonNullable<T>;
    await wait(50);
  }
  throw new Error(`Tiempo agotado: ${label}`);
}
const deadline = setTimeout(() => {
  console.error('Smoke timeout');
  app.exit(1);
}, 45000);
async function run() {
  await app.whenReady();
  const win = await until(
    () =>
      BrowserWindow.getAllWindows().find(
        (w) => w.webContents.getURL() === 'nido://app/' && !w.webContents.isLoading(),
      ),
    'ventana interna',
  );
  const js = (code: string) => win.webContents.executeJavaScript(code);
  const call = (action: string, payload?: unknown) =>
    js(`window.nido.call(${JSON.stringify(action)},${JSON.stringify(payload) ?? 'undefined'})`);
  const state = (): Promise<State> =>
    js(
      `new Promise(resolve=>{const off=window.nido.onState(s=>{off();resolve(s)});window.nido.call('state')})`,
    );
  const initial = await state();
  console.log(`UI lista: ${Date.now() - started} ms (perfil de prueba)`);
  const browsing = session.fromPartition('nido-browsing', { cache: false });
  const ai = session.fromPartition('persist:ai-sidebar', { cache: false });
  assert.equal(browsing.isPersistent(), false);
  assert.equal(ai.isPersistent(), true);
  assert.equal(initial.settings.historyEnabled, false);
  if (process.env.NIDO_SMOKE_STAGE === 'removed') {
    assert.equal(initial.settings.providers.length, 0);
    assert.equal((await ai.cookies.get({})).length, 0);
    console.log('PASS configuration change: removed provider data is cleared on startup');
    clearTimeout(deadline);
    app.exit(0);
    return;
  }
  if (process.env.NIDO_SMOKE_STAGE === 'restart') {
    assert.equal(initial.settings.accent, '#aabbcc');
    assert.equal((await browsing.cookies.get({})).length, 0);
    assert.equal(
      (await ai.cookies.get({ domain: '127.0.0.1' })).some((c) => c.name === 'ai-session'),
      true,
    );
    assert.equal((await ai.cookies.get({ domain: '127.0.0.2' })).length, 0);
    assert.equal(await js(`document.getElementById('audio').paused`), true);
    console.log(
      'PASS restart: settings and allowed AI cookie persist; browsing cookies do not; no autoplay',
    );
    const edited = JSON.parse(
      await readFile(path.join(app.getPath('userData'), 'settings.json'), 'utf8'),
    );
    edited.providers = [];
    await writeFile(path.join(app.getPath('userData'), 'settings.json'), JSON.stringify(edited));
    clearTimeout(deadline);
    app.exit(0);
    return;
  }
  assert.equal(webContents.getAllWebContents().length, 1, 'no remote views created at startup');
  const server = createServer((req, res) => {
    res.setHeader('Set-Cookie', 'httpCookie=secret; SameSite=Lax');
    if (req.url === '/echo') {
      res.end(JSON.stringify(req.headers));
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(
      `<html><title>Fixture Nido</title><body><div class="adsbygoogle-box" style="height:100px">Banner</div><h1>Navegación de prueba</h1><script>document.cookie='jsCookie=secret';localStorage.setItem('smoke','private');</script><script src="https://pagead2.googlesyndication.com/pagead/ads"></script><a href="http://127.0.0.2:${port}/external">External</a></body></html>`,
    );
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  await call('navigate', `http://127.0.0.2:${port}/`);
  const remote = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.getURL().startsWith(`http://127.0.0.2:${port}`) && !w.isLoading()),
    'página remota',
  );
  await until(async () => (await state()).tabs[0]?.blocked > 0, 'bloqueo de banner');
  assert.equal(await remote.executeJavaScript('document.cookie'), '');
  assert.equal(await remote.executeJavaScript('typeof window.nido'), 'undefined');
  assert.equal(await remote.executeJavaScript('typeof require'), 'undefined');
  assert.equal((await browsing.cookies.get({})).length, 0);
  const headers = JSON.parse(await remote.executeJavaScript(`fetch('/echo').then(r=>r.text())`));
  assert.equal(headers.cookie, undefined);
  assert.equal(headers.dnt, '1');
  assert.equal(headers['sec-gpc'], '1');
  assert.equal(headers.referer, `http://127.0.0.2:${port}/`);
  await until(
    async () =>
      await remote.executeJavaScript(
        `getComputedStyle(document.querySelector('.adsbygoogle-box')).display==='none'`,
      ),
    'CSS cosmético',
  );
  const before = remote.getURL();
  await remote.executeJavaScript(`location.href='file:///etc/passwd'`).catch(() => {});
  await wait(100);
  assert.equal(remote.getURL(), before);
  await call('new');
  assert.equal((await state()).tabs.length, 2);
  await call('activate', initial.active);
  assert.equal((await state()).active, initial.active);
  await call('settings', {
    ...(await state()).settings,
    providers: [{ id: 'local', name: 'Local', url: `http://127.0.0.1:${port}`, icon: 'L' }],
    accent: '#aabbcc',
  });
  await call('sidebar-toggle');
  const assistant = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.getURL().startsWith(`http://127.0.0.1:${port}`) && !w.isLoading()),
    'sidebar',
  );
  assert.equal(assistant.session, ai);
  assert.notEqual(assistant.session, remote.session);
  await until(
    async () => (await ai.cookies.get({ domain: '127.0.0.1' })).length > 0,
    'cookies permitidas',
  );
  await assistant.executeJavaScript(
    `fetch('http://127.0.0.2:${port}/echo',{credentials:'include',mode:'no-cors'})`,
  );
  assert.equal((await ai.cookies.get({ domain: '127.0.0.2' })).length, 0);
  await call('sidebar-toggle');
  const assistantId = assistant.id;
  await call('sidebar-toggle');
  assert.equal(webContents.fromId(assistantId)?.id, assistantId);
  await assistant.executeJavaScript(`document.querySelector('a').click()`);
  await until(async () => (await state()).tabs.length === 3, 'enlace externo en pestaña');
  assert.equal(assistant.getURL().startsWith(`http://127.0.0.1:${port}`), true);
  await call('clear-ai');
  assert.equal((await ai.cookies.get({})).length, 0);
  await call('sidebar-toggle');
  const ai2 = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.getURL().startsWith(`http://127.0.0.1:${port}`) && !w.isLoading()),
    'sidebar tras limpiar',
  );
  await ai2.executeJavaScript(`document.cookie='ai-session=keep; Max-Age=3600; SameSite=Lax'`);
  await ai.cookies.flushStore();
  const file = path.join(app.getPath('userData'), 'test.wav');
  const wav = Buffer.alloc(44 + 8000);
  wav.write('RIFF');
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(8000, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(8000, 40);
  wav.fill(128, 44);
  await writeFile(file, wav);
  const next = (await state()).settings;
  next.music.paths = [file];
  next.music.remember = true;
  await call('settings', next);
  await js(
    `document.getElementById('settings-toggle').click();document.querySelector('#settings-body input').focus()`,
  );
  const externalChange = (await state()).settings;
  externalChange.music.volume = 0.25;
  await call('settings', externalChange);
  await js(
    `(()=>{const label=[...document.querySelectorAll('#settings-body label')].find(el=>el.querySelector('span')?.textContent==='Tema');const select=label.querySelector('select');select.value='dark';select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  );
  await until(async () => (await state()).settings.theme === 'dark', 'edición de ajustes UI');
  assert.deepEqual((await state()).settings.music.paths, [file]);
  assert.equal((await state()).settings.music.volume, 0.25);
  await js(`document.getElementById('settings-close').click()`);
  const url = await call('media-url', file);
  assert.match(url, /^nido:\/\/app\/media\//);
  assert.equal(
    await js(`fetch(${JSON.stringify(url)}).then(r=>r.arrayBuffer()).then(b=>b.byteLength)`),
    wav.length,
  );
  await js(
    `document.querySelector('#music-controls button[aria-label="Reproducir / pausar"]').click()`,
  );
  await until(async () => await js(`!document.getElementById('audio').paused`), 'audio local');
  await call('new');
  assert.equal(await js(`document.getElementById('audio').paused`), false);
  assert.equal(
    JSON.parse(await readFile(path.join(app.getPath('userData'), 'settings.json'), 'utf8')).accent,
    '#aabbcc',
  );
  assert.equal((await readdir(app.getPath('userData'))).includes('history.json'), false);
  await browsing.clearStorageData();
  await ai.cookies.flushStore();
  // Screenshot is a reproducible real UI capture, stored only if explicitly requested.
  if (process.env.NIDO_SCREENSHOT) {
    for (const tab of (await state()).tabs.slice(1)) await call('close', tab.id);
    await call('home');
    if ((await state()).sidebar) await call('sidebar-toggle');
    const captureSettings = (await state()).settings;
    captureSettings.theme = 'dark';
    await call('settings', captureSettings);
    win.setContentSize(1280, 860);
    await wait(200);
    await writeFile(process.env.NIDO_SCREENSHOT, (await win.webContents.capturePage()).toPNG());
  }
  const temporaryCookies = (await state()).settings;
  temporaryCookies.allowSessionCookies = true;
  await call('settings', temporaryCookies);
  await browsing.cookies.set({
    url: `http://127.0.0.2:${port}`,
    name: 'temporary',
    value: 'secret',
    expirationDate: Date.now() / 1000 + 3600,
  });
  assert.equal((await browsing.cookies.get({ name: 'temporary' })).length, 1);
  server.close();
  console.log(
    'PASS Electron: tabs, headers, cookies, CSS/network banner blocking, isolated sidebar, external links, clear data, local audio',
  );
  clearTimeout(deadline);
  app.exit(0);
}
run().catch((error) => {
  console.error(error);
  clearTimeout(deadline);
  app.exit(1);
});

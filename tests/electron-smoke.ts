import { app, BrowserWindow, session, webContents, Menu, clipboard, dialog } from 'electron';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import path from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { storageState, seedStorage, nativeWorkerAttempt } from './integration/storage';
import { isAntiAdblockNotice, observeYoutubeNotice } from '../src/shared/youtube';
import type { State } from '../src/shared/types';
const started = Date.now();
app.setPath('userData', process.env.NIDO_SMOKE_PROFILE!);
app.getAppPath = () => path.resolve('.');
// Load the production build, not a substitute implementation.
createRequire(path.join(process.cwd(), 'dist/smoke.cjs'))('./main/index.js');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until<T>(fn: () => T | Promise<T>, label: string): Promise<NonNullable<T>> {
  for (let i = 0; i < 400; i++) {
    const value = await fn();
    if (value) return value as NonNullable<T>;
    await wait(50);
  }
  throw new Error(`Tiempo agotado: ${label}`);
}
const deadline = setTimeout(() => {
  console.error('Smoke timeout');
  app.exit(1);
}, 90000);
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
  if (process.env.NIDO_SMOKE_STAGE === 'first') {
    assert.equal(initial.settings.browsingMode, 'persistent');
    await call('settings', { ...initial.settings, browsingMode: 'strict' });
  }
  console.log(`UI lista: ${Date.now() - started} ms (perfil de prueba)`);
  const browsing = session.fromPartition('nido-browsing', { cache: false });
  const ai = session.fromPartition('persist:ai-sidebar', { cache: false });
  const regular = session.fromPartition('persist:nido-browsing', { cache: true });
  const sessionOnly = session.fromPartition('nido-session', { cache: true });
  assert.equal(regular.isPersistent(), true);
  assert.notEqual(regular.storagePath, null);
  assert.equal(sessionOnly.isPersistent(), false);
  assert.equal(browsing.isPersistent(), false);
  assert.equal(browsing.storagePath, null);
  const temporarySession = session.fromPartition('nido-compatible', { cache: true });
  assert.equal(temporarySession.isPersistent(), false);
  assert.equal(temporarySession.storagePath, null);
  assert.equal(ai.isPersistent(), true);
  assert.equal(initial.settings.historyEnabled, false);
  if (process.env.NIDO_SMOKE_STAGE === 'removed') {
    assert.equal(initial.settings.providers.length, 0);
    assert.equal(
      (await regular.cookies.get({ name: 'auth' })).length,
      0,
      'borrado manual persiste',
    );
    assert.equal((await ai.cookies.get({})).length, 0);
    console.log('PASS configuration change: removed provider data is cleared on startup');
    clearTimeout(deadline);
    assert.equal(initial.tabs.length, 1);
    app.once('will-quit', () => {
      assert.equal(BrowserWindow.getAllWindows().length, 0);
      console.log('PASS closing the only tab quits the browser');
    });
    void call('close', initial.active).catch(() => {});
    return;
  }
  if (process.env.NIDO_SMOKE_STAGE === 'restart') {
    assert.equal(initial.downloads.length, 0, 'registro de descargas no persiste');
    assert.equal(initial.settings.colorTheme, 'ocean');
    assert.equal(initial.settings.gradientPreset, 'ocean');
    assert.equal(initial.settings.language, 'en');
    assert.equal(initial.locale, 'en');
    assert.equal(await js('document.documentElement.lang'), 'en');
    assert.equal(initial.settings.accent, '#aabbcc');
    assert.equal((await browsing.cookies.get({})).length, 0);
    assert.equal(
      (await ai.cookies.get({ domain: '127.0.0.1' })).some((c) => c.name === 'ai-session'),
      true,
    );
    assert.equal((await ai.cookies.get({ domain: '127.0.0.2' })).length, 0);
    assert.equal((await ai.cookies.get({ domain: '127.0.0.3' })).length, 0);
    assert.equal(
      (await ai.cookies.get({})).every(
        (cookie) => cookie.domain?.replace(/^\./, '') === '127.0.0.1',
      ),
      true,
    );
    assert.equal(await js(`document.getElementById('audio').paused`), true);
    console.log(
      'PASS restart: settings and allowed AI cookie persist; browsing cookies do not; no autoplay',
    );
    assert.equal(initial.settings.browsingMode, 'persistent');
    assert.equal(
      (await regular.cookies.get({ name: 'auth' })).length,
      1,
      'cookie normal conservada entre reinicios',
    );
    assert.equal(
      (await sessionOnly.cookies.get({})).length,
      0,
      'perfil de sesión se borra al salir',
    );
    const savedPort = Number(
      await readFile(path.join(app.getPath('userData'), 'fixture-port'), 'utf8'),
    );
    const restartedServer = createServer((req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      if (req.url === '/tracker') {
        res.setHeader('Set-Cookie', 'tracker=bad; SameSite=None; Secure');
        res.end('tracker');
        return;
      }
      res.setHeader('Content-Type', 'text/html');
      res.end(
        req.headers.cookie?.includes('auth=fixture')
          ? '<title>Restored login</title>'
          : '<title>Login required</title>',
      );
    });
    await new Promise<void>((resolve) => restartedServer.listen(savedPort, resolve));
    await call('navigate', `http://127.0.0.2:${savedPort}/account?restart=1`);
    const restored = await until(
      () =>
        webContents
          .getAllWebContents()
          .find(
            (w) =>
              w.session === regular && w.getURL().includes('/account?restart=1') && !w.isLoading(),
          ),
      'login tras reinicio',
    );
    assert.equal(restored.getTitle(), 'Restored login');
    assert.equal(
      await restored.executeJavaScript(`localStorage.getItem('login-token')`),
      'fixture-token',
    );
    await restored.executeJavaScript(
      `fetch('http://127.0.0.3:${savedPort}/tracker',{mode:'no-cors',credentials:'include'})`,
    );
    assert.equal(
      (await regular.cookies.get({ domain: '127.0.0.3' })).length,
      0,
      'terceros bloqueados también con persistencia',
    );
    await call('clear-browsing-data');
    assert.equal((await regular.cookies.get({ name: 'auth' })).length, 0);
    const cleared = await until(
      () =>
        webContents
          .getAllWebContents()
          .find(
            (w) =>
              w.session === regular && w.getURL().includes('/account?restart=1') && !w.isLoading(),
          ),
      'borrado manual',
    );
    assert.equal(await cleared.executeJavaScript(`localStorage.getItem('login-token')`), null);
    assert.equal(
      (await ai.cookies.get({ name: 'ai-session' })).length,
      1,
      'borrado de navegación no toca IA',
    );
    console.log(
      'PASS persistent profile: cookies and storage restored across processes, third parties denied, explicit clear preserves AI',
    );
    restartedServer.close();
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
  const originalColor = await js(
    `getComputedStyle(document.querySelector('header')).backgroundColor`,
  );
  await js(`document.getElementById('settings-toggle').click()`);
  assert.equal(await js(`document.querySelectorAll('.theme-presets button').length`), 10);
  await js(`document.querySelectorAll('.theme-presets button')[1].click()`);
  await until(async () => (await state()).settings.colorTheme === 'ocean', 'tema océano');
  assert.notEqual(
    await js(`getComputedStyle(document.querySelector('header')).backgroundColor`),
    originalColor,
  );
  assert.equal(
    await js(`document.querySelector('.theme-presets button[aria-pressed=true]').textContent`),
    'Océano',
  );
  await js(`document.getElementById('settings-close').click()`);
  console.log('PASS ten theme tiles: selection repaints browser chrome and persists');
  const trackerCookies: string[] = [];
  let cacheRequests = 0;
  const downloadCookies: string[] = [];
  const server = createServer((req, res) => {
    if (req.url?.startsWith('/download')) {
      downloadCookies.push(req.headers.cookie ?? '');
      const size = 4 * 1024 * 1024;
      let offset = Number(req.headers.range?.match(/bytes=(\d+)-/)?.[1] ?? 0);
      if (offset) {
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${offset}-${size - 1}/${size}`);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="nido-fixture.bin"');
      res.setHeader('Content-Length', size - offset);
      const timer = setInterval(() => {
        const length = Math.min(65536, size - offset);
        if (length) {
          res.write(Buffer.alloc(length, 78));
          offset += length;
        }
        if (offset >= size) {
          clearInterval(timer);
          res.end();
        }
      }, 40);
      res.on('close', () => clearInterval(timer));
      return;
    }
    if (req.url === '/cache-resource') {
      cacheRequests++;
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end('cached resource');
      return;
    }
    if (req.url === '/login') {
      res.setHeader('Content-Type', 'text/html');
      res.end(
        `<title>Login</title><form><input name="username" autocomplete="username"><button>Entrar</button></form><script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();const r=await fetch('/authenticate',{method:'POST',credentials:'include'});const data=await r.json();localStorage.setItem('login-token',data.token);location.href='/account'}</script>`,
      );
      return;
    }
    if (req.url === '/authenticate') {
      res.setHeader('Set-Cookie', 'auth=fixture; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ token: 'fixture-token' }));
      return;
    }
    if (req.url === '/account') {
      res.setHeader('Content-Type', 'text/html');
      res.end(
        req.headers.cookie?.includes('auth=fixture')
          ? '<title>Signed in</title><h1>Sesión iniciada</h1>'
          : '<title>Login required</title>',
      );
      return;
    }
    if (req.url === '/blank') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<title>Storage observer</title>');
      return;
    }
    if (req.url === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end("self.addEventListener('fetch',()=>{})");
      return;
    }
    if (req.url?.startsWith('/tracker')) {
      trackerCookies.push(req.headers.cookie ?? '');
      res.setHeader('Set-Cookie', 'thirdPartyHeader=tracker; SameSite=None; Secure; Path=/');
      res.setHeader('Content-Type', 'text/html');
      res.end(
        `<script>document.cookie='thirdPartyJS=tracker; SameSite=None; Secure; Path=/';parent.postMessage({trackerCookie:document.cookie,hasRequire:typeof require,hasProcess:typeof process,hasBridge:typeof window.nido},'*')</script>`,
      );
      return;
    }

    res.setHeader('Set-Cookie', 'httpCookie=secret; SameSite=Lax');
    if (req.url === '/echo') {
      res.end(JSON.stringify(req.headers));
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(
      `<html><title>Fixture Nido</title><body><div class="adsbygoogle-box" style="height:100px">Banner</div><h1>Navegación de prueba</h1><script>
window.fixtureDone=false;window.attempts={};
(async()=>{
 for(const [name,run] of Object.entries({
  documentCookie:()=>{document.cookie='jsCookie=secret';return document.cookie},
  cookieStore:()=>window.cookieStore?cookieStore.set('storeCookie','secret'):'unavailable',
  localStorage:()=>localStorage.setItem('smoke','private'),
  sessionStorage:()=>sessionStorage.setItem('smoke','private'),
  indexedDB:()=>indexedDB.open('page-attempt'),
  caches:()=>caches.open('page-attempt'),
  serviceWorker:()=>navigator.serviceWorker?navigator.serviceWorker.register('/sw.js'):'unavailable'
 })) {try{window.attempts[name]=await run()??'allowed'}catch(error){window.attempts[name]=error.name}}
 window.fixtureDone=true;
})();</script><script src="https://pagead2.googlesyndication.com/pagead/ads"></script><a href="http://127.0.0.2:${port}/external">External</a></body></html>`,
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
  const addressPoint = await js(
    `(()=>{const r=document.getElementById('address').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`,
  );
  remote.focus();
  await wait(30);
  win.webContents.focus();
  const clickAddress = () => {
    win.webContents.sendInputEvent({
      type: 'mouseDown',
      button: 'left',
      clickCount: 1,
      ...addressPoint,
    });
    win.webContents.sendInputEvent({
      type: 'mouseUp',
      button: 'left',
      clickCount: 1,
      ...addressPoint,
    });
  };
  clickAddress();
  await wait(30);
  assert.equal(
    await js(
      `(()=>{const i=document.getElementById('address');return i.selectionStart===0&&i.selectionEnd===i.value.length})()`,
    ),
    true,
    'primer clic selecciona toda la dirección',
  );
  clickAddress();
  await wait(30);
  assert.equal(
    await js(
      `(()=>{const i=document.getElementById('address');return i.selectionStart===i.selectionEnd})()`,
    ),
    true,
    'segundo clic permite colocar el cursor',
  );
  remote.focus();
  await wait(30);
  win.webContents.focus();
  clickAddress();
  await wait(30);
  assert.equal(
    await js(
      `(()=>{const i=document.getElementById('address');return i.selectionStart===0&&i.selectionEnd===i.value.length})()`,
    ),
    true,
    'volver de una página también selecciona al primer clic',
  );
  console.log(
    'PASS address: real first click selects all, later clicks place caret, refocus selects again',
  );
  await remote.executeJavaScript(`fetch('/cache-resource').then(r=>r.text())`);
  await remote.executeJavaScript(`fetch('/cache-resource').then(r=>r.text())`);
  assert.equal(cacheRequests, 1, 'caché de red en memoria reutilizada');
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
  await until(
    async () => await remote.executeJavaScript('window.fixtureDone'),
    'intentos de almacenamiento',
  );
  const attempts = await remote.executeJavaScript('window.attempts');
  for (const key of ['localStorage', 'sessionStorage', 'indexedDB', 'caches'])
    assert.equal(attempts[key], 'SecurityError', key);
  assert.equal(attempts.cookieStore, 'unavailable');
  assert.equal(attempts.serviceWorker, 'unavailable');
  assert.deepEqual(await storageState(remote), {
    local: [],
    session: [],
    databases: [],
    caches: [],
    workers: [],
  });
  await browsing.cookies.set({
    url: `http://127.0.0.2:${port}`,
    name: 'injected-cookie',
    value: 'private',
  });
  await until(
    async () => (await browsing.cookies.get({})).length === 0,
    'borrado por cookies.changed',
  );
  assert.notEqual(await nativeWorkerAttempt(remote), 'registered');
  assert.deepEqual(browsing.serviceWorkers.getAllRunning(), {});
  await seedStorage(remote);
  assert.deepEqual((await storageState(remote)).databases, ['native-seed']);
  await until(
    async () => Object.values(await storageState(remote)).every((list) => list.length === 0),
    'limpieza periódica nativa',
  );
  await remote.executeJavaScript(`fetch('/cache-resource').then(r=>r.text())`);
  assert.equal(cacheRequests, 1, 'barrida de almacenamiento no vacía caché de red');
  console.log(
    'PASS storage: document APIs denied, cookie event cleanup, worker transport denied, periodic native-store cleanup',
  );

  // Keep a legitimate first-party tab open on another site. Its cookies must not
  // travel when that site becomes an iframe/fetch target of the original tab.
  await call('settings', { ...(await state()).settings, allowSessionCookies: true });
  await until(
    async () => !remote.isLoading() && (await remote.executeJavaScript('window.fixtureDone')),
    'cookies propias activadas',
  );
  await remote.executeJavaScript("document.cookie='firstParty=allowed; SameSite=Lax'");
  const firstPartyHeaders = JSON.parse(
    await remote.executeJavaScript("fetch('/echo',{credentials:'include'}).then(r=>r.text())"),
  );
  assert.match(firstPartyHeaders.cookie ?? '', /firstParty=allowed/);
  const trackerTab = await call('new').then(async () => (await state()).active);
  await call('navigate', `http://127.0.0.3:${port}/`);
  const tracker = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.getURL().startsWith(`http://127.0.0.3:${port}/`) && !w.isLoading()),
    'primera parte del tracker',
  );
  await until(
    async () =>
      (await browsing.cookies.get({ domain: '127.0.0.3' })).some((c) => c.name === 'httpCookie'),
    'cookie propia válida',
  );
  await call('activate', initial.active);
  await remote.executeJavaScript(
    `fetch('http://127.0.0.3:${port}/tracker-fetch',{mode:'no-cors',credentials:'include'})`,
  );
  await remote.executeJavaScript(
    `new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Tracker frame did not answer')),10000);const handler=e=>{if(e.origin==='http://127.0.0.3:${port}'&&'trackerCookie' in e.data){clearTimeout(timeout);window.removeEventListener('message',handler);window.trackerCookie=e.data.trackerCookie;window.trackerSecurity=e.data;resolve()}};window.addEventListener('message',handler);const frame=document.createElement('iframe');frame.src='http://127.0.0.3:${port}/tracker-frame';document.body.append(frame)})`,
  );
  assert.equal(await remote.executeJavaScript('window.trackerCookie'), '');
  const frameSecurity = await remote.executeJavaScript('window.trackerSecurity');
  for (const key of ['hasRequire', 'hasProcess', 'hasBridge'])
    assert.equal(frameSecurity[key], 'undefined');
  // Electron exposes this native test introspection without a public TS type.
  const preferences = (
    remote as typeof remote & { getLastWebPreferences(): Electron.WebPreferences }
  ).getLastWebPreferences();
  assert.equal(preferences.sandbox, true);
  assert.equal(preferences.nodeIntegration, false);
  assert.equal(preferences.contextIsolation, true);
  assert.equal(trackerCookies.length, 2);
  assert.equal(
    trackerCookies.every((cookie) => cookie === ''),
    true,
    'terceros nunca reciben cookies',
  );
  assert.equal(
    (await browsing.cookies.get({ domain: '127.0.0.3' })).some((c) =>
      c.name.startsWith('thirdParty'),
    ),
    false,
  );
  await seedStorage(tracker);
  assert.deepEqual((await storageState(tracker)).caches, ['native-seed']);
  await call('close', trackerTab);
  assert.equal(
    (await browsing.cookies.get({ domain: '127.0.0.3' })).length,
    0,
    'cookie de origen eliminado al cerrar',
  );
  await call('new');
  const observerId = (await state()).active;
  await call('navigate', `http://127.0.0.3:${port}/blank`);
  const observer = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.getURL() === `http://127.0.0.3:${port}/blank` && !w.isLoading()),
    'origen cerrado',
  );
  assert.deepEqual(await storageState(observer), {
    local: [],
    session: [],
    databases: [],
    caches: [],
    workers: [],
  });
  await call('close', observerId);
  await call('settings', { ...(await state()).settings, allowSessionCookies: false });
  await until(
    async () => !remote.isLoading() && (await remote.executeJavaScript('window.fixtureDone')),
    'modo estricto restaurado',
  );
  console.log('PASS first-party-only cookies and per-tab origin cleanup');
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
  await ai.cookies.set({
    url: `http://127.0.0.3:${port}`,
    name: 'tracker-injected',
    value: 'private',
  });
  await until(
    async () => (await ai.cookies.get({ domain: '127.0.0.3' })).length === 0,
    'cookie ajena de sidebar eliminada',
  );
  assert.equal(
    (await ai.cookies.get({})).every((cookie) => cookie.domain?.replace(/^\./, '') === '127.0.0.1'),
    true,
  );
  assert.equal(
    await assistant.executeJavaScript("localStorage.getItem('smoke')"),
    'private',
    'almacenamiento de proveedor permitido',
  );
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
  await call('navigate', `http://127.0.0.2:${port}/login`);
  const loginId = (await state()).active;
  await until(
    async () => await js(`!document.getElementById('privacy-toggle').disabled`),
    'botón de compatibilidad listo',
  );
  await js(`document.getElementById('privacy-toggle').click()`);
  await until(async () => (await state()).compatible, 'compatibilidad activada explícitamente');
  const loginView = await until(
    () =>
      webContents
        .getAllWebContents()
        .find(
          (w) =>
            w.session === temporarySession &&
            w.getURL() === `http://127.0.0.2:${port}/login` &&
            !w.isLoading(),
        ),
    'vista compatible',
  );
  await loginView.executeJavaScript(`document.querySelector('form').requestSubmit()`);
  await until(
    () => loginView.getURL() === `http://127.0.0.2:${port}/account` && !loginView.isLoading(),
    'login temporal',
  );
  assert.equal(loginView.getTitle(), 'Signed in');
  assert.equal(
    await loginView.executeJavaScript(`localStorage.getItem('login-token')`),
    'fixture-token',
  );
  assert.equal((await browsing.cookies.get({ name: 'auth' })).length, 0, 'sesión estricta aislada');
  loginView.reload();
  await until(
    () => !loginView.isLoading() && loginView.getTitle() === 'Signed in',
    'login conservado al recargar',
  );
  await loginView.executeJavaScript(
    `fetch('http://127.0.0.3:${port}/tracker-fetch',{mode:'no-cors',credentials:'include'})`,
  );
  assert.equal(trackerCookies.at(-1), '');
  assert.equal((await temporarySession.cookies.get({ domain: '127.0.0.3' })).length, 0);
  await call('new');
  const strictObserverId = (await state()).active;
  await call('navigate', `http://127.0.0.4:${port}/blank`);
  const strictObserver = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.getURL() === `http://127.0.0.4:${port}/blank` && !w.isLoading()),
    'observador estricto',
  );
  assert.equal(strictObserver.session, browsing);
  await seedStorage(strictObserver);
  await until(
    async () =>
      Object.values(await storageState(strictObserver)).every((list) => list.length === 0),
    'barrida estricta con login compatible vivo',
  );
  assert.equal(
    await loginView.executeJavaScript(`localStorage.getItem('login-token')`),
    'fixture-token',
    'la barrida no rompe el login compatible',
  );
  assert.equal((await temporarySession.cookies.get({ name: 'auth' })).length, 1);
  for (const tab of (await state()).tabs)
    if (tab.id !== loginId && tab.url.startsWith(`http://127.0.0.2:${port}`))
      await call('close', tab.id);
  assert.equal(
    (await temporarySession.cookies.get({ name: 'auth' })).length,
    1,
    'otra pestaña del sitio no cierra el login',
  );
  await call('close', loginId);
  assert.equal(
    (await temporarySession.cookies.get({ name: 'auth' })).length,
    0,
    'última pestaña borra el login',
  );
  await call('activate', strictObserverId);
  await call('navigate', `http://127.0.0.2:${port}/blank`);
  const cleared = await until(
    () =>
      webContents
        .getAllWebContents()
        .find(
          (w) =>
            w.session === temporarySession &&
            w.getURL() === `http://127.0.0.2:${port}/blank` &&
            !w.isLoading(),
        ),
    'origen compatible limpio',
  );
  assert.equal(await cleared.executeJavaScript(`localStorage.getItem('login-token')`), null);
  await call('settings', { ...(await state()).settings, compatibilitySites: [] });
  console.log(
    'PASS compatibility: opt-in login, reload, isolation, no third-party cookies, survives strict sweep, clears on last tab',
  );
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
  await call('navigate', `http://127.0.0.2:${port}/blank`);
  await until(
    () =>
      webContents
        .getAllWebContents()
        .some((w) => w.getURL() === `http://127.0.0.2:${port}/blank` && !w.isLoading()),
    'origen de cookie temporal',
  );
  await browsing.cookies.set({
    url: `http://127.0.0.2:${port}`,
    name: 'temporary',
    value: 'secret',
    expirationDate: Date.now() / 1000 + 3600,
  });
  assert.equal((await browsing.cookies.get({ name: 'temporary' })).length, 1);
  await writeFile(path.join(app.getPath('userData'), 'fixture-port'), String(port));
  await call('settings', { ...(await state()).settings, browsingMode: 'session' });
  await call('navigate', `http://127.0.0.2:${port}/login`);
  const memoryLogin = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.session === sessionOnly && w.getURL().endsWith('/login') && !w.isLoading()),
    'cookies globales de sesión',
  );
  await memoryLogin.executeJavaScript(`document.querySelector('form').requestSubmit()`);
  await until(
    () => memoryLogin.getTitle() === 'Signed in' && !memoryLogin.isLoading(),
    'login global de sesión',
  );
  const memoryTabId = (await state()).active;
  await call('close', memoryTabId);
  assert.equal(
    (await sessionOnly.cookies.get({ name: 'auth' })).length,
    1,
    'cerrar pestaña no borra sesión global',
  );
  await call('new');
  await call('navigate', `http://127.0.0.2:${port}/account`);
  const memoryAgain = await until(
    () =>
      webContents
        .getAllWebContents()
        .find(
          (w) => w.session === sessionOnly && w.getURL().endsWith('/account') && !w.isLoading(),
        ),
    'reabrir sitio sin activar Temporal',
  );
  assert.equal(memoryAgain.getTitle(), 'Signed in');
  await call('settings', { ...(await state()).settings, browsingMode: 'persistent' });
  assert.equal((await regular.cookies.get({ name: 'auth' })).length, 0, 'perfiles separados');
  await call('navigate', `http://127.0.0.2:${port}/login`);
  const permanentLogin = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.session === regular && w.getURL().endsWith('/login') && !w.isLoading()),
    'perfil permanente',
  );
  await permanentLogin.executeJavaScript(`document.querySelector('form').requestSubmit()`);
  await until(
    () => permanentLogin.getTitle() === 'Signed in' && !permanentLogin.isLoading(),
    'login permanente',
  );
  await call('navigate', `http://127.0.0.4:${port}/blank`);
  await call('navigate', `http://127.0.0.2:${port}/account`);
  const account = await until(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.session === regular && w.getURL().endsWith('/account') && !w.isLoading()),
    'visitar otra página y volver',
  );
  assert.equal(account.getTitle(), 'Signed in');
  assert.equal(
    await account.executeJavaScript(`localStorage.getItem('login-token')`),
    'fixture-token',
  );
  assert.equal(
    await js(`document.getElementById('privacy-toggle').textContent`),
    'Cookies activadas',
  );
  assert.equal((await sessionOnly.cookies.get({ name: 'auth' })).length, 1);
  console.log(
    'PASS global profiles: no per-site toggle, login survives closed tab and cross-site navigation, persistent profile separate from session and AI',
  );
  // Capture real native menu construction without opening a blocking OS popup.
  const menus: Menu[] = [];
  const originalPopup = Menu.prototype.popup;
  Menu.prototype.popup = function () {
    menus.push(this);
  };
  const rightClick = async (selector: string) => {
    const rect = await js(
      `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2)}; })()`,
    );
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'right', clickCount: 1, ...rect });
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'right', clickCount: 1, ...rect });
    return until(() => menus.pop(), 'menú contextual nativo');
  };
  try {
    await clipboard.writeText(`http://127.0.0.2:${port}/account?paste=1`);
    await js(`document.getElementById('address').focus()`);
    const addressMenu = await rightClick('#address');
    const paste = addressMenu.items.find((item) => item.label === 'Pegar y acceder');
    assert.ok(paste?.enabled);
    paste.click(paste, win, {} as Electron.KeyboardEvent);
    await until(async () => {
      const s = await state();
      return s.tabs.find((t) => t.id === s.active)?.url.endsWith('/account?paste=1');
    }, 'pegar y acceder');
    assert.equal(
      await js(`document.getElementById('address').value`),
      `http://127.0.0.2:${port}/account?paste=1`,
      'pegar y acceder actualiza la dirección aunque el campo tenga foco',
    );
    const before = await state();
    const tabMenu = await rightClick('.tab.active');
    assert.ok(tabMenu.items.some((item) => item.label === 'Cerrar pestaña'));
    const duplicate = tabMenu.items.find((item) => item.label === 'Duplicar pestaña')!;
    duplicate.click(duplicate, win, {} as Electron.KeyboardEvent);
    await until(
      async () => (await state()).tabs.length === before.tabs.length + 1,
      'duplicar pestaña',
    );
    const duplicateId = (await state()).active;
    await call('close', duplicateId);
    await call('navigate', `http://127.0.0.2:${port}/account`);
  } finally {
    Menu.prototype.popup = originalPopup;
  }
  console.log(
    'PASS native context menus: right click address, paste-and-go, tab duplicate and close',
  );

  const downloadFile = path.join(app.getPath('userData'), 'download-fixture.bin');
  let downloadIndex = 0;
  regular.on('will-download', (_event, item) => {
    item.setSavePath(
      downloadIndex++ === 0
        ? downloadFile
        : path.join(app.getPath('userData'), 'cancel-fixture.bin'),
    );
  });
  account.downloadURL(`http://127.0.0.2:${port}/download`);
  const transfer = await until(
    async () => (await state()).downloads.find((d) => d.received > 0 && d.status === 'progressing'),
    'descarga con progreso',
  );
  await js(`document.getElementById('downloads-toggle').click()`);
  await until(
    () =>
      js(
        `!document.getElementById('downloads').hidden && document.querySelectorAll('.download-row').length === 1`,
      ),
    'panel descargas',
  );
  await call('download', { id: transfer.id, action: 'pause' });
  await until(
    async () => (await state()).downloads.find((d) => d.id === transfer.id)?.paused,
    'pausar descarga',
  );
  const originalDialog = dialog.showMessageBox;
  dialog.showMessageBox = (async () => ({
    response: 0,
    checkboxChecked: false,
  })) as typeof dialog.showMessageBox;
  win.close();
  await wait(50);
  assert.equal(win.isDestroyed(), false, 'cancelar cierre conserva ventana');
  dialog.showMessageBox = originalDialog;
  await call('download', { id: transfer.id, action: 'resume' });
  await until(
    async () => (await state()).downloads.find((d) => d.id === transfer.id)?.status === 'completed',
    'completar descarga',
  );
  assert.ok(downloadCookies[0]?.includes('auth=fixture'), 'descarga propia conserva autenticación');
  const downloaded = await readFile(downloadFile);
  assert.equal(downloaded.length, 4 * 1024 * 1024);
  assert.ok(
    downloaded.every((byte) => byte === 78),
    'archivo íntegro tras pausa/reanudación',
  );
  account.downloadURL(`http://127.0.0.2:${port}/download?cancel=1`);
  const cancelled = await until(
    async () =>
      (await state()).downloads.find((d) => d.id !== transfer.id && d.status === 'progressing'),
    'segunda descarga',
  );
  await call('download', { id: cancelled.id, action: 'cancel' });
  await until(
    async () =>
      (await state()).downloads.find((d) => d.id === cancelled.id)?.status === 'cancelled',
    'cancelar descarga',
  );
  await assert.rejects(
    () => call('download', { id: '../bad', action: 'open' }),
    'IPC de descargas valida IDs',
  );
  await call('clear-downloads');
  await until(async () => (await state()).downloads.length === 0, 'limpiar registro');
  assert.equal(
    (await readFile(downloadFile)).length,
    4 * 1024 * 1024,
    'limpiar registro no borra archivos',
  );
  await js(`document.getElementById('downloads-close').click()`);
  console.log(
    'PASS real download manager: progress, pause/resume, full file integrity, cancel, close prompt and clear-without-deleting',
  );

  const detected = await js(`(async () => {
    const isAntiAdblockNotice = ${isAntiAdblockNotice.toString()};
    let reports = 0;
    const stop = (${observeYoutubeNotice.toString()})(() => reports++);
    const article = document.createElement('p');
    article.textContent = 'Ad blockers are not allowed on YouTube';
    document.body.append(article);
    const notice = document.createElement('ytd-enforcement-message-view-model');
    notice.style.cssText = 'display:block;position:fixed;top:0;left:0;width:400px;height:80px';
    notice.hidden = true;
    notice.textContent = article.textContent;
    document.body.append(notice);
    await new Promise(r => setTimeout(r, 400));
    if (reports !== 0) throw new Error('Hidden notice or arbitrary text triggered detection');
    notice.hidden = false;
    await new Promise(r => setTimeout(r, 400));
    notice.textContent += ' Disable ad blocking';
    await new Promise(r => setTimeout(r, 400));
    stop(); notice.remove(); article.remove();
    return reports;
  })()`);
  assert.equal(detected, 1, 'aviso visible detectado una sola vez en DOM real');
  await call('settings', { ...(await state()).settings, language: 'en' });
  await until(
    () =>
      js(
        `document.documentElement.lang === 'en' && document.getElementById('settings-title').textContent === 'Settings'`,
      ),
    'idioma inglés en vivo',
  );
  assert.equal((await state()).locale, 'en');
  assert.equal(
    (await regular.cookies.get({ name: 'auth' })).length,
    1,
    'cambiar idioma conserva login',
  );
  console.log(
    'PASS localization and real DOM YouTube detection: hidden/arbitrary text ignored, visible warning reports once',
  );
  // Intercept HTTPS in the test profile: exercise the real sandboxed YouTube
  // preload and IPC without contacting YouTube or any third-party server.
  let youtubeLoads = 0;
  regular.protocol.handle('https', () => {
    youtubeLoads++;
    return new Response(
      '<!doctype html><style>ytd-enforcement-message-view-model{display:block;width:500px;height:100px}</style><ytd-enforcement-message-view-model>Ad blockers violate YouTube terms of service</ytd-enforcement-message-view-model>',
      { headers: { 'Content-Type': 'text/html' } },
    );
  });
  try {
    await call('navigate', 'https://www.youtube.com/watch?v=local-fixture');
    await until(async () => (await state()).youtubePaused, 'pausa desde preload real de YouTube');
    await until(() => youtubeLoads >= 2, 'una recarga con bloqueo pausado');
    await wait(1000);
    assert.equal(youtubeLoads, 2, 'sin bucle de recargas del aviso');
    assert.equal((await regular.cookies.get({ name: 'auth' })).length, 1);
    await call('navigate', `http://127.0.0.2:${port}/account`);
  } finally {
    regular.protocol.unhandle('https');
  }
  console.log(
    'PASS production YouTube preload and IPC: automatic pause, one reload, no session deletion, all HTTPS served locally',
  );
  server.close();
  console.log(
    'PASS Electron: tabs, headers, cookies, CSS/network banner blocking, isolated sidebar, external links, clear data, local audio',
  );
  app.once('will-quit', (event) => {
    event.preventDefault();
    void (async () => {
      assert.equal((await browsing.cookies.get({})).length, 0, 'limpieza completa antes de salir');
      assert.deepEqual(browsing.serviceWorkers.getAllRunning(), {});
      assert.equal((await temporarySession.cookies.get({})).length, 0);
      assert.equal((await sessionOnly.cookies.get({})).length, 0);
      assert.equal(
        (await regular.cookies.get({ name: 'auth' })).length,
        1,
        'cierre no borra cookies permanentes',
      );
      console.log('PASS graceful quit: browsing storage cleared before application exit');
      // All production windows are closed. Seed a legacy on-disk tracker cookie
      // solely to test startup recovery, after removing its fixture-session guard.
      ai.cookies.removeAllListeners('changed');
      await ai.cookies.set({
        url: `http://127.0.0.3:${port}`,
        name: 'legacy-tracker',
        value: 'private',
        expirationDate: Date.now() / 1000 + 3600,
      });
      await ai.cookies.flushStore();
      clearTimeout(deadline);
      app.exit(0);
    })().catch((error) => {
      console.error(error);
      clearTimeout(deadline);
      app.exit(1);
    });
  });
  void call('quit').catch(() => {});
}
run().catch((error) => {
  console.error(error);
  clearTimeout(deadline);
  app.exit(1);
});

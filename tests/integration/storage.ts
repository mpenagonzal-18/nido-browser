import type { WebContents } from 'electron';

// This privileged isolated world is accessible only to the Electron test runner.
// It verifies Chromium's real stores, not the overridden properties seen by pages.
export function storageState(contents: WebContents) {
  return contents.executeJavaScriptInIsolatedWorld(777, [
    {
      code: `(async()=>({
    local: Object.keys(localStorage), session: Object.keys(sessionStorage),
    databases: (await indexedDB.databases()).map(db=>db.name),
    caches: await caches.keys(),
    workers: navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).map(r=>r.scope) : []
  }))()`,
    },
  ]) as Promise<{
    local: string[];
    session: string[];
    databases: string[];
    caches: string[];
    workers: string[];
  }>;
}
export function seedStorage(contents: WebContents) {
  return contents.executeJavaScriptInIsolatedWorld(777, [
    {
      code: `(async()=>{
    localStorage.setItem('native-seed','private'); sessionStorage.setItem('native-seed','private');
    await new Promise((resolve,reject)=>{const r=indexedDB.open('native-seed',1);r.onupgradeneeded=()=>r.result.createObjectStore('items');r.onsuccess=()=>{r.result.close();resolve()};r.onerror=()=>reject(r.error)});
    const cache=await caches.open('native-seed'); await cache.put('/cached-seed',new Response('private'));
  })()`,
    },
  ]);
}
export function nativeWorkerAttempt(contents: WebContents) {
  return contents.executeJavaScriptInIsolatedWorld(777, [
    {
      code: `(async()=>{
    if(!navigator.serviceWorker) return 'unavailable';
    try{await navigator.serviceWorker.register('/sw.js');return 'registered'}catch{return 'denied'}
  })()`,
    },
  ]);
}

import { build } from 'esbuild';
import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist/renderer', { recursive: true });
await Promise.all([
  build({ entryPoints: ['src/main/index.ts'], outfile: 'dist/main/index.js', bundle: true, platform: 'node', format: 'cjs', external: ['electron'], sourcemap: true }),
  build({ entryPoints: ['src/preload/index.ts'], outfile: 'dist/preload/index.js', bundle: true, platform: 'node', format: 'cjs', external: ['electron'] }),
  build({ entryPoints: ['src/renderer/index.ts'], outfile: 'dist/renderer/index.js', bundle: true, platform: 'browser', minify: true, metafile: true }).then(async r => { const { writeFile } = await import('node:fs/promises'); await writeFile('dist/bundle-meta.json', JSON.stringify(r.metafile)); }),
]);
await cp('src/renderer/index.html', 'dist/renderer/index.html');
await cp('src/renderer/style.css', 'dist/renderer/style.css');

import { build } from 'esbuild';
import { mkdir, cp, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/renderer', { recursive: true });
await Promise.all([
  build({
    entryPoints: ['src/main/index.ts'],
    outfile: 'dist/main/index.js',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    external: ['electron'],
    sourcemap: true,
  }),
  build({
    entryPoints: [
      'src/preload/index.ts',
      'src/preload/cookies.ts',
      'src/preload/session-cookies.ts',
      'src/preload/temporary-site.ts',
    ],
    outdir: 'dist/preload',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
  }),
  build({
    entryPoints: ['src/renderer/index.ts'],
    outfile: 'dist/renderer/index.js',
    bundle: true,
    platform: 'browser',
    minify: true,
    metafile: true,
  }).then(async (r) => {
    const { writeFile } = await import('node:fs/promises');
    await writeFile('dist/bundle-meta.json', JSON.stringify(r.metafile));
  }),
]);
await cp('src/renderer/index.html', 'dist/renderer/index.html');
await cp('src/renderer/style.css', 'dist/renderer/style.css');

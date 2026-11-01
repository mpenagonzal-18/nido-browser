import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
await build({
  entryPoints: ['tests/electron-smoke.ts'],
  outfile: 'dist/smoke.cjs',
  platform: 'node',
  format: 'cjs',
  bundle: true,
  packages: 'external',
});
const profile = await mkdtemp(path.join(tmpdir(), 'nido-smoke-'));
try {
  for (const stage of ['first', 'restart', 'removed']) {
    const args = ['dist/smoke.cjs'];
    if (process.platform === 'linux' && !process.env.DISPLAY)
      args.push('--ozone-platform=headless', '--disable-gpu');
    const child = spawn(require('electron'), args, {
      stdio: 'inherit',
      env: { ...process.env, NIDO_SMOKE_PROFILE: profile, NIDO_SMOKE_STAGE: stage },
    });
    const code = await new Promise((resolve) => {
      child.on('error', () => resolve(1));
      child.on('exit', (code) => resolve(code ?? 1));
    });
    if (code !== 0) {
      process.exitCode = Number(code);
      break;
    }
  }
} finally {
  await rm(profile, { recursive: true, force: true });
}

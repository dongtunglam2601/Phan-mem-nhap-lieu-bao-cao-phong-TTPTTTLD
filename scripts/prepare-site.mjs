import { mkdir, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('public', { recursive: true });
await copyFile('index.html', 'public/index.html');
await build({ entryPoints: ['src/backup-ui.js'], bundle: true, format: 'esm', platform: 'browser', outfile: 'public/backup.js' });

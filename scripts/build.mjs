import { build, loadEnv } from 'vite';
import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';

// A local development .env must never silently put localhost into a release.
const productionEnv = existsSync('.env.production') || existsSync('.env.production.local')
  ? loadEnv('production', process.cwd(), 'VITE_') : {};
process.env.VITE_API_BASE_URL ??= productionEnv.VITE_API_BASE_URL || '/api/v1';
process.env.VITE_SOCKET_URL ??= productionEnv.VITE_SOCKET_URL || '';
const api = process.env.VITE_API_BASE_URL;
if (process.env.CF_PAGES && api === '/api/v1') {
  throw new Error('Cloudflare Pages needs VITE_API_BASE_URL=https://api.sifit.id.vn/api/v1 in its build environment. Relative API URLs require a backend proxy.');
}
const publicHTTPS = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); }
  catch { return false; }
};
if (api !== '/api/v1' && !publicHTTPS(api)) {
  throw new Error('Release API URL must be /api/v1 or an HTTPS URL. Do not publish a localhost build.');
}
if (process.env.VITE_SOCKET_URL && !publicHTTPS(process.env.VITE_SOCKET_URL)) {
  throw new Error('Release socket URL must be HTTPS or empty for the API origin.');
}
await build();
await mkdir('dist', { recursive: true });
for (const asset of ['favicon.svg', 'icons.svg']) await copyFile(`public/${asset}`, `dist/${asset}`);

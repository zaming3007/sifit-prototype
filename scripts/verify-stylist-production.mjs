import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';

// Real production routes, auth and MongoDB; only the paid FASHN provider is simulated.
const backend = path.resolve('../Sifit-backend');
const requireBackend = createRequire(path.join(backend, 'package.json'));
Object.assign(process.env, { NODE_ENV: 'test', TRYON_MODE: 'live', FASHN_API_KEY: 'test-only-provider', SOCKET_IO_ENABLED: 'false', FRONTEND_URL: 'http://localhost:5190', SOCKET_CORS_ORIGIN: 'http://localhost:5190', VITE_API_BASE_URL: 'http://localhost:5019/api/v1', VITE_SOCKET_URL: 'http://localhost:5019' });
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server');
const mongoose = requireBackend('mongoose');
const sharp = requireBackend('sharp');
const argon2 = requireBackend('argon2');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = mongo.getUri();
const nativeFetch = globalThis.fetch;
let server, vite, browser, submissions = 0, polls = 0;
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const app = requireBackend('./src/app');
  const User = requireBackend('./src/models/user.model');
  const Category = requireBackend('./src/models/category.model');
  const Product = requireBackend('./src/models/product.model');
  const Job = requireBackend('./src/models/stylistJob.model');
  await Promise.all([User.init(), Category.init(), Product.init(), Job.init()]);
  const passwordHash = await argon2.hash('StylistTest123!');
  const [, seller] = await User.create([
    { fullName: 'Stylist Buyer', email: 'buyer@stylist.test', role: 'BUYER', passwordHash },
    { fullName: 'Stylist Seller', email: 'seller@stylist.test', role: 'SELLER', passwordHash },
  ]);
  const category = await Category.create({ name: 'Áo', slug: 'ao' });
  const png = await sharp({ create: { width: 600, height: 900, channels: 3, background: '#d7dcc9' } }).png().toBuffer();
  const image = `data:image/png;base64,${png.toString('base64')}`;
  await Product.create({ sellerId: seller._id, title: 'Áo sơ mi cotton', description: 'A cotton shirt for production fitting tests', price: 150000, categoryId: category._id, size: 'M', condition: 'GOOD', status: 'ACTIVE', images: [{ url: image, publicId: 'test/garment' }] });
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith('https://api.fashn.ai/')) return nativeFetch(url, options);
    if (options?.method === 'POST') { submissions++; return Response.json({ id: 'ui-prediction' }); }
    polls++;
    return Response.json(polls < 4 ? { status: 'processing' } : { status: 'completed', output: [image] });
  };
  server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url.endsWith('/auth/login')) setTimeout(() => app(req, res), 1400);
    else app(req, res);
  });
  await new Promise(resolve => server.listen(5019, resolve));
  vite = await createServer({ server: { host: 'localhost', port: 5190, strictPort: true } });
  await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5190/?view=auth');
  await page.locator('input[type=email]').fill('buyer@stylist.test');
  await page.locator('input[type=password]').fill('StylistTest123!');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.api-progress-line')).toBeVisible();
  await expect(page.locator('.store-vnav-ai')).toBeVisible();
  await page.goto('http://localhost:5190/?view=ai-stylist');
  await expect(page.getByRole('heading', { name: 'Ướm thử. Tìm đúng gu.' })).toBeVisible();
  await expect(page.locator('.tryon-product')).toHaveCount(1);
  await page.locator('input[type=file]').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: png });
  await page.locator('.tryon-product').click();
  await page.locator('.tryon-consent input').check();
  await fs.mkdir('artifacts/stylist-production', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/stylist-production/desktop.png', fullPage: true });
  await page.locator('.tryon-controls .tryon-primary').click();
  await expect(page.locator('.tryon-processing [role=progressbar]')).toBeVisible();
  await page.reload();
  await expect(page.locator('.tryon-processing [role=progressbar]')).toBeVisible();
  await page.screenshot({ path: 'artifacts/stylist-production/processing.png', fullPage: true });
  await expect(page.locator('.tryon-completed img')).toBeVisible({ timeout: 30000 });
  expect(submissions).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/stylist-production/mobile.png', fullPage: true });
  const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })).slice(0, 12));
  expect(overflow).toEqual([]);
  await expect(page.locator('.tryon-history-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Xóa ảnh', exact: true }).click();
  await expect(page.locator('.tryon-history-row')).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log('PASS: auth, global progress, upload, live adapter, reload recovery, private result, deletion, desktop/mobile layout; one provider submission.');
} finally {
  globalThis.fetch = nativeFetch;
  await browser?.close(); await vite?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); await mongo.stop();
}

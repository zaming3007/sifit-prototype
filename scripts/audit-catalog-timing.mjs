import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import { createServer } from 'vite';
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', PAYMENTS_ENABLED: 'true', BACKGROUND_JOBS_ENABLED: 'false', PAYMENT_PROVIDER: 'simulator', SHIPPING_PROVIDER: 'simulator', PAYOUT_MODE: 'simulation', PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '', FRONTEND_URL: 'http://localhost:5296', SOCKET_CORS_ORIGIN: 'http://localhost:5296', SOCKET_IO_ENABLED: 'false', MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryServer } = requireBackend('mongodb-memory-server'); const mongoose = requireBackend('mongoose');
const mongo = await MongoMemoryServer.create(); process.env.MONGODB_URI = mongo.getUri();
let browser, vite, server;
try {
  await mongoose.connect(mongo.getUri());
  const app = requireBackend('./src/app');
  const { apiLimiter } = requireBackend('./src/middlewares/rateLimit.middleware');
  // Each browser scenario gets a fresh IP budget in this disposable test app.
  const resetRateBudget = () => apiLimiter.resetKey('127.0.0.1');
  const User = requireBackend('./src/models/user.model'); const Product = requireBackend('./src/models/product.model'); const Category = requireBackend('./src/models/category.model');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const seller = await User.create({ fullName: 'Audit seller', email: 'catalogue@fixture.test', role: 'SELLER', passwordHash: 'fixture' });
  const category = await Category.create({ name: 'Áo', slug: 'ao' });
  const fixtures = await Product.create(Array.from({ length: 23 }, (_, index) => ({ sellerId: seller._id, categoryId: category._id,
    title: `Audit catalogue shirt ${index}`, description: 'Timing fixture', price: 50000 + index,
    size: 'M', condition: 'GOOD', status: 'ACTIVE', brand: 'Audit Brand' })));
  server = http.createServer(app); await new Promise(resolve => server.listen(5063, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5296, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5063/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5063') } }); await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(10000);
  const results = [];
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  for (let trial = 0; trial < 3; trial += 1) {
    resetRateBudget();
    const calls = []; const listener = request => { const url = new URL(request.url()); if (url.pathname === '/api/v1/products') calls.push({ page: url.searchParams.get('page'), brand: url.searchParams.get('brands') }); };
    page.on('request', listener);
    await page.goto('http://localhost:5296/?view=catalog'); await expect(page.locator('.product-card')).toHaveCount(20);
    await page.waitForTimeout(400);
    const started = Date.now();
    await page.locator('.brand-filters').getByText('Audit Brand', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Trang sau', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    const clickDelayMs = Date.now() - started;
    await expect(page.locator('.product-card')).toHaveCount(3);
    await expect(page.locator('.ops-pager')).toContainText('Trang 2/2');
    await page.waitForTimeout(700);
    await expect(page.locator('.product-card')).toHaveCount(3);
    expect(calls.filter(call => call.page === '2').every(call => call.brand === '["Audit Brand"]')).toBe(true);
    results.push({ trial: trial + 1, clickDelayMs, cards: await page.locator('.product-card').count(), pager: await page.locator('.ops-pager').innerText(), calls });
    page.off('request', listener);
  }
  const title = await page.locator('.product-title').first().innerText();
  resetRateBudget();
  await page.locator('.product-title').first().click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const detailUrl = page.url();
  const productId = new URL(detailUrl).searchParams.get('id');
  expect(productId).toMatch(/^[a-f\d]{24}$/i);
  await page.reload();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const productDetailReload = { urlHasProductId: Boolean(new URL(detailUrl).searchParams.get('id')),
    productVisibleAfterReload: await page.getByRole('heading', { name: title, exact: true }).count() > 0,
    mainEmptyAfterReload: !(await page.locator('main').innerText()).trim() };
  const fresh = await browser.newPage();
  await fresh.goto(detailUrl);
  await expect(fresh.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await fresh.close();
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(20);
  const otherTitle = await page.locator('.product-title').first().innerText();
  expect(otherTitle).not.toBe(title);
  await page.locator('.product-title').first().click();
  await expect(page.getByRole('heading', { name: otherTitle, exact: true })).toBeVisible();
  await page.goBack(); await expect(page.locator('.product-card')).toHaveCount(20);
  await page.goBack(); await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.goForward(); await expect(page.locator('.product-card')).toHaveCount(20);
  await page.goForward(); await expect(page.getByRole('heading', { name: otherTitle, exact: true })).toBeVisible();
  for (const suffix of ['', '&id=invalid', '&id=000000000000000000000001']) {
    resetRateBudget();
    await page.goto(`http://localhost:5296/?view=detail${suffix}`);
    await expect(page.getByRole('heading', { name: 'Không thể hiển thị sản phẩm' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mua ngay', exact: true })).toHaveCount(0);
  }
  await Product.updateOne({ _id: productId }, { status: 'ARCHIVED' });
  resetRateBudget();
  await page.goto(detailUrl);
  await expect(page.getByRole('alert')).toContainText('không còn khả dụng');
  await Product.updateOne({ _id: productId }, { status: 'ACTIVE' });
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await User.updateOne({ _id: seller._id }, { status: 'SUSPENDED' });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('không còn khả dụng');
  await page.getByRole('button', { name: 'Tiếp tục mua sắm', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(0);
  await User.updateOne({ _id: seller._id }, { status: 'ACTIVE' });
  // A review endpoint outage must not prevent the product from loading.
  await page.route('**/api/v1/products/*/reviews**', route => route.abort());
  await page.goto(`http://localhost:5296/?view=detail&id=${fixtures[0]._id}`);
  await expect(page.getByRole('heading', { name: fixtures[0].title, exact: true })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
  console.log(JSON.stringify({ quickFilterThenNextPage: results, productDetailReload,
    copiedLink: 'passed', backAndForward: 'passed', invalidAndUnavailable: 'passed', retry: 'passed', reviewOutage: 'passed', runtimeErrors }, null, 2));
} finally {
  await browser?.close(); await vite?.close(); if (server?.listening) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); await mongo.stop();
}

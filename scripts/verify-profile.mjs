import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import { createServer } from 'vite';

// Real backend API and disposable DB. Only external Cloudinary storage is replaced.
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', PAYMENT_PROVIDER: 'simulator', SHIPPING_PROVIDER: 'simulator', PAYOUT_MODE: 'simulation', PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '', FRONTEND_URL: 'http://localhost:5287', SOCKET_CORS_ORIGIN: 'http://localhost:5287',
  GOOGLE_CLIENT_ID: '', SOCKET_IO_ENABLED: 'true', MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryServer } = requireBackend('mongodb-memory-server');
const mongoose = requireBackend('mongoose');
const argon2 = requireBackend('argon2');
const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongo.getUri();
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XioAAAAASUVORK5CYII=', 'base64');
const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
let browser, vite, server, socket;
const errors = [];
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const storage = requireBackend('./src/config/cloudinary');
  let failNext = false;
  let uploaded = 0;
  const removed = [];
  storage.uploadBuffer = async (_buffer, options) => {
    if (failNext) { failNext = false; throw new Error('External image storage unavailable'); }
    uploaded += 1;
    return { secure_url: `${dataUrl}#${uploaded}`, public_id: `${options.folder}/avatar-${uploaded}` };
  };
  storage.deleteAsset = async id => { removed.push(id); return { result: 'ok' }; };
  const app = requireBackend('./src/app');
  socket = requireBackend('./src/socket');
  const User = requireBackend('./src/models/user.model');
  const Category = requireBackend('./src/models/category.model');
  const Product = requireBackend('./src/models/product.model');
  const Cart = requireBackend('./src/models/cart.model');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const passwordHash = await argon2.hash('ProfileBrowser123!');
  const [buyer, seller, admin] = await User.create(['BUYER', 'SELLER', 'ADMIN'].map(role => ({ fullName: `${role} Profile`, email: `${role.toLowerCase()}@profile.test`, role, passwordHash })));
  const category = await Category.create({ name: 'Áo', slug: 'ao' });
  const product = await Product.create({ sellerId: seller._id, categoryId: category._id, title: 'Profile cart fixture', description: 'A pre-loved cotton shirt', price: 100000, size: 'M', condition: 'GOOD', status: 'ACTIVE', images: [{ url: dataUrl, publicId: 'fixture/cart' }] });
  await Cart.create({ userId: buyer._id, items: [{ productId: product._id }] });
  server = http.createServer(app); socket.initSocket(server);
  await new Promise(resolve => server.listen(5057, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5287, strictPort: true },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5057/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5057') } });
  await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true });
  const login = async user => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5287/?view=auth');
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill('ProfileBrowser123!');
    await page.locator('.auth-submit').click();
    await expect(page.locator('.account-button')).toBeVisible();
    await page.goto('http://localhost:5287/?view=account-profile');
    await expect(page.getByRole('heading', { name: 'Hồ sơ tài khoản', exact: true })).toBeVisible();
    return page;
  };
  const page = await login(buyer);
  await expect(page.locator('.bag-count')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeDisabled();
  await page.getByLabel('Họ và tên', { exact: true }).fill('Nguyễn An');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.locator('.profile-success')).toContainText('Đã lưu thông tin cá nhân');
  await expect(page.locator('.account-button')).toHaveAttribute('aria-label', 'Tài khoản Nguyễn An');
  await expect(page.locator('.bag-count')).toHaveText('1');
  expect((await User.findById(buyer._id)).phone).toBe('0901234567');
  await page.getByLabel('Họ và tên', { exact: true }).fill('Unsaved Name');
  await page.getByRole('button', { name: 'Hủy thay đổi', exact: true }).click();
  await expect(page.getByLabel('Họ và tên', { exact: true })).toHaveValue('Nguyễn An');
  await page.getByLabel('Số điện thoại', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Số điện thoại chưa hợp lệ');
  await page.getByRole('button', { name: 'Hủy thay đổi', exact: true }).click();
  console.log('PASS profile persistence, header name, unchanged cart, discard and phone validation');

  const input = page.getByLabel('Chọn ảnh đại diện', { exact: true });
  await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.member-avatar img')).toHaveAttribute('src', /^blob:/);
  await page.getByRole('button', { name: 'Cập nhật ảnh', exact: true }).click();
  await expect(page.locator('.profile-success')).toContainText('Đã cập nhật ảnh đại diện');
  await expect(page.locator('.account-avatar img')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Họ và tên', { exact: true })).toHaveValue('Nguyễn An');
  await expect(page.locator('.member-avatar img')).toBeVisible();
  await input.setInputFiles({ name: 'bad.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
  await expect(page.getByRole('alert')).toContainText('JPEG, PNG hoặc WebP');
  expect(uploaded).toBe(1);
  await input.setInputFiles({ name: 'retry.png', mimeType: 'image/png', buffer: png });
  failNext = true;
  await page.getByRole('button', { name: 'Cập nhật ảnh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Chưa tải được ảnh đại diện');
  await expect(page.getByRole('button', { name: 'Cập nhật ảnh', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Cập nhật ảnh', exact: true }).click();
  await expect(page.locator('.profile-success')).toContainText('Đã cập nhật ảnh đại diện');
  expect(removed.some(id => id.endsWith('avatar-1'))).toBe(true);
  await page.getByRole('button', { name: 'Xóa ảnh đại diện', exact: true }).click();
  await expect(page.locator('.member-avatar img')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Xóa ảnh đại diện', exact: true })).toHaveCount(0);
  console.log('PASS avatar preview, persistence, invalid type, failed-upload retry and deletion');

  await fs.mkdir('artifacts/profile', { recursive: true });
  await page.screenshot({ path: 'artifacts/profile/buyer-desktop.png', fullPage: true });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/profile/buyer-${width}.png`, fullPage: true });
  }
  for (const user of [seller, admin]) {
    const rolePage = await login(user);
    await expect(rolePage.locator('.profile-account-details')).toContainText(user.role === 'SELLER' ? 'Người bán' : 'Quản trị viên');
    await rolePage.getByLabel('Họ và tên', { exact: true }).fill(`${user.role} Updated`);
    await rolePage.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(rolePage.locator('.account-button')).toContainText('Updated');
    await rolePage.setViewportSize({ width: 390, height: 844 });
    if (user.role === 'SELLER') {
      await expect.poll(() => rolePage.locator('.seller-sidebar').evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(64);
      await expect.poll(() => rolePage.locator('.seller-workspace').evaluate(element => Math.round(element.getBoundingClientRect().left))).toBe(64);
    }
    await rolePage.screenshot({ path: `artifacts/profile/${user.role.toLowerCase()}-mobile.png`, fullPage: true });
    console.log(JSON.stringify({ role: user.role, layout: await rolePage.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('main *')].filter(element => element.getBoundingClientRect().right > innerWidth + 2).slice(0, 8).map(element => ({ tag: element.tagName, className: element.className, width: Math.round(element.getBoundingClientRect().width) })) })) }));
    await expect.poll(() => rolePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
  console.log('PASS buyer/seller/admin layouts, role labels and no browser runtime errors');
} finally {
  await browser?.close(); await vite?.close();
  await socket?.closeSocket();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); await mongo.stop();
}

import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', PAYMENTS_ENABLED: 'true', PAYMENT_PROVIDER: 'simulator', SHIPPING_PROVIDER: 'simulator', PAYOUT_MODE: 'simulation', PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '', FRONTEND_URL: 'http://localhost:5290', SOCKET_CORS_ORIGIN: 'http://localhost:5290', SOCKET_IO_ENABLED: 'true', MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server'); const mongoose = requireBackend('mongoose'); const argon2 = requireBackend('argon2');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); process.env.MONGODB_URI = mongo.getUri();
let browser, vite, server, socket, ipBudget; const errors = [];
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const app = requireBackend('./src/app'); socket = requireBackend('./src/socket');
  const User = requireBackend('./src/models/user.model'); const Shop = requireBackend('./src/models/sellerProfile.model'); const Product = requireBackend('./src/models/product.model'); const Category = requireBackend('./src/models/category.model'); const Follow = requireBackend('./src/models/shopFollow.model'); const Notification = requireBackend('./src/models/notification.model'); const Preference = requireBackend('./src/models/notificationPreference.model'); const Outbox = requireBackend('./src/models/outboxEvent.model');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const passwordHash = await argon2.hash('FollowBrowser123!');
  const [buyer, seller, seller2, admin] = await User.create(['BUYER', 'SELLER', 'SELLER', 'ADMIN'].map((role, index) => ({ role, fullName: `${role} Follow ${index}`, email: `follow${index}@browser.test`, passwordHash })));
  const [shop] = await Shop.create([{ userId: seller._id, shopName: 'Sifit Linen Studio', shopSlug: 'sifit-linen-studio', description: 'Những món đồ linen và cotton được chọn lọc cho tủ đồ của bạn.', verificationStatus: 'VERIFIED' }, { userId: seller2._id, shopName: 'Other Studio', shopSlug: 'other-studio' }]);
  const category = await Category.create({ name: 'Áo', slug: 'ao' });
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XioAAAAASUVORK5CYII=';
  const productBody = { sellerId: seller._id, categoryId: category._id, description: 'A pre-loved cotton shirt', price: 150000, brand: 'Sifit', size: 'M', condition: 'GOOD', images: [{ url: image, publicId: 'fixture/follow' }] };
  const [existing, first, muted, later] = await Product.create([{ ...productBody, title: 'Áo linen đang bán', status: 'ACTIVE' }, { ...productBody, title: 'Áo cotton mới được duyệt', status: 'PENDING' }, { ...productBody, title: 'Sản phẩm khi đã tắt thông báo', status: 'PENDING' }, { ...productBody, title: 'Sản phẩm sau khi bỏ theo dõi', status: 'PENDING' }, { ...productBody, sellerId: seller2._id, title: 'Sản phẩm của shop khác', status: 'ACTIVE' }]);
  server = http.createServer(app); socket.initSocket(server); await new Promise(resolve => server.listen(5056, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5290, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5056/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5056') } }); await vite.listen();
  // Buyer + admin sockets share one loopback IP; financial/follow checks remain real.
  ipBudget = setInterval(() => requireBackend('./src/middlewares/rateLimit.middleware').apiLimiter.resetKey('127.0.0.1'), 1000);
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true }); await fs.mkdir('artifacts/following', { recursive: true });
  const newPage = async () => { const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.on('pageerror', error => errors.push(error.message)); return page; };
  const login = async user => { const page = await newPage(); await page.goto('http://localhost:5290/?view=auth'); await page.getByLabel('Email', { exact: true }).fill(user.email); await page.getByLabel('Mật khẩu', { exact: true }).fill('FollowBrowser123!'); await page.locator('.auth-submit').click(); await expect(page.locator('.account-button')).toBeVisible(); return page; };
  const shopUrl = `http://localhost:5290/?view=shop&sellerId=${seller.id}`;
  const guest = await newPage(); await guest.goto(shopUrl); await guest.getByRole('button', { name: 'Theo dõi shop', exact: true }).click(); await expect(guest.getByLabel('Email', { exact: true })).toBeVisible(); await guest.close();
  const buy = await login(buyer); await buy.goto(shopUrl);
  await buy.getByRole('button', { name: 'Theo dõi shop', exact: true }).click(); await expect(buy.locator('.shop-follow-button')).toHaveText('Đang theo dõi');
  await expect(buy.locator('.shop-follower-count')).toHaveText('1 người theo dõi'); expect(await Follow.countDocuments()).toBe(1);
  await buy.reload(); await expect(buy.locator('.shop-follow-button')).toHaveText('Đang theo dõi'); await expect(buy.getByRole('heading', { name: shop.shopName, exact: true })).toBeVisible();
  await buy.getByRole('checkbox', { name: 'Thông báo sản phẩm mới của shop', exact: true }).uncheck(); await expect.poll(async () => (await Follow.findOne()).notifyNewProducts).toBe(false);
  await buy.getByRole('button', { name: 'Shop đang theo dõi', exact: true }).click(); await expect(buy.locator('.product-title')).toHaveCount(1); await expect(buy.locator('.product-title')).toHaveText(existing.title);
  await buy.getByRole('button', { name: 'Danh sách shop', exact: true }).click(); await expect(buy.locator('.following-shop-card')).toHaveCount(1);
  const shopCard = buy.locator('.following-shop-card'); await expect(shopCard).toContainText(shop.shopName); await expect(shopCard.getByRole('checkbox')).not.toBeChecked();
  await shopCard.getByRole('checkbox').check(); await expect.poll(async () => (await Follow.findOne()).notifyNewProducts).toBe(true);
  await buy.screenshot({ path: 'artifacts/following/shops-desktop.png', fullPage: true });
  for (const width of [320, 390, 768]) { await buy.setViewportSize({ width, height: 844 }); await expect.poll(() => buy.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await buy.screenshot({ path: `artifacts/following/shops-${width}.png`, fullPage: true }); }
  await shopCard.getByRole('button', { name: /Xem shop/ }).click(); await expect(buy.locator('.shop-follow-button')).toHaveText('Đang theo dõi');
  console.log('PASS guest login prompt, follow/count persistence, shop deep link, shop list/feed and per-shop settings');
  const adm = await login(admin); await adm.getByRole('button', { name: 'Kiểm duyệt sản phẩm', exact: true }).click();
  const approve = async item => { const panel = adm.locator('.admin-content > section').filter({ has: adm.getByRole('heading', { name: item.title, exact: true }) }); await panel.getByRole('button', { name: 'Duyệt', exact: true }).click(); await expect.poll(async () => (await Product.findById(item.id)).status).toBe('ACTIVE'); await expect.poll(async () => (await Outbox.findOne({ type: 'SHOP_PRODUCT_APPROVED', 'payload.productId': item._id }))?.status).toBe('PROCESSED'); };
  expect(await Notification.countDocuments({ type: 'FOLLOWED_SHOP_NEW_PRODUCT' })).toBe(0); await approve(first);
  await expect.poll(async () => Notification.countDocuments({ recipientId: buyer._id, type: 'FOLLOWED_SHOP_NEW_PRODUCT' })).toBe(1);
  await buy.goto('http://localhost:5290/?view=notifications'); const notice = buy.locator('.member-notification').filter({ hasText: first.title }); await expect(notice).toContainText(`${shop.shopName} có sản phẩm mới`);
  await notice.getByRole('button', { name: /Xem chi tiết/ }).click(); await expect(buy.locator('.ops-page')).toContainText(first.title);
  await buy.goto('http://localhost:5290/?view=notifications');
  await buy.getByRole('checkbox', { name: 'Sản phẩm mới từ shop đã theo dõi', exact: true }).uncheck(); await expect.poll(async () => (await Preference.findOne({ userId: buyer._id })).followedShopNotifications).toBe(false);
  await approve(muted); expect(await Notification.countDocuments({ type: 'FOLLOWED_SHOP_NEW_PRODUCT' })).toBe(1);
  await buy.goto('http://localhost:5290/?view=following'); await expect(buy.locator('.product-title')).toHaveCount(3);
  await buy.screenshot({ path: 'artifacts/following/feed-mobile.png', fullPage: true });
  await buy.getByRole('button', { name: 'Danh sách shop', exact: true }).click(); await buy.getByRole('button', { name: 'Bỏ theo dõi', exact: true }).click(); await expect(buy.locator('.following-shop-card')).toHaveCount(0);
  await buy.reload(); await expect(buy.locator('.product-title')).toHaveCount(0); await expect(buy.locator('.following-empty')).toBeVisible();
  await approve(later); expect(await Notification.countDocuments({ type: 'FOLLOWED_SHOP_NEW_PRODUCT' })).toBe(1);
  expect(errors).toEqual([]); console.log('PASS approved-only notification/deep link, global opt-out, feed refresh, unfollow and responsive layouts');
} catch (error) {
  console.error('FOLLOW UI FAILURE', error); process.exitCode = 1;
  if (browser) for (const [index, context] of browser.contexts().entries()) { const page = context.pages()[0]; if (page) { await page.screenshot({ path: `artifacts/following/failure-${index}.png`, fullPage: true }).catch(() => {}); console.error((await page.locator('body').innerText()).slice(-1600)); } }
} finally {
  clearInterval(ipBudget); await browser?.close(); await vite?.close(); await socket?.closeSocket(); if (server?.listening) await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => setTimeout(resolve, 500)); await mongoose.disconnect(); await mongo.stop();
}

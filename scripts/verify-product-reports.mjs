import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import { createServer } from 'vite';

// Real API, transactions and isolated Mongo replica set; no production users or data.
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', PAYMENT_PROVIDER: 'simulator', SHIPPING_PROVIDER: 'simulator', PAYOUT_MODE: 'simulation', PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '', FRONTEND_URL: 'http://localhost:5288', SOCKET_CORS_ORIGIN: 'http://localhost:5288',
  GOOGLE_CLIENT_ID: '', SOCKET_IO_ENABLED: 'true', MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server');
const mongoose = requireBackend('mongoose');
const argon2 = requireBackend('argon2');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = mongo.getUri();
let browser, vite, server, socket;
const errors = [];
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const app = requireBackend('./src/app');
  const { apiLimiter } = requireBackend('./src/middlewares/rateLimit.middleware');
  // All simulated actors share localhost. Reset only the generic IP flood limiter;
  // the reporting quotas in MongoDB remain active across every page and account.
  const resetSharedIp = () => { apiLimiter.resetKey('127.0.0.1'); apiLimiter.resetKey('::ffff:127.0.0.1'); };
  socket = requireBackend('./src/socket');
  const User = requireBackend('./src/models/user.model');
  const Category = requireBackend('./src/models/category.model');
  const Product = requireBackend('./src/models/product.model');
  const Report = requireBackend('./src/models/productReport.model');
  const Audit = requireBackend('./src/models/adminAuditLog.model');
  const Notification = requireBackend('./src/models/notification.model');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const passwordHash = await argon2.hash('ReportBrowser123!');
  const [buyer, seller, admin] = await User.create(['BUYER', 'SELLER', 'ADMIN'].map(role => ({ fullName: `${role} Report`, email: `${role.toLowerCase()}@report.test`, role, passwordHash })));
  const category = await Category.create({ name: 'Áo', slug: 'ao' });
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XioAAAAASUVORK5CYII=';
  const products = await Product.create(['A', 'B', 'C', 'D'].map(letter => ({ sellerId: seller._id, categoryId: category._id, title: `Áo vintage ${letter}`, description: `Áo sơ mi cotton ${letter}, ảnh chụp và mô tả của người bán.`, price: 150000, size: 'M', condition: 'GOOD', status: 'ACTIVE', images: [{ url: image, publicId: `fixture/${letter}` }] })));
  server = http.createServer(app); socket.initSocket(server);
  await new Promise(resolve => server.listen(5058, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5288, strictPort: true },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5058/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5058') } });
  await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true });
  const newPage = async () => {
    resetSharedIp();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message)); return page;
  };
  const login = async user => {
    const page = await newPage();
    await page.goto('http://localhost:5288/?view=auth');
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill('ReportBrowser123!');
    await page.locator('.auth-submit').click();
    await expect(page.locator('.account-button')).toBeVisible(); return page;
  };
  const openReport = async (page, product) => {
    resetSharedIp();
    await page.goto('http://localhost:5288/?view=catalog');
    await page.locator('.product-title').filter({ hasText: product.title }).click();
    await page.getByRole('button', { name: 'Báo cáo sản phẩm', exact: true }).click();
    return page.getByRole('dialog', { name: 'Báo cáo sản phẩm', exact: true });
  };
  const fillReport = async dialog => {
    await dialog.getByLabel('Lý do báo cáo', { exact: true }).selectOption('MISLEADING');
    await dialog.getByLabel('Mô tả vấn đề', { exact: true }).fill('Hình ảnh và nhãn hiệu không đúng với mô tả sản phẩm.');
    await dialog.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  };
  const guest = await newPage();
  let dialog = await openReport(guest, products[0]);
  await expect(dialog.getByRole('button', { name: 'Đăng nhập để báo cáo' })).toBeVisible();
  await guest.close();

  const buyerPage = await login(buyer);
  dialog = await openReport(buyerPage, products[0]);
  await expect(dialog.getByRole('button', { name: 'Gửi báo cáo', exact: true })).toBeDisabled();
  await fillReport(dialog);
  await expect(dialog.getByRole('status')).toContainText('Đã gửi báo cáo');
  await dialog.getByRole('button', { name: 'Đóng cửa sổ' }).click();
  await buyerPage.getByRole('button', { name: 'Báo cáo sản phẩm', exact: true }).click();
  dialog = buyerPage.getByRole('dialog');
  await expect(dialog.getByRole('status')).toContainText('Bạn đã báo cáo sản phẩm này');
  expect(await Report.countDocuments()).toBe(1);
  expect((await Product.findById(products[0]._id)).status).toBe('ACTIVE');
  await buyerPage.setViewportSize({ width: 390, height: 844 });
  await fs.mkdir('artifacts/product-reports', { recursive: true });
  await buyerPage.screenshot({ path: 'artifacts/product-reports/buyer-mobile.png', fullPage: true });
  await expect.poll(() => dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  console.log('PASS guest sign-in prompt, buyer submission, persisted duplicate prevention and mobile dialog');

  const adminPage = await login(admin);
  await adminPage.getByRole('button', { name: 'Báo cáo sản phẩm', exact: true }).click();
  await expect(adminPage.locator('.product-report-card')).toHaveCount(1);
  await adminPage.getByRole('button', { name: 'Xem & xử lý' }).click();
  dialog = adminPage.getByRole('dialog');
  await expect(dialog.getByText('Thông tin sản phẩm tại lúc báo cáo')).toBeVisible();
  await dialog.getByLabel('Ghi chú xử lý', { exact: true }).fill('Ảnh và mô tả phù hợp, chưa đủ cơ sở xác nhận vi phạm.');
  await dialog.getByRole('button', { name: 'Xác nhận xử lý' }).click();
  await expect(adminPage.locator('.product-report-card')).toHaveCount(0);
  await buyerPage.goto('http://localhost:5288/?view=report-history');
  await expect(buyerPage.locator('.report-history-cards')).toContainText('Đã xử lý · Giữ hiện trạng');
  expect((await Product.findById(products[0]._id)).status).toBe('ACTIVE');

  dialog = await openReport(buyerPage, products[1]); await fillReport(dialog);
  await expect(dialog.getByRole('status')).toContainText('Đã gửi báo cáo');
  await adminPage.getByRole('button', { name: 'Tải lại báo cáo', exact: true }).click();
  await expect(adminPage.locator('.product-report-card')).toHaveCount(1);
  await adminPage.screenshot({ path: 'artifacts/product-reports/admin-desktop.png', fullPage: true });
  await adminPage.getByRole('button', { name: 'Xem & xử lý' }).click();
  dialog = adminPage.getByRole('dialog');
  await dialog.getByLabel('Kết quả kiểm tra', { exact: true }).selectOption('HIDE');
  await dialog.getByLabel('Ghi chú xử lý', { exact: true }).fill('Đã kiểm tra và xác nhận thông tin sản phẩm gây hiểu nhầm.');
  await dialog.getByRole('button', { name: 'Xác nhận xử lý' }).click();
  await expect(adminPage.locator('.product-report-card')).toHaveCount(0);
  expect((await Product.findById(products[1]._id)).status).toBe('ARCHIVED');
  const sellerPage = await login(seller);
  await sellerPage.goto('http://localhost:5288/?view=notifications');
  await expect(sellerPage.getByRole('heading', { name: 'Sản phẩm đã bị ẩn sau khi kiểm tra', exact: true })).toBeVisible();
  await buyerPage.goto('http://localhost:5288/?view=notifications');
  const resultNotification = buyerPage.locator('.member-notification').filter({ hasText: 'Sản phẩm đã bị ẩn.' });
  await resultNotification.getByRole('button', { name: /Xem chi tiết/ }).click();
  await expect(buyerPage.locator('.report-history-cards')).toContainText('Đã xử lý · Ẩn sản phẩm');
  console.log('PASS admin KEEP/HIDE, seller notification, buyer result navigation after product hidden');

  dialog = await openReport(buyerPage, products[2]); await fillReport(dialog);
  await expect(dialog.getByRole('status')).toContainText('Đã gửi báo cáo');
  dialog = await openReport(buyerPage, products[3]); await fillReport(dialog);
  await expect(dialog.getByRole('alert')).toContainText('3 báo cáo trong 10 phút');
  await adminPage.getByRole('button', { name: 'Tải lại báo cáo', exact: true }).click();
  await expect(adminPage.locator('.product-report-card')).toHaveCount(1);
  await adminPage.getByRole('button', { name: 'Quản lý quyền báo cáo', exact: true }).click();
  dialog = adminPage.getByRole('dialog');
  await dialog.getByLabel('Thao tác quyền báo cáo').selectOption('BLOCK');
  await dialog.getByLabel('Thời hạn khóa (ngày)').fill('2');
  await dialog.getByLabel('Lý do xử lý quyền báo cáo').fill('Tạm khóa để kiểm tra dấu hiệu lạm dụng báo cáo nhiều sản phẩm.');
  await dialog.getByRole('button', { name: 'Cập nhật quyền báo cáo' }).click();
  await expect(adminPage.locator('.product-report-card')).toContainText('Quyền báo cáo tạm khóa');
  await buyerPage.getByRole('dialog').getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  await expect(buyerPage.getByRole('dialog').getByRole('alert')).toContainText('Quyền báo cáo của bạn tạm khóa');
  await adminPage.getByRole('button', { name: 'Quản lý quyền báo cáo', exact: true }).click();
  dialog = adminPage.getByRole('dialog');
  await dialog.getByLabel('Thao tác quyền báo cáo').selectOption('UNBLOCK');
  await dialog.getByLabel('Lý do xử lý quyền báo cáo').fill('Đã xem xét và mở lại quyền báo cáo cho tài khoản.');
  await dialog.getByRole('button', { name: 'Cập nhật quyền báo cáo' }).click();
  await expect(adminPage.locator('.report-success')).toContainText('Đã cập nhật quyền báo cáo');
  expect(await Audit.countDocuments({ action: /^PRODUCT_REPORTER_/ })).toBe(2);
  expect(await Notification.countDocuments({ recipientId: buyer._id, type: 'REPORTING_POLICY' })).toBe(2);
  await adminPage.getByLabel('Trạng thái báo cáo').selectOption('RESOLVED');
  await expect(adminPage.locator('.product-report-card')).toHaveCount(2);
  await adminPage.getByLabel('Lọc lý do báo cáo').selectOption('COUNTERFEIT');
  await expect(adminPage.locator('.product-report-card')).toHaveCount(0);
  await adminPage.getByLabel('Lọc lý do báo cáo').selectOption('');
  await expect(adminPage.locator('.product-report-card')).toHaveCount(2);
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => adminPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await adminPage.screenshot({ path: 'artifacts/product-reports/admin-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  console.log('PASS quota error, temporary block/unblock, audit history, filters and responsive admin');
} catch (error) {
  console.error('FAIL product report browser flow:', error);
  for (const [index, context] of (browser?.contexts() || []).entries()) {
    const page = context.pages()[0];
    if (page) { await page.screenshot({ path: `artifacts/product-reports/failure-${index}.png`, fullPage: true }).catch(() => {}); console.error((await page.locator('body').innerText()).slice(-2200)); }
  }
  process.exitCode = 1;
} finally {
  await browser?.close(); await vite?.close(); await socket?.closeSocket();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  // Socket.IO close does not await the async presence-disconnect listeners.
  // Match the existing integration harness before disposing its database.
  await new Promise(resolve => setTimeout(resolve, 500));
  await mongoose.disconnect(); await mongo.stop();
}

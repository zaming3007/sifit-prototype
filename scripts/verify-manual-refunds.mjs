import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', BACKGROUND_JOBS_ENABLED: 'false', PAYMENT_PROVIDER: 'simulator', SHIPPING_PROVIDER: 'manual', PAYOUT_MODE: 'manual', PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '',
  FRONTEND_URL: 'http://localhost:5289', SOCKET_CORS_ORIGIN: 'http://localhost:5289', SOCKET_IO_ENABLED: 'true',
  MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server'); const mongoose = requireBackend('mongoose');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); process.env.MONGODB_URI = mongo.getUri();
let browser, server, vite;
const errors = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
try {
  await mongoose.connect(mongo.getUri()); const app = requireBackend('./src/app');
  const socket = requireBackend('./src/socket'); const { apiLimiter } = requireBackend('./src/middlewares/rateLimit.middleware');
  const resetBudget = () => apiLimiter.resetKey('127.0.0.1');
  const model = name => requireBackend(`./src/models/${name}.model`);
  const User = model('user'), Order = model('order'), Payment = model('payment'), Refund = model('refund'), Group = model('checkoutGroup'), Commission = model('commission');
  await Promise.all(Object.values(mongoose.models).map(item => item.init()));
  const password = 'RefundIntegration123!'; const passwordHash = await requireBackend('argon2').hash(password);
  const [buyer, seller, admin] = await User.create(['BUYER', 'SELLER', 'ADMIN'].map((role, i) => ({ role, fullName: `Refund ${role}`, email: `refund${i}@fixture.test`, passwordHash })));
  const past = new Date(Date.now() - 30 * 86400000);
  const group = await Group.create({ buyerId: buyer._id, idempotencyKey: randomUUID(), requestFingerprint: 'refund-fixture', subtotal: 100000, buyerTotal: 100000, paymentStatus: 'PAID', orderStatus: 'DELIVERED', reservationExpiresAt: past });
  const order = await Order.create({ checkoutGroupId: group._id, buyerId: buyer._id, sellerId: seller._id,
    items: [{ productId: new mongoose.Types.ObjectId(), title: 'Refund integration jacket', price: 100000, quantity: 1 }],
    shippingAddress: { recipientName: buyer.fullName, phone: '0901234567', addressLine: 'Street', ward: 'Ward', city: 'City' },
    subtotal: 100000, buyerTotal: 100000, commissionRateBasisPoints: 1000, commissionAmount: 10000, sellerProceeds: 90000,
    paymentStatus: 'PAID', orderStatus: 'DELIVERED', deliveredAt: past, protectionEndsAt: new Date(Date.now() + 86400000), reservationExpiresAt: past });
  group.orderIds = [order._id]; await group.save();
  await Commission.create({ orderId: order._id, sellerId: seller._id, subtotal: 100000, commissionRateBasisPoints: 1000, commissionAmount: 10000, sellerProceeds: 90000 });
  const payment = await Payment.create({ checkoutGroupId: group._id, buyerId: buyer._id, provider: 'payos', providerPaymentId: randomUUID(), merchantReference: randomUUID(),
    amount: 100000, status: 'SUCCEEDED', paidAt: past, idempotencyKey: randomUUID(), requestFingerprint: 'refund-fixture', expiresAt: past });
  await model('paymentTransaction').create({ paymentId: payment._id, checkoutGroupId: group._id, provider: 'payos', reference: 'REFUND-TEST-INCOMING',
    providerPaymentId: payment.providerPaymentId, merchantReference: payment.merchantReference, amount: 100000, currency: 'VND', status: 'MATCHED', source: 'WEBHOOK', occurredAt: past });
  server = http.createServer(app); socket.initSocket(server); await new Promise(resolve => server.listen(5048, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5289, strictPort: true },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5048/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5048') } }); await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true });
  const base = 'http://localhost:5289';
  const login = async user => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const page = await context.newPage();
    page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?view=auth`); await page.locator('input[type=email]').fill(user.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password); await page.locator('.auth-submit').click();
    await expect(page.locator('.account-button')).toBeVisible(); return page;
  };
  const staff = await login(admin); const buy = await login(buyer); resetBudget();
  await staff.getByRole('button', { name: 'Tài chính', exact: true }).click();
  await staff.getByRole('button', { name: 'Tạo yêu cầu hoàn tiền', exact: true }).click();
  const createDialog = staff.getByRole('dialog', { name: 'Duyệt khoản hoàn cho người mua' });
  await createDialog.getByLabel('Đơn hàng cần hoàn').selectOption(order.id);
  await createDialog.getByLabel('Số tiền duyệt hoàn (VND)', { exact: true }).fill('50000');
  await createDialog.getByLabel('Lý do duyệt hoàn').fill('Hoàn một phần theo căn cứ kiểm tra sản phẩm');
  await createDialog.getByRole('checkbox').check();
  await createDialog.getByRole('button', { name: 'Duyệt khoản hoàn và yêu cầu tài khoản', exact: true }).click();
  await expect(createDialog).not.toBeVisible();
  await expect(staff.getByRole('heading', { name: 'Hoàn tiền cho người mua', exact: true })).toBeVisible();
  const refund = await Refund.findOne({ orderId: order._id }); expect(refund.status).toBe('REQUESTED');
  console.log('PASS admin creates a per-order refund without recording a transfer');
  await requireBackend('./src/services/notificationEvent.service').processBatch({ limit: 50 });
  await buy.goto(`${base}/?view=notifications`);
  const notification = buy.locator('.member-notification').filter({ hasText: 'Sifit đã duyệt khoản hoàn' });
  await notification.getByRole('button', { name: /Xem chi tiết/ }).click();
  await expect(buy.locator('.refund-details')).toBeVisible();
  await buy.getByLabel('Ngân hàng nhận hoàn').selectOption('970418');
  await buy.getByLabel('Số tài khoản nhận hoàn', { exact: true }).fill('123456789');
  await buy.getByLabel('Tên chủ tài khoản', { exact: true }).fill('BUYER FIXTURE');
  await buy.getByRole('checkbox').check(); await buy.getByRole('button', { name: 'Gửi tài khoản nhận hoàn', exact: true }).click();
  await expect(buy.locator('.refund-details')).toContainText('Chờ admin kiểm tra tài khoản');
  await buy.reload(); await expect(buy.locator('.refund-details')).toContainText('123456789');
  console.log('PASS buyer opens notification, submits bank account and reloads persisted details');
  resetBudget();
  await staff.getByRole('button', { name: 'Làm mới khoản hoàn', exact: true }).click();
  await staff.getByRole('button', { name: 'Chi tiết và xử lý hoàn tiền', exact: true }).click();
  const details = staff.getByRole('dialog', { name: 'Xử lý khoản hoàn', exact: true });
  await details.getByRole('button', { name: 'Duyệt tài khoản và chuyển khoản', exact: true }).click();
  await expect(details).toContainText('Đã duyệt, chờ chuyển khoản');
  await buy.reload(); await expect(buy.getByRole('button', { name: 'Sửa tài khoản nhận hoàn', exact: true })).toHaveCount(0);
  await details.getByLabel('Ảnh chứng từ hoàn tiền', { exact: true }).setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png });
  await details.getByRole('button', { name: 'Lưu chứng từ hoàn tiền', exact: true }).click();
  await expect(details.getByRole('status')).toContainText('Đã lưu chứng từ hoàn tiền.');
  await details.getByLabel('Mã giao dịch hoàn tiền', { exact: true }).fill('BANK-REFUND-INTEGRATION-001');
  await details.getByLabel('Ghi chú đối chiếu hoàn tiền', { exact: true }).fill('Đã kiểm tra đúng người nhận, số tiền và biên nhận');
  await details.getByRole('checkbox').check();
  await details.getByRole('button', { name: 'Ghi nhận đã hoàn tiền', exact: true }).click();
  await expect(details).toContainText('Đã hoàn tiền');
  await expect(details.getByRole('button', { name: 'Ghi nhận đã hoàn tiền', exact: true })).toHaveCount(0);
  expect((await Payment.findById(payment._id)).refundedAmount).toBe(50000);
  expect((await Order.findById(order._id)).paymentStatus).toBe('PAID');
  expect((await Commission.findOne({ orderId: order._id })).sellerProceeds).toBe(45000);
  console.log('PASS admin approves frozen recipient, uploads private receipt and records partial transfer');
  await buy.reload(); await expect(buy.locator('.refund-details')).toContainText('BANK-REFUND-INTEGRATION-001');
  const downloaded = buy.waitForEvent('download'); await buy.getByRole('button', { name: 'Tải chứng từ hoàn tiền', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toContain('sifit-refund');
  await fs.mkdir('artifacts/refunds', { recursive: true });
  await buy.screenshot({ path: 'artifacts/refunds/buyer-refund-desktop.png', fullPage: true });
  await buy.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => buy.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await buy.screenshot({ path: 'artifacts/refunds/buyer-refund-mobile.png', fullPage: true });
  await staff.screenshot({ path: 'artifacts/refunds/admin-refund-desktop.png', fullPage: true });
  await requireBackend('./src/services/notificationEvent.service').processBatch({ limit: 50 });
  expect(await model('notification').countDocuments({ recipientId: buyer._id, resourceType: 'REFUND' })).toBeGreaterThan(1);
  expect(errors).toEqual([]);
  console.log('PASS buyer receipt download, persisted completion, mobile layout and no browser runtime errors');
} catch (error) {
  console.error('REFUND INTEGRATION FAILURE', error);
  if (browser) { await fs.mkdir('artifacts/refunds', { recursive: true }); for (const [i, context] of browser.contexts().entries()) for (const page of context.pages()) await page.screenshot({ path: `artifacts/refunds/failure-${i}.png`, fullPage: true }).catch(() => {}); }
  process.exitCode = 1;
} finally {
  await browser?.close(); await vite?.close();
  if (server) { await requireBackend('./src/socket').closeSocket(); if (server.listening) await new Promise(resolve => server.close(resolve)); }
  await mongoose.disconnect(); await mongo.stop();
}

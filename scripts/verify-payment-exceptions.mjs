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
Object.assign(process.env, {
  NODE_ENV: 'test', PAYMENTS_ENABLED: 'true', BACKGROUND_JOBS_ENABLED: 'false', PAYMENT_PROVIDER: 'payos',
  SHIPPING_PROVIDER: 'manual', PAYOUT_MODE: 'manual', PAYOS_CLIENT_ID: 'fixture-client',
  PAYOS_API_KEY: 'fixture-api', PAYOS_CHECKSUM_KEY: 'fixture-checksum',
  FRONTEND_URL: 'http://localhost:5293', SOCKET_CORS_ORIGIN: 'http://localhost:5293', SOCKET_IO_ENABLED: 'true',
  MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server'),
});
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server');
const mongoose = requireBackend('mongoose');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = mongo.getUri();
let browser, server, vite;
const errors = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
try {
  await mongoose.connect(mongo.getUri());
  const app = requireBackend('./src/app');
  const socket = requireBackend('./src/socket');
  const { apiLimiter } = requireBackend('./src/middlewares/rateLimit.middleware');
  const resetBudget = () => apiLimiter.resetKey('127.0.0.1');
  const model = name => requireBackend(`./src/models/${name}.model`);
  const User = model('user'), Order = model('order'), Payment = model('payment'), Refund = model('refund');
  const Group = model('checkoutGroup'), Product = model('product'), Commission = model('commission');
  const sdk = requireBackend('./src/config/payos').getClient();
  // This integration never contacts PayOS or a bank. Only the signature verifier is real.
  sdk.paymentRequests.get = async () => { throw new Error('External network disabled in browser integration'); };
  await Promise.all(Object.values(mongoose.models).map(item => item.init()));
  const password = 'ReviewIntegration123!';
  const passwordHash = await requireBackend('argon2').hash(password);
  const [buyer, seller, admin] = await User.create(['BUYER', 'SELLER', 'ADMIN'].map((role, i) => ({
    role, fullName: `Payment Review ${role}`, email: `paymentreview${i}@fixture.test`, passwordHash,
  })));
  await model('sellerProfile').create({ userId: seller._id, shopName: 'Review shop', shopSlug: 'review-shop', verificationStatus: 'VERIFIED' });
  const category = await model('category').create({ name: 'Jackets', slug: 'jackets' });
  const fixture = async (code, title) => {
    const expiresAt = new Date(Date.now() + 900000);
    const group = await Group.create({ buyerId: buyer._id, idempotencyKey: randomUUID(), requestFingerprint: title,
      subtotal: 100000, buyerTotal: 100000, reservationExpiresAt: expiresAt });
    const product = await Product.create({ sellerId: seller._id, categoryId: category._id, title,
      description: 'Clean fixture garment', price: 100000, size: 'M', condition: 'GOOD', status: 'RESERVED', reservationGroupId: group._id });
    const order = await Order.create({ checkoutGroupId: group._id, buyerId: buyer._id, sellerId: seller._id,
      items: [{ productId: product._id, title, price: 100000, quantity: 1 }],
      shippingAddress: { recipientName: buyer.fullName, phone: '0901234567', addressLine: 'Street', ward: 'Ward', city: 'City' },
      subtotal: 100000, buyerTotal: 100000, commissionRateBasisPoints: 1000, commissionAmount: 10000,
      sellerProceeds: 90000, reservationExpiresAt: expiresAt });
    group.orderIds = [order._id]; await group.save();
    const payment = await Payment.create({ checkoutGroupId: group._id, buyerId: buyer._id, provider: 'payos',
      providerPaymentId: `fixture-${code}`, merchantReference: String(code), amount: 100000, status: 'PENDING',
      idempotencyKey: randomUUID(), requestFingerprint: title, expiresAt });
    return { group, product, order, payment };
  };
  const extra = await fixture(12345678, 'Overpaid integration jacket');
  server = http.createServer(app); socket.initSocket(server);
  await new Promise(resolve => server.listen(5056, '127.0.0.1', resolve));
  const income = async (payment, amount, reference) => {
    const data = { orderCode: Number(payment.merchantReference), amount, currency: 'VND', paymentLinkId: payment.providerPaymentId,
      reference, transactionDateTime: new Date().toISOString(), code: '00', desc: 'success', accountNumber: '99887766', description: 'Fixture payment' };
    const result = await fetch('http://127.0.0.1:5056/api/v1/webhooks/payments/payos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '00', desc: 'success', success: true, data, signature: await sdk.crypto.createSignatureFromObj(data, sdk.checksumKey) }) });
    expect(result.status).toBe(200);
  };
  await income(extra.payment, 120000, 'REVIEW-BANK-EXTRA-001');
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5293, strictPort: true },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5056/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5056') } });
  await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true });
  const base = 'http://localhost:5293';
  const login = async user => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?view=auth`); await page.locator('input[type=email]').fill(user.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password); await page.locator('.auth-submit').click();
    await expect(page.locator('.account-button')).toBeVisible(); return page;
  };
  const staff = await login(admin), buy = await login(buyer); resetBudget();
  const openQueue = async () => {
    await staff.getByRole('button', { name: 'Tài chính', exact: true }).click();
    await staff.getByRole('button', { name: 'Thanh toán bất thường', exact: true }).click();
    await expect(staff.getByRole('heading', { name: 'Thanh toán cần đối soát', exact: true })).toBeVisible();
  };
  const decide = async (scope, action, note) => {
    await scope.getByLabel('Hướng xử lý thanh toán').selectOption(action);
    await scope.getByLabel('Căn cứ và hướng dẫn đối soát').fill(note);
    await scope.getByRole('checkbox').check();
    await scope.getByRole('button', { name: 'Lưu quyết định đối soát', exact: true }).click();
  };
  await openQueue();
  await staff.getByRole('button', { name: 'Xem và xử lý đối soát', exact: true }).click();
  const review = staff.getByRole('dialog', { name: 'Xử lý thanh toán bất thường', exact: true });
  await expect(review).toContainText('REVIEW-BANK-EXTRA-001');
  await decide(review, 'ACCEPT_PAYMENT', 'Đã kiểm tra hàng sẵn và người mua đồng ý tiếp tục đơn');
  await expect(review).toContainText('Đã lưu quyết định và thông báo cho người mua.');
  expect((await Order.findById(extra.order._id)).paymentStatus).toBe('PAID');
  expect((await Commission.findOne({ orderId: extra.order._id })).sellerProceeds).toBe(90000);
  expect((await Payment.findById(extra.payment._id)).exceptionReviewState).toBe('OPEN');
  console.log('PASS admin allocates the exact order total and keeps the excess separate');
  await decide(review, 'REFUND_UNALLOCATED', 'Hoàn lại phần dư hai mươi nghìn cho người mua');
  await expect(review.getByRole('button', { name: 'Xem khoản hoàn chênh lệch', exact: true })).toBeVisible();
  const refund = await Refund.findOne({ paymentId: extra.payment._id, kind: 'RECEIPT_ADJUSTMENT' });
  expect(refund.amount).toBe(20000); expect(refund.orderId).toBeUndefined();
  await requireBackend('./src/services/notificationEvent.service').processBatch({ limit: 50 });
  await buy.goto(`${base}/?view=notifications`);
  const refundNotice = buy.locator('.member-notification').filter({ hasText: 'Sifit đã duyệt hoàn' });
  // Open the notification carrying the refund resource; payment notices remain separate.
  const notices = await model('notification').find({ recipientId: buyer._id, resourceType: 'REFUND' });
  expect(notices.length).toBeGreaterThan(0);
  await refundNotice.getByRole('button', { name: /Xem chi tiết/ }).click();
  await expect(buy.getByRole('heading', { name: 'Hoàn tiền chênh lệch thanh toán', exact: true })).toBeVisible();
  await buy.getByLabel('Ngân hàng nhận hoàn').selectOption('970418');
  await buy.getByLabel('Số tài khoản nhận hoàn', { exact: true }).fill('123456789');
  await buy.getByLabel('Tên chủ tài khoản', { exact: true }).fill('BUYER FIXTURE');
  await buy.getByRole('checkbox').check();
  await buy.getByRole('button', { name: 'Gửi tài khoản nhận hoàn', exact: true }).click();
  await expect(buy.locator('.refund-details')).toContainText('Chờ admin kiểm tra tài khoản');
  resetBudget();
  await review.getByRole('button', { name: 'Xem khoản hoàn chênh lệch', exact: true }).click();
  const refundDetails = staff.locator('.refund-details');
  await refundDetails.getByRole('button', { name: 'Duyệt tài khoản và chuyển khoản', exact: true }).click();
  await expect(refundDetails).toContainText('Đã duyệt, chờ chuyển khoản');
  await refundDetails.getByLabel('Ảnh chứng từ hoàn tiền', { exact: true }).setInputFiles({ name: 'review-receipt.png', mimeType: 'image/png', buffer: png });
  await refundDetails.getByRole('button', { name: 'Lưu chứng từ hoàn tiền', exact: true }).click();
  await expect(refundDetails.getByRole('status')).toContainText('Đã lưu chứng từ hoàn tiền.');
  await refundDetails.getByLabel('Mã giao dịch hoàn tiền', { exact: true }).fill('REVIEW-RETURN-EXCESS-001');
  await refundDetails.getByLabel('Ghi chú đối chiếu hoàn tiền', { exact: true }).fill('Đã kiểm tra đúng người nhận và số tiền dư đã chuyển');
  await refundDetails.getByRole('checkbox').check();
  await refundDetails.getByRole('button', { name: 'Ghi nhận đã hoàn tiền', exact: true }).click();
  await expect(refundDetails).toContainText('Đã hoàn tiền');
  const paid = await Payment.findById(extra.payment._id);
  expect(paid.exceptionRefundedAmount).toBe(20000); expect(paid.refundedAmount).toBe(0);
  expect(paid.exceptionReviewState).toBe('RESOLVED');
  expect((await Commission.findOne({ orderId: extra.order._id })).sellerProceeds).toBe(90000);
  expect((await Order.findById(extra.order._id)).paymentStatus).toBe('PAID');
  await buy.reload(); await expect(buy.locator('.refund-details')).toContainText('REVIEW-RETURN-EXCESS-001');
  const download = buy.waitForEvent('download');
  await buy.getByRole('button', { name: 'Tải chứng từ hoàn tiền', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('sifit-refund');
  console.log('PASS buyer bank submission, admin proof and excess refund without reducing seller proceeds');
  await openQueue();
  await expect(staff.getByText('Chưa có dữ liệu phù hợp.', { exact: true })).toBeVisible();
  await staff.getByLabel('Lọc trạng thái đối soát').selectOption('RESOLVED');
  await staff.getByRole('button', { name: 'Xem và xử lý đối soát', exact: true }).click();
  await expect(review).toContainText('Đã ghi nhận hoàn chênh lệch');
  await review.getByRole('button', { name: 'Đóng cửa sổ', exact: true }).click();
  console.log('PASS resolved cases leave the pending queue and retain their decision history');
  const partial = await fixture(12345679, 'Underpaid integration skirt');
  await income(partial.payment, 30000, 'REVIEW-BANK-PARTIAL-001');
  await staff.getByLabel('Lọc trạng thái đối soát').selectOption('');
  await staff.getByRole('button', { name: 'Xem và xử lý đối soát', exact: true }).click();
  await decide(review, 'WAIT_TOPUP', 'Vui lòng bổ sung bảy mươi nghìn trước khi hết hạn giữ hàng');
  await expect(review).toContainText('Đã lưu quyết định và thông báo cho người mua.');
  expect((await Payment.findById(partial.payment._id)).exceptionReviewState).toBe('WAITING_TOPUP');
  await requireBackend('./src/services/notificationEvent.service').processBatch({ limit: 50 });
  await buy.goto(`${base}/?view=notifications`);
  await buy.locator('.member-notification').filter({ hasText: 'Vui lòng bổ sung bảy mươi nghìn' }).getByRole('button', { name: /Xem chi tiết/ }).click();
  await expect(buy.locator('.payment-exception-details')).toContainText('REVIEW-BANK-PARTIAL-001');
  await expect(buy.locator('.payment-exception-details')).toContainText('Vui lòng bổ sung bảy mươi nghìn');
  await expect(buy.getByLabel('Hướng xử lý thanh toán')).toHaveCount(0);
  await buy.reload();
  await expect(buy.locator('.payment-exception-details')).toContainText('Đang chờ bổ sung tiền');
  await fs.mkdir('artifacts/payment-exceptions', { recursive: true });
  await staff.screenshot({ path: 'artifacts/payment-exceptions/admin-desktop.png', fullPage: true });
  await buy.screenshot({ path: 'artifacts/payment-exceptions/buyer-desktop.png', fullPage: true });
  await buy.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => buy.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await buy.screenshot({ path: 'artifacts/payment-exceptions/buyer-mobile.png', fullPage: true });
  await staff.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => staff.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await staff.screenshot({ path: 'artifacts/payment-exceptions/admin-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  console.log('PASS underpayment guidance, buyer deep link/reload, desktop/mobile layouts and no runtime errors');
} catch (error) {
  console.error('PAYMENT EXCEPTION INTEGRATION FAILURE', error);
  if (browser) {
    await fs.mkdir('artifacts/payment-exceptions', { recursive: true });
    for (const [i, context] of browser.contexts().entries()) for (const page of context.pages())
      await page.screenshot({ path: `artifacts/payment-exceptions/failure-${i}.png`, fullPage: true }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await browser?.close(); await vite?.close();
  if (server) { await requireBackend('./src/socket').closeSocket(); if (server.listening) await new Promise(resolve => server.close(resolve)); }
  await new Promise(resolve => setTimeout(resolve, 500));
  await mongoose.disconnect(); await mongo.stop();
}

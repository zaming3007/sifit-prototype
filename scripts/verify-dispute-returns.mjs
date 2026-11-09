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
  FRONTEND_URL: 'http://localhost:5291', SOCKET_CORS_ORIGIN: 'http://localhost:5291', SOCKET_IO_ENABLED: 'true',
  MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server'); const mongoose = requireBackend('mongoose');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); process.env.MONGODB_URI = mongo.getUri();
let browser, server, vite; const errors = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
try {
  await mongoose.connect(mongo.getUri()); const app = requireBackend('./src/app'); const socket = requireBackend('./src/socket');
  const { apiLimiter } = requireBackend('./src/middlewares/rateLimit.middleware'); const resetBudget = () => apiLimiter.resetKey('127.0.0.1');
  const model = name => requireBackend(`./src/models/${name}.model`);
  const User = model('user'), Order = model('order'), Group = model('checkoutGroup'), Payment = model('payment'), Dispute = model('dispute');
  await Promise.all(Object.values(mongoose.models).map(item => item.init()));
  const password = 'DisputeIntegration123!'; const passwordHash = await requireBackend('argon2').hash(password);
  const [buyer, seller, admin] = await User.create(['BUYER', 'SELLER', 'ADMIN'].map((role, i) => ({ role, fullName: `Return ${role}`, email: `return${i}@fixture.test`, passwordHash })));
  const past = new Date(Date.now() - 86400000);
  const group = await Group.create({ buyerId: buyer._id, idempotencyKey: randomUUID(), requestFingerprint: 'return-fixture', subtotal: 100000, buyerTotal: 100000, paymentStatus: 'PAID', orderStatus: 'DELIVERED', reservationExpiresAt: past });
  const order = await Order.create({ checkoutGroupId: group._id, buyerId: buyer._id, sellerId: seller._id,
    items: [{ productId: new mongoose.Types.ObjectId(), title: 'Return integration jacket', price: 100000, quantity: 1 }],
    shippingAddress: { recipientName: buyer.fullName, phone: '0901234567', addressLine: 'Street', ward: 'Ward', city: 'City' },
    subtotal: 100000, buyerTotal: 100000, commissionRateBasisPoints: 1000, commissionAmount: 10000, sellerProceeds: 90000,
    paymentStatus: 'PAID', orderStatus: 'DELIVERED', deliveredAt: past, protectionEndsAt: new Date(Date.now() + 86400000), reservationExpiresAt: past });
  group.orderIds = [order._id]; await group.save();
  await model('commission').create({ orderId: order._id, sellerId: seller._id, subtotal: 100000, commissionRateBasisPoints: 1000, commissionAmount: 10000, sellerProceeds: 90000 });
  const payment = await Payment.create({ checkoutGroupId: group._id, buyerId: buyer._id, provider: 'payos', providerPaymentId: randomUUID(), merchantReference: randomUUID(), amount: 100000,
    status: 'SUCCEEDED', paidAt: past, idempotencyKey: randomUUID(), requestFingerprint: 'return-fixture', expiresAt: past });
  await model('paymentTransaction').create({ paymentId: payment._id, checkoutGroupId: group._id, provider: 'payos', reference: 'RETURN-INCOMING-12345', providerPaymentId: payment.providerPaymentId,
    merchantReference: payment.merchantReference, amount: 100000, currency: 'VND', status: 'MATCHED', source: 'WEBHOOK', occurredAt: past });
  server = http.createServer(app); socket.initSocket(server); await new Promise(resolve => server.listen(5052, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5291, strictPort: true }, define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5052/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5052') } }); await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true }); const base = 'http://localhost:5291';
  const login = async user => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const page = await context.newPage();
    page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?view=auth`); await page.locator('input[type=email]').fill(user.email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.locator('.auth-submit').click(); await expect(page.locator('.account-button')).toBeVisible(); return page;
  };
  const buy = await login(buyer); resetBudget();
  await buy.getByRole('button', { name: 'Đơn mua & giỏ hàng', exact: true }).click(); await buy.getByRole('button', { name: 'Mở khiếu nại', exact: true }).click();
  await buy.getByLabel('Lý do khiếu nại', { exact: true }).selectOption('DAMAGED_ITEM'); await buy.getByPlaceholder('Mô tả khiếu nại').fill('Áo nhận được có vết rách, cần shop phản hồi và xử lý.');
  await buy.getByRole('button', { name: 'Gửi khiếu nại', exact: true }).click(); await buy.getByRole('button', { name: 'Bổ sung bằng chứng và theo dõi trả hàng', exact: true }).click();
  await expect(buy.locator('.dispute-case')).toBeVisible(); const dispute = await Dispute.findOne({ orderId: order._id }); const caseUrl = buy.url();
  const addEvidence = async (page, caption, category = 'GENERAL', buffer = png) => {
    await page.getByLabel('Ảnh bằng chứng khiếu nại', { exact: true }).setInputFiles({ name: 'evidence.png', mimeType: 'image/png', buffer });
    await page.getByLabel('Loại bằng chứng', { exact: true }).selectOption(category); await page.getByLabel('Mô tả ảnh bằng chứng', { exact: true }).fill(caption);
    await page.getByRole('button', { name: 'Gửi ảnh bằng chứng', exact: true }).click(); await expect(page.getByText(caption, { exact: false }).first()).toBeVisible();
  };
  const addMessage = async (page, text) => { await page.getByLabel('Nội dung phản hồi khiếu nại', { exact: true }).fill(text); await page.getByRole('button', { name: 'Gửi phản hồi khiếu nại', exact: true }).click(); await expect(page.getByText(text, { exact: true })).toBeVisible(); };
  await addEvidence(buy, 'Ảnh vết rách ngay khi mở kiện hàng'); await addMessage(buy, 'Tôi đã mở kiện và kiểm tra, đề nghị shop xử lý vết rách.');
  const sell = await login(seller); await sell.goto(caseUrl); await addMessage(sell, 'Shop đã kiểm tra thông tin đóng gói, đồng ý phối hợp xử lý.');
  await addEvidence(sell, 'Ảnh đóng gói từ phía cửa hàng', 'GENERAL', Buffer.concat([png, Buffer.from('seller')]));
  const staff = await login(admin); resetBudget(); await staff.goto(caseUrl);
  await expect(staff.getByText('Shop đã kiểm tra thông tin đóng gói, đồng ý phối hợp xử lý.', { exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Xem ảnh bằng chứng', exact: true }).first().click(); await expect(staff.locator('.dispute-case img')).toBeVisible();
  await staff.getByLabel('Căn cứ quyết định', { exact: true }).fill('Đã đối chiếu ảnh, phản hồi của hai bên và xác nhận cần trả lại sản phẩm.');
  await staff.getByLabel('Cách xử lý hàng hóa', { exact: true }).selectOption('RETURN');
  for (const [label, value] of [['Tên người nhận hàng trả', 'Shop Fixture'], ['Điện thoại nhận hàng trả', '0901234567'], ['Địa chỉ nhận hàng trả', '123 Test Street'], ['Phường/xã nhận hàng trả', 'Phường kiểm thử'], ['Tỉnh/thành nhận hàng trả', 'TP Hồ Chí Minh']]) await staff.getByLabel(label, { exact: true }).fill(value);
  await staff.getByLabel('Hướng dẫn gửi trả', { exact: true }).fill('Đóng gói áo cùng phụ kiện, shop chịu phí gửi trả theo thỏa thuận.');
  await staff.getByRole('checkbox').check(); await staff.getByRole('button', { name: 'Chốt quyết định khiếu nại', exact: true }).click();
  await expect(staff.getByRole('region', { name: 'Theo dõi trả hàng' })).toContainText('Chờ người mua gửi trả');
  const call = (page, method, route, body = {}) => page.evaluate(async ({ method, route, body }) => {
    const { default: api } = await import('/src/services/apiClient.js'); try { const result = await api.request({ method, url: route, data: body }); return { status: result.status, data: result.data }; }
    catch (error) { return { status: error.response?.status, data: error.response?.data }; }
  }, { method, route, body });
  const refundBody = () => ({ paymentId: payment.id, orderId: order.id, disputeId: dispute.id, amount: 50000, reason: 'Hoàn tiền theo quyết định xử lý khiếu nại', idempotencyKey: randomUUID() });
  expect((await call(staff, 'post', '/admin/manual-refunds', refundBody())).status).toBe(409);
  console.log('PASS buyer/seller private evidence, replies and admin return decision with refund hold');
  resetBudget(); await buy.reload(); await expect(buy.getByRole('region', { name: 'Theo dõi trả hàng' })).toContainText('123 Test Street');
  await addEvidence(buy, 'Biên nhận kiện hàng gửi trả', 'RETURN_SHIPPING', Buffer.concat([png, Buffer.from('return')]));
  await buy.getByLabel('Đơn vị vận chuyển trả', { exact: true }).fill('Fixture Carrier'); await buy.getByLabel('Mã vận đơn trả', { exact: true }).fill('RETURN-BROWSER-12345');
  await buy.getByLabel('Ghi chú gửi trả', { exact: true }).fill('Đã đóng gói đầy đủ và bàn giao hàng cho đơn vị vận chuyển.');
  await buy.getByRole('button', { name: 'Lưu vận đơn trả hàng', exact: true }).click();
  await expect(buy.getByRole('region', { name: 'Theo dõi trả hàng' })).toContainText('Người mua đã khai báo vận đơn trả');
  await sell.reload(); await sell.getByLabel('Ghi chú kiểm tra hàng trả', { exact: true }).fill('Shop đã nhận lại đúng sản phẩm và kiểm tra tình trạng.');
  await sell.getByRole('checkbox').check(); await sell.getByRole('button', { name: 'Xác nhận đã nhận lại hàng', exact: true }).click();
  await expect(sell.getByRole('region', { name: 'Theo dõi trả hàng' })).toContainText('Người bán đã nhận lại, chờ admin kiểm tra');
  expect((await call(staff, 'post', '/admin/manual-refunds', refundBody())).status).toBe(409);
  await staff.reload(); await staff.getByLabel('Căn cứ xác minh trả hàng', { exact: true }).fill('Đã đối chiếu vận đơn, biên nhận và phản hồi nhận hàng của người bán.');
  await staff.getByRole('checkbox').check(); await staff.getByRole('button', { name: 'Xác minh đã nhận lại, cho phép bước hoàn tiền', exact: true }).click();
  await expect(staff.getByRole('region', { name: 'Theo dõi trả hàng' })).toContainText('Admin đã xác minh nhận lại hàng');
  console.log('PASS buyer return tracking, seller receipt and independent admin verification');
  resetBudget(); await staff.getByRole('button', { name: 'Khiếu nại', exact: true }).click();
  await staff.getByRole('button', { name: 'Xử lý hoàn tiền cho đơn này', exact: true }).click();
  await staff.getByRole('button', { name: 'Tạo yêu cầu hoàn tiền', exact: true }).click();
  const dialog = staff.getByRole('dialog', { name: 'Duyệt khoản hoàn cho người mua' });
  await expect(dialog.getByLabel('Đơn hàng cần hoàn')).toHaveValue(order.id);
  await dialog.getByLabel('Số tiền duyệt hoàn (VND)', { exact: true }).fill('50000'); await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Duyệt khoản hoàn và yêu cầu tài khoản', exact: true }).click(); await expect(dialog).not.toBeVisible();
  const refund = await model('refund').findOne({ orderId: order._id }); expect(String(refund.disputeId)).toBe(dispute.id); expect(refund.amount).toBe(50000);
  await buy.reload(); await expect(buy.getByRole('button', { name: 'Gửi ảnh bằng chứng', exact: true })).toHaveCount(0);
  await buy.getByRole('button', { name: 'Xem ảnh bằng chứng', exact: true }).first().click();
  const download = buy.waitForEvent('download'); await buy.getByRole('link', { name: 'Tải ảnh bằng chứng', exact: true }).first().click(); expect((await download).suggestedFilename()).toContain('dispute-evidence');
  await fs.mkdir('artifacts/dispute-returns', { recursive: true }); await buy.screenshot({ path: 'artifacts/dispute-returns/buyer-desktop.png', fullPage: true });
  await buy.setViewportSize({ width: 390, height: 844 }); await expect.poll(() => buy.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await buy.screenshot({ path: 'artifacts/dispute-returns/buyer-mobile.png', fullPage: true });
  await requireBackend('./src/services/notificationEvent.service').processBatch({ limit: 50 });
  expect(await model('notification').countDocuments({ type: 'DISPUTE_UPDATED' })).toBeGreaterThan(0); expect(errors).toEqual([]);
  console.log('PASS refund handoff after verification, private image download, mobile layout and no runtime errors');
} catch (error) {
  console.error('DISPUTE RETURN INTEGRATION FAILURE', error); process.exitCode = 1;
  if (browser) { await fs.mkdir('artifacts/dispute-returns', { recursive: true }); for (const [i, context] of browser.contexts().entries()) for (const page of context.pages()) await page.screenshot({ path: `artifacts/dispute-returns/failure-${i}.png`, fullPage: true }).catch(() => {}); }
} finally {
  await browser?.close(); await vite?.close(); if (server) { await requireBackend('./src/socket').closeSocket(); if (server.listening) await new Promise(resolve => server.close(resolve)); }
  await new Promise(resolve => setTimeout(resolve, 500));
  await mongoose.disconnect(); await mongo.stop();
}

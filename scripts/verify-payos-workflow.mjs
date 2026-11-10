import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', PAYMENTS_ENABLED: 'true', PAYMENT_PROVIDER: 'payos', SHIPPING_PROVIDER: 'manual', PAYOUT_MODE: 'manual', PAYOUT_HOLD_DAYS: '0', PAYOS_CLIENT_ID: 'fixture', PAYOS_API_KEY: 'fixture', PAYOS_CHECKSUM_KEY: 'fixture-checksum', FRONTEND_URL: 'http://localhost:5289', SOCKET_CORS_ORIGIN: 'http://localhost:5289', SOCKET_IO_ENABLED: 'true', MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server');
const mongoose = requireBackend('mongoose'); const argon2 = requireBackend('argon2'); const { PayOS } = requireBackend('@payos/node');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); process.env.MONGODB_URI = mongo.getUri();
let browser, vite, server, socket, ipBudgetTimer; const errors = [];
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const sdk = new PayOS({ clientId: 'fixture', apiKey: 'fixture', checksumKey: 'fixture-checksum', logLevel: 'off' });
  sdk.paymentRequests.create = async data => ({ ...data, currency: 'VND', paymentLinkId: `fixture${data.orderCode}`, checkoutUrl: `https://pay.payos.vn/web/fixture${data.orderCode}`, qrCode: `SIFIT-FIXTURE-NOT-A-PAYMENT-${data.orderCode}`, bin: '970422', accountName: 'SIFIT FIXTURE', accountNumber: '12345678' });
  sdk.paymentRequests.get = async () => { throw new Error('External PayOS network disabled in browser test'); };
  requireBackend('./src/config/payos').getClient = () => sdk;
  const app = requireBackend('./src/app'); socket = requireBackend('./src/socket');
  const User = requireBackend('./src/models/user.model'); const Category = requireBackend('./src/models/category.model'); const Product = requireBackend('./src/models/product.model'); const Cart = requireBackend('./src/models/cart.model'); const Address = requireBackend('./src/models/address.model'); const Order = requireBackend('./src/models/order.model'); const Payment = requireBackend('./src/models/payment.model'); const Payout = requireBackend('./src/models/sellerPayout.model'); const Profile = requireBackend('./src/models/sellerProfile.model'); const Shipment = requireBackend('./src/models/shipment.model'); const Receipt = requireBackend('./src/models/paymentTransaction.model');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const passwordHash = await argon2.hash('PayosBrowser123!');
  const [buyer, seller, admin] = await User.create(['BUYER', 'SELLER', 'ADMIN'].map(role => ({ fullName: `${role} PayOS`, email: `${role.toLowerCase()}@payos.test`, role, passwordHash })));
  await Profile.create({ userId: seller._id, shopName: 'Sifit Fixture', shopSlug: 'sifit-fixture', verificationStatus: 'VERIFIED' });
  const category = await Category.create({ name: 'Áo', slug: 'ao' });
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XioAAAAASUVORK5CYII=';
  const product = await Product.create({ sellerId: seller._id, categoryId: category._id, title: 'Áo sơ mi PayOS fixture', description: 'A cotton shirt for isolated UI verification', price: 150000, size: 'M', condition: 'GOOD', status: 'ACTIVE', images: [{ url: image, publicId: 'fixture/shirt' }] });
  await Cart.create({ userId: buyer._id, items: [{ productId: product._id }] });
  const address = { recipientName: 'Fixture User', phone: '0901234567', addressLine: '123 Fixture Street', ward: 'Fixture Ward', province: 'Hồ Chí Minh', label: 'Nhà', isDefault: true };
  await Address.create({ ...address, userId: buyer._id, addressType: 'SHIPPING' }); await Address.create({ ...address, userId: seller._id, addressType: 'PICKUP' });
  server = http.createServer(app); socket.initSocket(server); await new Promise(resolve => server.listen(5059, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5289, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5059/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5059') } }); await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true }); await fs.mkdir('artifacts/payos', { recursive: true });
  const resetIp = () => { const limiter = requireBackend('./src/middlewares/rateLimit.middleware').apiLimiter; for (const ip of ['127.0.0.1', '::ffff:127.0.0.1', '::1', '::/56']) limiter.resetKey(ip); };
  // Three concurrent actors and their sockets share one test IP. Keep that
  // unrelated flood counter isolated; financial/account guards stay active.
  ipBudgetTimer = setInterval(resetIp, 1000);
  const login = async user => { resetIp(); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.on('pageerror', error => errors.push(error.message)); await page.goto('http://localhost:5289/?view=auth'); await page.getByLabel('Email', { exact: true }).fill(user.email); await page.getByLabel('Mật khẩu', { exact: true }).fill('PayosBrowser123!'); await page.locator('.auth-submit').click(); await expect(page.locator('.account-button')).toBeVisible(); return page; };
  const buy = await login(buyer); await buy.goto('http://localhost:5289/?view=checkout');
  await buy.getByRole('button', { name: /Đặt hàng \(1 sản phẩm\)/ }).click();
  await expect(buy.getByRole('img', { name: 'Mã QR thanh toán PayOS' })).toBeVisible();
  await buy.screenshot({ path: 'artifacts/payos/buyer-qr-desktop.png', fullPage: true });
  await buy.setViewportSize({ width: 390, height: 844 }); await expect.poll(() => buy.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await buy.screenshot({ path: 'artifacts/payos/buyer-qr-mobile.png', fullPage: true });
  const payment = await Payment.findOne(); const data = { orderCode: Number(payment.merchantReference), amount: payment.amount, currency: 'VND', paymentLinkId: payment.providerPaymentId, reference: 'FIXTURE-BANK-RECEIPT', code: '00', transactionDateTime: '2026-11-08 12:00:00' };
  const webhook = { code: '00', desc: 'success', success: true, data, signature: await sdk.crypto.createSignatureFromObj(data, sdk.checksumKey) };
  const response = await fetch('http://localhost:5059/api/v1/webhooks/payments/payos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(webhook) }); expect(response.status).toBe(200);
  await buy.getByRole('button', { name: 'Kiểm tra thanh toán', exact: true }).click();
  await expect(buy.locator('.payment-panel')).toContainText('Đã xác nhận thanh toán'); expect(await Receipt.countDocuments()).toBe(1);
  console.log('PASS automatic QR after checkout, mobile layout and verified PayOS payment');
  const sell = await login(seller); await sell.getByRole('button', { name: 'Đơn bán', exact: true }).click();
  await sell.getByRole('button', { name: 'Xác nhận chuẩn bị hàng', exact: true }).click();
  await sell.getByRole('button', { name: 'Tạo vận đơn', exact: true }).click();
  await sell.locator('.workflow-form').getByLabel('Địa chỉ lấy hàng', { exact: true }).selectOption({ index: 1 });
  await sell.getByLabel('Đơn vị vận chuyển', { exact: true }).fill('Fixture Carrier'); await sell.getByLabel('Mã vận đơn đã đặt', { exact: true }).fill('FIXTURE-SHIP-001');
  await sell.getByRole('button', { name: 'Lưu vận đơn đã đặt', exact: true }).click();
  await sell.getByLabel('Căn cứ bàn giao hàng', { exact: true }).fill('Đã bàn giao tại bưu cục, biên nhận fixture 001.');
  await sell.getByRole('button', { name: 'Xác nhận đã bàn giao hàng', exact: true }).click();
  await expect.poll(async () => (await Order.findOne()).orderStatus).toBe('SHIPPED');
  resetIp(); await buy.reload(); await buy.getByRole('button', { name: 'Đơn mua', exact: true }).click();
  await buy.getByRole('button', { name: 'Xác nhận đã nhận hàng', exact: true }).click();
  await expect.poll(async () => Boolean((await Order.findOne()).buyerConfirmedAt)).toBe(true);
  const order = await Order.findOne(); expect((await Shipment.findOne()).status).toBe('DELIVERED');
  const adm = await login(admin); await adm.goto(`http://localhost:5289/?view=resource&type=ORDER&id=${order.id}`);
  await adm.getByRole('button', { name: 'Kiểm tra & hoàn tất đơn', exact: true }).click();
  await adm.getByLabel('Căn cứ hoàn tất đơn', { exact: true }).fill('Đã đối chiếu giao hàng và xác nhận nhận hàng của người mua.');
  await adm.getByRole('button', { name: 'Xác nhận hoàn tất đơn', exact: true }).click();
  await expect.poll(async () => (await Order.findOne()).orderStatus).toBe('COMPLETED');
  console.log('PASS seller-booked shipment, handover, buyer confirmation and explicit admin completion');
  await sell.getByRole('button', { name: 'Chi trả', exact: true }).click();
  for (const [label, value] of [['Tên ngân hàng', 'Fixture Bank'], ['Mã BIN ngân hàng (6 số)', '970422'], ['Số tài khoản nhận tiền', '12345678'], ['Tên chủ tài khoản', 'SELLER PAYOS']]) await sell.getByLabel(label, { exact: true }).fill(value);
  await sell.getByRole('button', { name: 'Lưu tài khoản nhận tiền', exact: true }).click(); await expect(sell.getByRole('status')).toContainText('Đã lưu tài khoản');
  // A legacy VERIFIED profile flag no longer grants manual payout eligibility.
  // Prepare the disposable seller through the actual private-review services;
  // the dedicated verification browser suite covers these forms end to end.
  const verificationService = requireBackend('./src/services/sellerVerification.service');
  const draft = await verificationService.createDraft(seller, { legalName: 'Seller PayOS', phone: '0901234567', contactAddress: '123 Fixture Street, Fixture City' });
  const document = Buffer.from(image.split(',')[1], 'base64');
  for (const kind of ['OWNER_IDENTITY', 'BANK_OWNERSHIP']) await verificationService.uploadDocument(seller, draft.id, kind, { buffer: document, size: document.length });
  const submitted = await verificationService.submitVerification(seller, { verificationId: draft.id, expectedVersion: 2, ownsAccount: true, consent: true });
  await verificationService.review({ id: draft.id, admin, status: 'VERIFIED', expectedVersion: submitted.contentVersion, reason: 'Disposable fixture: reviewed owner and bank documents', checkedDocuments: true });
  console.log('PASS seller payout fixture uses an approved manual dossier matching the saved bank');
  await adm.getByRole('button', { name: 'Tài chính', exact: true }).click(); await adm.getByRole('button', { name: 'Chi trả người bán', exact: true }).click();
  await adm.getByRole('button', { name: 'Kiểm tra đơn đủ điều kiện chi trả', exact: true }).click(); await expect(adm.locator('.ops-success')).toContainText('0 khoản chi');
  // Advance only this disposable fixture's protection deadline, never production data.
  await Order.updateOne({ _id: order._id }, { protectionEndsAt: new Date(Date.now() - 1000) });
  await adm.getByRole('button', { name: 'Kiểm tra đơn đủ điều kiện chi trả', exact: true }).click();
  await adm.getByRole('button', { name: 'Duyệt chi trả', exact: true }).click(); await adm.getByRole('button', { name: 'Xác nhận duyệt chi trả', exact: true }).click();
  await expect.poll(async () => (await Payout.findOne()).status).toBe('APPROVED');
  await adm.getByRole('button', { name: 'Ghi nhận chuyển khoản cho người bán', exact: true }).click();
  await expect(adm.getByRole('dialog')).toContainText('12345678');
  await adm.getByLabel('Mã giao dịch ngân hàng', { exact: true }).fill('FIXTURE-TRANSFER-001');
  await adm.getByLabel('Ghi chú đối chiếu chuyển khoản', { exact: true }).fill('Fixture only: ngân hàng thử nghiệm đã xác nhận giao dịch.');
  await adm.getByRole('checkbox').check(); await adm.getByRole('button', { name: 'Ghi nhận đã chuyển tiền', exact: true }).click();
  await expect.poll(async () => (await Payout.findOne()).status).toBe('PAID');
  await adm.getByRole('button', { name: 'Tiền thực nhận', exact: true }).click(); await expect(adm.locator('.ops-page')).toContainText('FIXTURE-BANK-RECEIPT');
  await adm.screenshot({ path: 'artifacts/payos/admin-receipts.png', fullPage: true });
  expect(errors).toEqual([]); console.log('PASS private bank account, protection hold, payout approval/transfer evidence and receipt history');
} catch (error) {
  console.error('PAYOS UI FAILURE', error); process.exitCode = 1;
  if (browser) for (const [index, context] of browser.contexts().entries()) { const page = context.pages()[0]; if (page) { await page.screenshot({ path: `artifacts/payos/failure-${index}.png`, fullPage: true }).catch(() => {}); console.error((await page.locator('body').innerText()).slice(-1300)); } }
} finally {
  clearInterval(ipBudgetTimer);
  await browser?.close(); await vite?.close(); await socket?.closeSocket(); if (server?.listening) await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => setTimeout(resolve, 500)); await mongoose.disconnect(); await mongo.stop();
}

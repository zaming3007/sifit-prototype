import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', BACKGROUND_JOBS_ENABLED: 'false', PAYMENT_PROVIDER: 'simulator', SHIPPING_PROVIDER: 'simulator', PAYOUT_MODE: 'simulation', PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '', FRONTEND_URL: 'http://localhost:5292', SOCKET_CORS_ORIGIN: 'http://localhost:5292', SOCKET_IO_ENABLED: 'true', MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server'); const mongoose = requireBackend('mongoose'); const argon2 = requireBackend('argon2');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); process.env.MONGODB_URI = mongo.getUri();
let browser, vite, server, socket, ipBudget; const errors = [];
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const app = requireBackend('./src/app'); socket = requireBackend('./src/socket');
  const User = requireBackend('./src/models/user.model'); const Shop = requireBackend('./src/models/sellerProfile.model'); const Product = requireBackend('./src/models/product.model'); const Category = requireBackend('./src/models/category.model'); const Offer = requireBackend('./src/models/offer.model'); const Order = requireBackend('./src/models/order.model'); const Payment = requireBackend('./src/models/payment.model'); const Address = requireBackend('./src/models/address.model');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const passwordHash = await argon2.hash('OfferBrowser123!');
  const [buyer, seller] = await User.create(['BUYER', 'SELLER'].map((role, index) => ({ role, fullName: `${role} Offer ${index}`, email: `offer${index}@browser.test`, passwordHash })));
  await Shop.create({ userId: seller._id, shopName: 'Sifit Selected', shopSlug: 'sifit-selected', verificationStatus: 'VERIFIED' });
  await Address.create({ userId: buyer._id, label: 'Nhà', recipientName: 'Buyer Offer', phone: '0901234567', addressLine: '123 Test Street', ward: 'Ward', province: 'City', addressType: 'SHIPPING', isDefault: true });
  const category = await Category.create({ name: 'Áo', slug: 'ao' });
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XioAAAAASUVORK5CYII=';
  const body = { sellerId: seller._id, categoryId: category._id, description: 'A pre-loved cotton shirt', price: 100000, brand: 'Sifit', size: 'M', condition: 'GOOD', status: 'ACTIVE', images: [{ url: image, publicId: 'fixture/offer' }] };
  const [accepted, rejected, withdrawn, expired] = await Product.create(['Áo cotton dáng rộng', 'Áo sơ mi xanh nhạt', 'Áo linen mùa hè', 'Áo khoác nhẹ'].map(title => ({ ...body, title })));
  server = http.createServer(app); socket.initSocket(server); await new Promise(resolve => server.listen(5058, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5292, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5058/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5058') } }); await vite.listen();
  ipBudget = setInterval(() => requireBackend('./src/middlewares/rateLimit.middleware').apiLimiter.resetKey('127.0.0.1'), 1000);
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true }); await fs.mkdir('artifacts/offers', { recursive: true });
  const newPage = async () => { const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.on('pageerror', error => errors.push(error.message)); return page; };
  const login = async user => { const page = await newPage(); await page.goto('http://localhost:5292/?view=auth'); await page.getByLabel('Email', { exact: true }).fill(user.email); await page.getByLabel('Mật khẩu', { exact: true }).fill('OfferBrowser123!'); await page.locator('.auth-submit').click(); await expect(page.locator('.account-button')).toBeVisible(); return page; };
  const openProduct = async (page, product) => { await page.goto('http://localhost:5292/?view=catalog'); await page.locator('.product-title').filter({ hasText: product.title }).click(); await expect(page.getByRole('button', { name: 'Mặc Cả', exact: true })).toBeVisible(); };
  const guest = await newPage(); await openProduct(guest, accepted); await guest.getByRole('button', { name: 'Mặc Cả', exact: true }).click(); await expect(guest.getByLabel('Email', { exact: true })).toBeVisible(); await guest.close();
  const buy = await login(buyer); const sell = await login(seller);
  const send = async product => {
    await openProduct(buy, product); await buy.getByRole('button', { name: 'Mặc Cả', exact: true }).click();
    const dialog = buy.getByRole('dialog', { name: 'Gửi đề nghị giá' });
    await dialog.getByLabel('Giá bạn đề nghị (đ)').fill('80000'); await dialog.getByLabel('Lời nhắn cho shop').fill('Mình muốn mua với giá này nhé.');
    await dialog.getByRole('button', { name: 'Gửi đề nghị', exact: true }).click(); await expect(dialog.getByRole('status')).toContainText('Đã gửi đề nghị');
    await dialog.getByRole('button', { name: 'Xem đề nghị của tôi', exact: true }).click();
    return Offer.findOne({ productId: product._id });
  };
  const first = await send(accepted); expect((await Product.findById(accepted.id)).status).toBe('ACTIVE');
  await sell.getByRole('button', { name: 'Đề nghị giá', exact: true }).click();
  const sellerCard = sell.locator(`[data-offer-id="${first.id}"]`); await expect(sellerCard).toBeVisible();
  await sellerCard.getByLabel('Ghi chú phản hồi').fill('Shop đồng ý, bạn đặt hàng trong hôm nay nhé.');
  await sellerCard.getByRole('button', { name: 'Chấp nhận giá', exact: true }).click(); await expect(sellerCard.locator('.offer-status')).toHaveText('Đã chấp nhận');
  await sell.screenshot({ path: 'artifacts/offers/seller-desktop.png', fullPage: true });
  await buy.goto('http://localhost:5292/?view=offers'); const buyerCard = buy.locator(`[data-offer-id="${first.id}"]`); await expect(buyerCard).toContainText('Shop đồng ý');
  await buy.reload(); await expect(buy.locator(`[data-offer-id="${first.id}"] .offer-status`)).toHaveText('Đã chấp nhận');
  await buy.goto('http://localhost:5292/?view=notifications'); const notice = buy.locator('.member-notification').filter({ hasText: 'Đề nghị giá đã được chấp nhận' }); await notice.getByRole('button', { name: /Xem chi tiết/ }).click(); await expect(buy.getByRole('heading', { name: 'Chi tiết đề nghị giá', exact: true })).toBeVisible();
  await buy.reload(); await expect(buy.locator('.offer-card')).toContainText(accepted.title);
  await buy.getByRole('button', { name: /Đặt hàng với giá này/ }).click(); await expect(buy.locator('.checkout-offer-choice input')).toBeChecked(); await expect(buy.locator('.checkout-total strong')).toContainText('80.000');
  await buy.locator('.checkout-offer-choice input').uncheck(); await expect(buy.locator('.checkout-total strong')).toContainText('100.000');
  await buy.locator('.checkout-offer-choice input').check(); await expect(buy.locator('.checkout-total strong')).toContainText('80.000');
  await buy.screenshot({ path: 'artifacts/offers/cart-desktop.png', fullPage: true });
  await buy.getByRole('button', { name: /Đặt hàng \(1 sản phẩm\)/ }).click(); await expect.poll(async () => Order.countDocuments()).toBe(1);
  expect((await Order.findOne()).subtotal).toBe(80000); await expect.poll(async () => (await Payment.findOne())?.amount).toBe(80000); expect((await Offer.findById(first.id)).status).toBe('CHECKED_OUT');
  console.log('PASS guest prompt, persistent negotiation, seller acceptance, notification deep link, checkout opt-in and trusted payment totals');
  const second = await send(rejected); await sell.getByRole('button', { name: 'Làm mới đề nghị', exact: true }).click();
  await sell.locator(`[data-offer-id="${second.id}"]`).getByRole('button', { name: 'Từ chối', exact: true }).click();
  await expect.poll(async () => (await Offer.findById(second.id)).status).toBe('REJECTED');
  const third = await send(withdrawn); await buy.locator(`[data-offer-id="${third.id}"]`).getByRole('button', { name: 'Rút đề nghị', exact: true }).click(); await expect.poll(async () => (await Offer.findById(third.id)).status).toBe('WITHDRAWN');
  const last = await send(expired); await Offer.updateOne({ _id: last.id }, { expiresAt: new Date(Date.now() - 1000) }); await requireBackend('./src/services/offer.service').expireOffers();
  await buy.reload(); await expect(buy.locator(`[data-offer-id="${last.id}"] .offer-status`)).toHaveText('Đã hết hạn');
  await buy.getByLabel('Trạng thái', { exact: true }).selectOption('REJECTED'); await expect(buy.locator('.offer-card')).toHaveCount(1); await expect(buy.locator('.offer-card')).toContainText(rejected.title);
  await buy.getByLabel('Trạng thái', { exact: true }).selectOption(''); await expect(buy.locator('.offer-card')).toHaveCount(4);
  await buy.screenshot({ path: 'artifacts/offers/buyer-desktop.png', fullPage: true });
  for (const width of [320, 390, 768]) { await buy.setViewportSize({ width, height: 844 }); await expect.poll(() => buy.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await buy.screenshot({ path: `artifacts/offers/buyer-${width}.png`, fullPage: true }); }
  expect(errors).toEqual([]); console.log('PASS rejection, withdrawal, automatic expiry, history filters, responsive layouts and no browser runtime errors');
} catch (error) {
  console.error('OFFER UI FAILURE', error); process.exitCode = 1;
  if (browser) for (const [index, context] of browser.contexts().entries()) { const page = context.pages()[0]; if (page) { await page.screenshot({ path: `artifacts/offers/failure-${index}.png`, fullPage: true }).catch(() => {}); console.error((await page.locator('body').innerText()).slice(-1800)); } }
} finally {
  clearInterval(ipBudget); await browser?.close(); await vite?.close(); await socket?.closeSocket(); if (server?.listening) await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => setTimeout(resolve, 500)); await mongoose.disconnect(); await mongo.stop();
}

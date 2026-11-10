import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', PAYMENTS_ENABLED: 'true', BACKGROUND_JOBS_ENABLED: 'false', PAYMENT_PROVIDER: 'simulator', SHIPPING_PROVIDER: 'manual', PAYOUT_MODE: 'manual', PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '', FRONTEND_URL: 'http://localhost:5294', SOCKET_CORS_ORIGIN: 'http://localhost:5294', SOCKET_IO_ENABLED: 'true', MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server'); const mongoose = requireBackend('mongoose');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); process.env.MONGODB_URI = mongo.getUri();
let browser, server, vite; const errors = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
try {
  await mongoose.connect(mongo.getUri()); const app = requireBackend('./src/app'), socket = requireBackend('./src/socket');
  const { apiLimiter } = requireBackend('./src/middlewares/rateLimit.middleware'); const resetBudget = () => apiLimiter.resetKey('127.0.0.1');
  const User = requireBackend('./src/models/user.model'), Profile = requireBackend('./src/models/sellerProfile.model'), Verification = requireBackend('./src/models/sellerVerification.model');
  await Promise.all(Object.values(mongoose.models).map(item => item.init()));
  const password = 'VerifyIntegration123!'; const passwordHash = await requireBackend('argon2').hash(password);
  const [seller, admin] = await User.create(['SELLER', 'ADMIN'].map((role, i) => ({ role, fullName: `Verification ${role}`, email: `verification${i}@fixture.test`, passwordHash })));
  const profile = await Profile.create({ userId: seller._id, shopName: 'Verification Studio', shopSlug: 'verification-studio' });
  server = http.createServer(app); socket.initSocket(server); await new Promise(resolve => server.listen(5057, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5294, strictPort: true }, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5057/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5057') } }); await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true }); const base = 'http://localhost:5294';
  const login = async user => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?view=auth`); await page.locator('input[type=email]').fill(user.email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password); await page.locator('.auth-submit').click(); await expect(page.locator('.account-button')).toBeVisible(); return page;
  };
  const sell = await login(seller), staff = await login(admin); resetBudget();
  await sell.getByRole('button', { name: 'Hồ sơ shop', exact: true }).click();
  await sell.getByLabel('Tên ngân hàng', { exact: true }).fill('BIDV'); await sell.getByLabel('Mã BIN ngân hàng (6 số)', { exact: true }).fill('970418');
  await sell.getByLabel('Số tài khoản nhận tiền', { exact: true }).fill('123456789'); await sell.getByLabel('Tên chủ tài khoản', { exact: true }).fill('NGUYEN DUC HOA');
  await sell.getByRole('button', { name: 'Lưu tài khoản nhận tiền', exact: true }).click(); await expect(sell.getByText('Đã lưu tài khoản nhận tiền.', { exact: true })).toBeVisible();
  const fillDraft = async () => {
    await sell.getByLabel('Họ tên chủ shop', { exact: true }).fill('Nguyễn Đức Hòa'); await sell.getByLabel('Số điện thoại xác minh', { exact: true }).fill('0901234567');
    await sell.getByLabel('Địa chỉ liên hệ xác minh', { exact: true }).fill('123 Fixture Street, Ho Chi Minh City');
    await sell.getByRole('button', { name: 'Lưu bản nháp xác minh', exact: true }).click();
    await expect(sell.getByRole('heading', { name: 'Ảnh xác minh', exact: true })).toBeVisible();
  };
  const filesAndSubmit = async () => {
    for (const label of ['Ảnh xác minh chủ shop', 'Ảnh sở hữu tài khoản ngân hàng']) {
      await sell.getByLabel(label, { exact: true }).setInputFiles({ name: 'private.png', mimeType: 'image/png', buffer: png });
      await sell.getByRole('button', { name: `Lưu ${label.toLowerCase()}`, exact: true }).click();
      await expect(sell.getByText(`Đã lưu ${label.toLowerCase()}.`, { exact: true })).toBeVisible();
    }
    await sell.getByRole('checkbox', { name: 'Tôi là chủ tài khoản ngân hàng', exact: false }).check();
    await sell.getByRole('checkbox', { name: 'Tôi đồng ý để Sifit', exact: false }).check();
    await sell.getByRole('button', { name: 'Gửi hồ sơ xác minh shop', exact: true }).click();
    await expect(sell.getByText('Đã gửi hồ sơ xác minh, đang chờ admin kiểm tra.', { exact: true })).toBeVisible();
  };
  await fillDraft(); await filesAndSubmit();
  expect((await Profile.findById(profile._id)).verificationStatus).toBe('PENDING');
  await sell.reload(); await sell.getByRole('button', { name: 'Hồ sơ shop', exact: true }).click();
  await expect(sell.getByRole('button', { name: 'Gửi hồ sơ xác minh shop', exact: true })).toHaveCount(0);
  console.log('PASS seller bank, draft, private uploads, explicit consent, submission and persisted pending dossier');
  await requireBackend('./src/services/notificationEvent.service').processBatch({ limit: 50 });
  await staff.goto(`${base}/?view=notifications`);
  await staff.locator('.member-notification').filter({ hasText: 'Có hồ sơ shop cần xác minh' }).getByRole('button', { name: /Xem chi tiết/ }).click();
  const details = staff.locator('.verification-details');
  await expect(details).toContainText('Nguyễn Đức Hòa'); await expect(details).toContainText('123456789');
  await details.getByRole('button', { name: 'Xem ảnh xác minh chủ shop', exact: true }).click();
  await expect(details.getByAltText('Ảnh xác minh chủ shop', { exact: true })).toBeVisible();
  const download = staff.waitForEvent('download'); await details.getByRole('button', { name: 'Tải ảnh xác minh chủ shop', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('sifit-verification');
  await details.getByLabel('Căn cứ duyệt hoặc yêu cầu bổ sung').fill('Ảnh ngân hàng cần rõ hơn để kiểm tra thông tin chủ tài khoản');
  await details.getByRole('button', { name: 'Yêu cầu bổ sung hồ sơ', exact: true }).click();
  await expect(details).toContainText('Đã gửi lý do để shop bổ sung hồ sơ.');
  await sell.getByRole('button', { name: 'Làm mới xác minh shop', exact: true }).click();
  await expect(sell.getByText('Lý do cần bổ sung: Ảnh ngân hàng cần rõ hơn để kiểm tra thông tin chủ tài khoản', { exact: true })).toBeVisible();
  console.log('PASS admin notification deep link, private image preview/download and rejection with seller feedback');
  resetBudget(); await fillDraft(); await filesAndSubmit();
  expect(await Verification.countDocuments({ sellerId: profile._id })).toBe(2);
  await staff.getByRole('button', { name: 'Xác minh shop', exact: true }).click();
  await staff.getByRole('button', { name: 'Kiểm tra hồ sơ xác minh', exact: true }).click();
  const dialog = staff.getByRole('dialog', { name: 'Kiểm tra xác minh shop', exact: true });
  await dialog.getByLabel('Căn cứ duyệt hoặc yêu cầu bổ sung').fill('Đã đối chiếu họ tên trên giấy tờ và thông tin sở hữu ngân hàng');
  await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: 'Duyệt xác minh shop', exact: true }).click();
  await expect(dialog).toContainText('Đã duyệt hồ sơ và thông báo cho shop.');
  await sell.getByRole('button', { name: 'Làm mới xác minh shop', exact: true }).click();
  await expect(sell.getByText(/Đã đủ điều kiện xác minh để xét chi trả/)).toBeVisible();
  await requireBackend('./src/services/sellerVerificationPolicy.service').assertVerified(seller._id);
  await dialog.getByRole('button', { name: 'Đóng cửa sổ', exact: true }).click();
  await expect(staff.getByText('Chưa có dữ liệu phù hợp.', { exact: true })).toBeVisible();
  await staff.getByLabel('Lọc hồ sơ xác minh').selectOption('VERIFIED');
  await staff.getByRole('button', { name: 'Kiểm tra hồ sơ xác minh', exact: true }).click();
  await expect(dialog).toContainText('Admin đã duyệt');
  await fs.mkdir('artifacts/verification', { recursive: true });
  await dialog.evaluate(element => { element.scrollTop = 0; });
  await staff.screenshot({ path: 'artifacts/verification/admin-desktop.png', fullPage: true });
  await sell.screenshot({ path: 'artifacts/verification/seller-desktop.png', fullPage: true });
  await staff.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => staff.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await staff.screenshot({ path: 'artifacts/verification/admin-mobile.png', fullPage: true });
  await sell.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => sell.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await sell.screenshot({ path: 'artifacts/verification/seller-mobile.png', fullPage: true });
  console.log('PASS new submission preserves old dossier, approval enables verification, filtered history and responsive layouts');
  await sell.getByLabel('Số tài khoản nhận tiền', { exact: true }).fill('987654321');
  const bankChange = sell.waitForResponse(response => response.url().endsWith('/seller/bank-account') && response.request().method() === 'PUT');
  await sell.getByRole('button', { name: 'Lưu tài khoản nhận tiền', exact: true }).click();
  expect((await bankChange).status()).toBe(200);
  await expect.poll(async () => (await Profile.findById(profile._id)).verificationStatus).toBe('NOT_SUBMITTED');
  await expect(sell.getByRole('button', { name: 'Lưu bản nháp xác minh', exact: true })).toBeVisible();
  expect((await Profile.findById(profile._id)).verificationStatus).toBe('NOT_SUBMITTED');
  await requireBackend('./src/services/notificationEvent.service').processBatch({ limit: 50 });
  expect(await requireBackend('./src/models/notification.model').countDocuments({ recipientId: seller._id, title: 'Cần xác minh lại tài khoản nhận tiền' })).toBe(1);
  expect(errors).toEqual([]);
  console.log('PASS bank edits require reverification, send notification and leave no browser runtime errors');
} catch (error) {
  console.error('VERIFICATION INTEGRATION FAILURE', error); process.exitCode = 1;
  if (browser) { await fs.mkdir('artifacts/verification', { recursive: true }); for (const [i, context] of browser.contexts().entries()) for (const page of context.pages()) await page.screenshot({ path: `artifacts/verification/failure-${i}.png`, fullPage: true }).catch(() => {}); }
} finally {
  await browser?.close(); await vite?.close();
  if (server) { await requireBackend('./src/socket').closeSocket(); if (server.listening) await new Promise(resolve => server.close(resolve)); }
  await new Promise(resolve => setTimeout(resolve, 500)); await mongoose.disconnect(); await mongo.stop();
}

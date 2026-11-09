import { chromium, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createServer } from 'vite';

// Real Sifit API and disposable MongoDB. Google UI/key delivery alone are test doubles.
// ID tokens are locally RSA-signed and validated by the real Google cryptographic verifier.
const backend = process.env.SIFIT_BACKEND_DIR || 'C:/Sifit-backend';
const requireBackend = createRequire(pathToFileURL(path.join(backend, 'package.json')));
Object.assign(process.env, { NODE_ENV: 'test', PAYMENT_PROVIDER: 'simulator', SHIPPING_PROVIDER: 'simulator', PAYOUT_MODE: 'simulation', PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '', FRONTEND_URL: 'http://localhost:5197', SOCKET_CORS_ORIGIN: 'http://localhost:5197',
  SOCKET_IO_ENABLED: 'false', GOOGLE_CLIENT_ID: '1234567890-test.apps.googleusercontent.com',
  MONGOMS_DOWNLOAD_DIR: path.join(backend, 'node_modules/.cache/mongodb-memory-server') });
const { MongoMemoryServer } = requireBackend('mongodb-memory-server');
const mongoose = requireBackend('mongoose');
const argon2 = requireBackend('argon2');
const jwt = requireBackend('jsonwebtoken');
const { OAuth2Client } = requireBackend('google-auth-library');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = keys.publicKey.export({ type: 'spki', format: 'pem' });
const originalVerifier = OAuth2Client.prototype.verifyIdToken;
OAuth2Client.prototype.verifyIdToken = function ({ idToken, audience }) {
  return this.verifySignedJwtWithCertsAsync(idToken, { test: publicPem }, audience, ['https://accounts.google.com']);
};
const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongo.getUri();
let server, vite, browser;
const errors = [];
const createPage = async profile => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('googleTestCredential', nonce => jwt.sign({ ...profile, nonce }, keys.privateKey,
    { algorithm: 'RS256', keyid: 'test', audience: process.env.GOOGLE_CLIENT_ID, issuer: 'https://accounts.google.com', expiresIn: '5m' }));
  await page.addInitScript(() => {
    window.google = { accounts: { id: {
      initialize: config => { window.googleTestConfig = config; },
      renderButton: host => {
        const button = document.createElement('button');
        button.textContent = 'Continue with Google';
        button.onclick = async () => { const config = window.googleTestConfig; config.callback({ credential: await window.googleTestCredential(config.nonce) }); };
        host.appendChild(button);
      },
      disableAutoSelect: () => {},
    } } };
  });
  await page.goto('http://localhost:5197/?view=auth', { waitUntil: 'networkidle' });
  return page;
};
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const app = requireBackend('./src/app');
  const User = requireBackend('./src/models/user.model');
  const Challenge = requireBackend('./src/models/googleLoginChallenge.model');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const legacy = await User.create({ fullName: 'Existing Buyer', email: 'existing@google.test', passwordHash: await argon2.hash('ExistingPassword123!'), role: 'BUYER' });
  server = http.createServer(app);
  await new Promise(resolve => server.listen(5027, '127.0.0.1', resolve));
  vite = await createServer({ configFile: path.resolve('vite.config.js'), server: { host: 'localhost', port: 5197, strictPort: true },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:5027/api/v1'), 'import.meta.env.VITE_SOCKET_URL': JSON.stringify('http://localhost:5027') } });
  await vite.listen();
  browser = await chromium.launch({ channel: process.env.SIFIT_BROWSER_CHANNEL || 'chrome', headless: true });
  const buyer = await createPage({ sub: 'test-buyer', email: 'buyer@google.test', email_verified: true, name: 'Google Buyer' });
  await buyer.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(buyer.locator('.account-button')).toBeVisible();
  await buyer.reload();
  await expect(buyer.locator('.account-button')).toBeVisible();
  await buyer.goto('http://localhost:5197/?view=account-password');
  await expect(buyer.getByRole('heading', { name: 'Đăng nhập bằng Google', exact: true })).toBeVisible();
  await expect(buyer.locator('input[type=password]')).toHaveCount(0);
  console.log('PASS Google buyer login, HttpOnly session refresh and Google-only password guidance');

  const seller = await createPage({ sub: 'test-seller', email: 'seller@google.test', email_verified: true, name: 'Google Seller' });
  await seller.locator('.auth-header-switch').click();
  await seller.getByLabel('Tôi muốn', { exact: true }).selectOption('seller');
  await seller.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(seller.locator('.seller-shell')).toBeVisible();
  expect((await User.findOne({ email: 'seller@google.test' })).role).toBe('SELLER');
  console.log('PASS Google signup preserves selected seller role');

  const existing = await createPage({ sub: 'test-existing', email: legacy.email, email_verified: true, name: 'Google Name' });
  await existing.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(existing.locator('.google-link-form')).toBeVisible();
  await existing.getByLabel('Mật khẩu Sifit hiện tại', { exact: true }).fill('WrongPassword123!');
  await existing.locator('.google-link-form button[type=submit]').click();
  await expect(existing.locator('.auth-error')).toContainText('Mật khẩu Sifit hiện tại chưa đúng');
  await existing.getByLabel('Mật khẩu Sifit hiện tại', { exact: true }).fill('ExistingPassword123!');
  await existing.locator('.google-link-form button[type=submit]').click();
  await expect(existing.locator('.account-button')).toBeVisible();
  expect((await User.findOne({ googleId: 'test-existing' })).id).toBe(legacy.id);
  console.log('PASS existing-account confirmation, wrong-password retry and preserved identity');

  const invalid = await createPage({ sub: 'unverified', email: 'invalid@google.test', email_verified: false, name: 'Invalid' });
  await invalid.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(invalid.locator('.auth-error')).toContainText('không hợp lệ');
  expect(await User.exists({ email: 'invalid@google.test' })).toBeNull();
  console.log('PASS verified RSA token with unverified email is rejected');
  for (const width of [320, 390, 768]) {
    await invalid.setViewportSize({ width, height: 844 });
    await expect.poll(() => invalid.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(await Challenge.countDocuments()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  console.log('PASS responsive auth and no browser runtime errors');
} finally {
  await browser?.close();
  await vite?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
  OAuth2Client.prototype.verifyIdToken = originalVerifier;
}

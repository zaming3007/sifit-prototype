import { preview } from 'vite';
import { chromium, expect } from '@playwright/test';
import { readdir, stat } from 'node:fs/promises';

// Exercise the built bundle, rather than Vite development mode. The full
// integration script separately covers real Express routes and MongoDB.
const server = await preview({ preview: { host: '127.0.0.1', port: 5198, strictPort: true } });
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const requests = [];
  const errors = [];
  page.on('request', req => requests.push(req.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', route => route.fulfill({
    status: route.request().url().includes('/auth/refresh-token') ? 401 : 200,
    json: { success: true, data: { items: [], categories: [], pagination: { page: 1, totalPages: 1, total: 0 } } },
  }));
  await page.goto('http://127.0.0.1:5198');
  await expect(page.getByRole('note')).toContainText('Chưa mở thanh toán');
  await expect.poll(() => page.locator('.sf-hero-image img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.locator('footer button').filter({ hasText: /đổi trả|trả hàng/i }).click();
  await expect(page.locator('.info-page')).toContainText('Không gửi hàng hoặc chuyển tiền');
  expect(requests.some(url => url.includes('localhost:5000'))).toBe(false);
  expect(requests.some(url => url.startsWith('http://127.0.0.1:5198/api/v1/'))).toBe(true);
  expect(errors).toEqual([]);
  const files = await readdir('dist', { recursive: true });
  expect(files.some(file => file.includes('vision') || file.endsWith('.wasm'))).toBe(false);
  let size = 0;
  for (const file of files) { const item = await stat(`dist/${file}`); if (item.isFile()) size += item.size; }
  expect(size).toBeLessThan(5 * 1024 * 1024);
  console.info(`PASS release bundle: demo notice, WebP hero, return policy, same-origin API, no runtime errors, ${size} bytes`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}

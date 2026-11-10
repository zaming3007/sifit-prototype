import { expect } from '@playwright/test';

export async function verifyAccountOperations({ browser, base, requireBackend, adminPage, errors }) {
  const User = requireBackend('./src/models/user.model');
  const Action = requireBackend('./src/models/emailAction.model');
  const Delivery = requireBackend('./src/models/mailDelivery.model');
  const mail = requireBackend('./src/services/mail.service');
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const email = 'new-buyer@integration.test';
  await page.goto(`${base}/?view=auth`);
  await page.getByRole('button', { name: 'Quên mật khẩu?', exact: true }).click();
  await page.getByLabel('Email khôi phục', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi liên kết đặt lại mật khẩu', exact: true }).click();
  await expect.poll(() => Action.countDocuments({ purpose: 'reset' })).toBe(1);
  const action = await Action.findOne({ purpose: 'reset' });
  const delivery = await Delivery.findOne({ actionId: action._id }).select('+encrypted');
  const link = mail.decrypt(delivery.encrypted).text.match(/https?:\/\/\S+/)[0];
  await page.goto(link);
  await expect(page.getByLabel('Mật khẩu mới', { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('ChangedPassword123!');
  await page.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill('ChangedPassword123!');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới', exact: true }).click();
  await expect.poll(async () => !!(await Action.findById(action.id)).consumedAt).toBe(true);
  await page.getByRole('button', { name: 'Về đăng nhập', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('ChangedPassword123!');
  await page.locator('.auth-submit').click();
  await expect(page).toHaveURL(/view=homepage/);
  await page.goto(`${base}/?view=account-profile`);
  await page.getByRole('button', { name: 'Gửi email xác minh', exact: true }).click();
  const user = await User.findOne({ email });
  await expect.poll(() => Action.countDocuments({ userId: user._id, purpose: 'verify' })).toBe(1);
  const verification = await Action.findOne({ userId: user._id, purpose: 'verify' });
  const verifyDelivery = await Delivery.findOne({ actionId: verification._id }).select('+encrypted');
  await page.goto(mail.decrypt(verifyDelivery.encrypted).text.match(/https?:\/\/\S+/)[0]);
  await page.getByRole('button', { name: 'Xác nhận email của tôi', exact: true }).click();
  await expect.poll(async () => (await User.findById(user.id)).emailVerified).toBe(true);
  await context.close();
  console.log('PASS real browser password reset, fragment removal, new-password login and email verification');

  await adminPage.getByRole('button', { name: 'Vận hành', exact: true }).click();
  await expect(adminPage.getByText('Sức khỏe tác vụ nền', { exact: true })).toBeVisible();
  await expect(adminPage.getByText(/SMTP: Chưa cấu hình/)).toBeVisible();
  for (const tab of ['Thông báo lỗi', 'Email lỗi', 'Đơn quá hạn', 'Khiếu nại quá hạn', 'Thu hồi sau chi trả']) {
    await adminPage.getByRole('button', { name: tab, exact: true }).click();
    await expect(adminPage.locator('.ops-page')).toBeVisible();
  }
  await expect(adminPage.getByLabel('ID đơn đã chi trả', { exact: true })).toBeVisible();
  console.log('PASS admin operations navigation and recovery entry form');
  const mongoose = requireBackend('mongoose');
  const Order = requireBackend('./src/models/order.model');
  const Payout = requireBackend('./src/models/sellerPayout.model');
  const Dispute = requireBackend('./src/models/dispute.model');
  const Recovery = requireBackend('./src/models/sellerRecovery.model');
  const seller = await User.findOne({ email: 'seller@integration.test' });
  const admin = await User.findOne({ email: 'admin@integration.test' });
  const order = await Order.create({ checkoutGroupId: new mongoose.Types.ObjectId(), buyerId: user._id, sellerId: seller._id,
    items: [{ productId: new mongoose.Types.ObjectId(), title: 'Recovery browser fixture', price: 100000, quantity: 1 }],
    shippingAddress: { recipientName: user.fullName, phone: '0901234567', addressLine: 'Street', ward: 'Ward', city: 'City' },
    subtotal: 100000, buyerTotal: 100000, sellerProceeds: 90000, commissionAmount: 10000,
    commissionRateBasisPoints: 1000, paymentStatus: 'PAID', orderStatus: 'COMPLETED', reservationExpiresAt: new Date() });
  await Payout.create({ sellerId: seller._id, orderIds: [order._id], amount: 90000, status: 'PAID', provider: 'manual', completedAt: new Date(Date.now() - 3600000), idempotencyKey: 'browser-recovery' });
  await adminPage.getByLabel('ID đơn đã chi trả', { exact: true }).fill(order.id);
  await adminPage.getByLabel('Lý do tiếp nhận / thu hồi', { exact: true }).fill('Independent evidence reviewed after seller payout');
  await adminPage.getByRole('button', { name: 'Tiếp nhận khiếu nại sau chi trả', exact: true }).click();
  await expect.poll(() => Dispute.countDocuments({ orderId: order._id })).toBe(1);
  const dispute = await Dispute.findOne({ orderId: order._id });
  await requireBackend('./src/services/dispute.service').resolveDispute(dispute.id, admin, { status: 'RESOLVED_BUYER', resolution: 'Full refund after independently reviewed evidence', expectedVersion: dispute.contentVersion });
  await adminPage.getByRole('button', { name: 'Vận hành', exact: true }).click();
  await adminPage.getByRole('button', { name: 'Thu hồi sau chi trả', exact: true }).click();
  await adminPage.getByLabel('ID đơn đã chi trả', { exact: true }).fill(order.id);
  await adminPage.getByLabel('Lý do tiếp nhận / thu hồi', { exact: true }).fill('Collect paid seller allocation before buyer refund');
  await adminPage.getByRole('button', { name: 'Mở hồ sơ thu hồi', exact: true }).click();
  await expect(adminPage.getByRole('heading', { name: 'Ghi nhận tiền thực nhận từ seller', exact: true })).toBeVisible();
  await adminPage.getByLabel('Số tiền thực nhận', { exact: true }).fill('90000');
  await adminPage.getByLabel('Mã biên nhận ngân hàng', { exact: true }).fill('BROWSER-RECOVERY-001');
  const receivedAt = new Date(Date.now() - 60000);
  const localTime = new Date(receivedAt.getTime() - receivedAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await adminPage.getByLabel('Thời điểm thực nhận', { exact: true }).fill(localTime);
  await adminPage.getByLabel('Ghi chú đối soát', { exact: true }).fill('Incoming bank statement independently verified');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/XioAAAAASUVORK5CYII=', 'base64');
  await adminPage.getByLabel('Ảnh chứng từ thu hồi', { exact: true }).setInputFiles({ name: 'recovery.png', mimeType: 'image/png', buffer: png });
  await adminPage.getByRole('checkbox').check();
  await adminPage.getByRole('button', { name: 'Xác nhận biên nhận thu hồi', exact: true }).click();
  await expect.poll(async () => (await Recovery.findOne({ orderId: order._id }))?.status).toBe('FUNDED');
  await expect(adminPage.getByRole('status')).toContainText('Đã thu đủ');
  await adminPage.getByRole('button', { name: 'Xem chứng từ BROWSER-RECOVERY-001', exact: true }).click();
  await expect(adminPage.getByAltText('Chứng từ thu hồi riêng tư')).toBeVisible();
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => adminPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await adminPage.setViewportSize({ width: 1440, height: 1000 });
  console.log('PASS late complaint, recovery creation, actual multipart receipt, private proof preview and mobile layout');
}

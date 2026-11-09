import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import * as paymentService from '../services/paymentService';
import { money, idOf } from '../utils/marketplace';
import { getApiErrorMessage } from '../utils/errorHandler';
import { useApp } from '../context/AppContext';

const labels = { INITIATED: 'Đang chuẩn bị thanh toán', PENDING: 'Chờ bạn thanh toán', SUCCEEDED: 'Đã xác nhận thanh toán', FAILED: 'Thanh toán thất bại / đã hủy', EXPIRED: 'Đã hết hạn thanh toán', REFUND_PENDING: 'Chờ hoàn tiền', REFUNDED: 'Đã hoàn tiền', PARTIALLY_REFUNDED: 'Có yêu cầu hoàn một phần' };
export default function PaymentPanel({ payment, onUpdate, onConfirmed, onRetry }) {
  const { openResource } = useApp();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const qr = useMemo(() => {
    if (!payment.qrCode) return null;
    const code = qrcode(0, 'M'); code.addData(payment.qrCode); code.make(); const count = code.getModuleCount(); let path = '';
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (code.isDark(row, col)) path += `M${col + 4},${row + 4}h1v1h-1z`;
    return { size: count + 8, path };
  }, [payment.qrCode]);
  useEffect(() => {
    if (payment.provider !== 'payos' || !['INITIATED', 'PENDING'].includes(payment.status)) return;
    let live = true;
    const interval = setInterval(async () => {
      if (document.hidden || new Date(payment.expiresAt) <= new Date()) return;
      try { const next = await paymentService.getPayment(idOf(payment)); if (live) { onUpdate(next); if (next.status !== payment.status) await onConfirmed?.(); } }
      catch (cause) { if (live) setError(getApiErrorMessage(cause)); }
    }, 20000);
    return () => { live = false; clearInterval(interval); };
  }, [payment, onUpdate, onConfirmed]);
  const pending = ['INITIATED', 'PENDING'].includes(payment.status);
  return <section className="payment-panel" aria-label="Thanh toán đơn hàng"><div><p className="payment-eyebrow">{payment.provider === 'payos' ? 'PAYOS / VIETQR' : 'THANH TOÁN'}</p><h3>{labels[payment.status] || payment.status}</h3><strong className="payment-amount">{money(payment.amount)}</strong></div>
    {payment.requiresReview && <div><p className="payment-warning" role="status">Giao dịch cần admin đối soát. Xem số tiền thực nhận và hướng dẫn xử lý trước khi thực hiện thanh toán khác.</p><button onClick={() => openResource('PAYMENT', idOf(payment))}>Theo dõi đối soát thanh toán</button></div>}
    {payment.provider === 'payos' && pending && !payment.requiresReview && <><p>Quét QR bằng ứng dụng ngân hàng để thanh toán cho Sifit. Tiền người bán được chi sau khi đơn hoàn tất và đủ điều kiện.</p><div className="payment-qr-layout">{qr && <svg viewBox={`0 0 ${qr.size} ${qr.size}`} width="220" height="220" role="img" aria-label="Mã QR thanh toán PayOS" shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="white" /><path d={qr.path} fill="#17221e" /></svg>}<dl><div><dt>Người nhận</dt><dd>{payment.bankInfo?.accountName || 'Theo thông tin trên trang PayOS'}</dd></div>{payment.bankInfo?.accountNumber && <div><dt>Số tài khoản</dt><dd>{payment.bankInfo.accountNumber}</dd></div>}{payment.bankInfo?.description && <div><dt>Nội dung chuyển khoản</dt><dd>{payment.bankInfo.description}</dd></div>}<div><dt>Hạn thanh toán</dt><dd>{new Date(payment.expiresAt).toLocaleString('vi-VN')}</dd></div></dl></div>{payment.paymentUrl && /^https:\/\/pay\.payos\.vn\//.test(payment.paymentUrl) && <a href={payment.paymentUrl} target="_blank" rel="noreferrer">Mở trang thanh toán PayOS ↗</a>}</>}
    {payment.provider === 'simulator' && <p>Thanh toán đang ở chế độ thử nghiệm. Đơn chỉ được xác nhận sau khi hệ thống nhận thông báo thanh toán hợp lệ.</p>}
    {payment.reconciliationNotice && <p role="status">{payment.reconciliationNotice}</p>}{error && <p role="alert">{error}</p>}
    <div className="payment-actions"><button disabled={checking} onClick={async () => { setChecking(true); setError(''); try { onUpdate(await paymentService.getPayment(idOf(payment))); await onConfirmed?.(); } catch (cause) { setError(getApiErrorMessage(cause)); } finally { setChecking(false); } }}>Kiểm tra thanh toán</button>{payment.status === 'INITIATED' && onRetry && <button disabled={checking} onClick={onRetry}>Thử tạo lại mã thanh toán</button>}</div>
  </section>;
}

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import * as paymentService from '../services/paymentService';
import { money, idOf } from '../utils/marketplace';
import { getApiErrorMessage } from '../utils/errorHandler';
import { acknowledgePayment, hasAcknowledgedPayment } from '../utils/paymentSession';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

const labels = { INITIATED: 'Đang chuẩn bị thanh toán', PENDING: 'Chờ bạn thanh toán', SUCCEEDED: 'Đã xác nhận thanh toán', FAILED: 'Thanh toán thất bại / đã hủy', EXPIRED: 'Đã hết hạn thanh toán', REFUND_PENDING: 'Chờ hoàn tiền', REFUNDED: 'Đã hoàn tiền', PARTIALLY_REFUNDED: 'Có yêu cầu hoàn một phần' };
export default function PaymentPanel({ payment, onUpdate, onConfirmed, onRetry }) {
  const { openResource } = useApp();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const successDialog = useRef(null);
  const acknowledged = useRef(null);
  const successTitle = useId();
  const paymentId = idOf(payment);
  const pending = ['INITIATED', 'PENDING'].includes(payment.status);
  const confirmed = payment.provider === 'payos' && payment.status === 'SUCCEEDED' && !payment.requiresReview;
  const qr = useMemo(() => {
    if (!pending || !payment.qrCode) return null;
    const code = qrcode(0, 'M'); code.addData(payment.qrCode); code.make(); const count = code.getModuleCount(); let path = '';
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (code.isDark(row, col)) path += `M${col + 4},${row + 4}h1v1h-1z`;
    return { size: count + 8, path };
  }, [pending, payment.qrCode]);
  const checkPayment = useCallback(async (manual = false) => {
    if (request.current) return;
    const current = {};
    request.current = current;
    if (manual) setChecking(true);
    try {
      const next = await paymentService.getPayment(paymentId);
      if (request.current !== current) return;
      setError('');
      onUpdate(next);
      if (manual || next.status !== payment.status || next.requiresReview !== payment.requiresReview) await onConfirmed?.();
    } catch (cause) {
      if (request.current === current) setError(getApiErrorMessage(cause));
    } finally {
      if (request.current === current) {
        request.current = null;
        if (manual) setChecking(false);
      }
    }
  }, [paymentId, payment.status, payment.requiresReview, onUpdate, onConfirmed]);
  useEffect(() => () => { request.current = null; }, [paymentId]);
  useEffect(() => {
    if (payment.provider !== 'payos' || !pending) return;
    const refresh = () => { if (!document.hidden) void checkPayment(); };
    const interval = setInterval(refresh, 8000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [checkPayment, payment.provider, pending]);
  useEffect(() => {
    const dialog = successDialog.current;
    if (confirmed && paymentId && dialog && !dialog.open
        && acknowledged.current !== paymentId && !hasAcknowledgedPayment(paymentId)) dialog.showModal();
  }, [confirmed, paymentId]);
  const dismissSuccess = () => {
    acknowledged.current = paymentId;
    acknowledgePayment(paymentId);
  };

  const retry = async () => {
    setChecking(true);
    setError('');
    try { await onRetry(); }
    catch (cause) { setError(getApiErrorMessage(cause)); }
    finally { setChecking(false); }
  };
  return <section className="payment-panel payment-panel-compact" aria-label="Thanh toán đơn hàng"><div className="payment-panel-heading"><div><p className="payment-eyebrow">{payment.provider === 'payos' ? 'PAYOS / VIETQR' : 'THANH TOÁN'}</p><h3>{payment.requiresReview ? 'Đang đối soát thanh toán' : labels[payment.status] || payment.status}</h3></div><strong className="payment-amount">{money(payment.amount)}</strong></div>
    {payment.requiresReview && <div><p className="payment-warning" role="status">Giao dịch cần admin đối soát. Xem số tiền thực nhận và hướng dẫn xử lý trước khi thực hiện thanh toán khác.</p><button onClick={() => openResource('PAYMENT', idOf(payment))}>Theo dõi đối soát thanh toán</button></div>}
    {payment.provider === 'payos' && pending && !payment.requiresReview && <div className="payment-qr-layout">
      {qr && <svg viewBox={`0 0 ${qr.size} ${qr.size}`} width="196" height="196" role="img" aria-label="Mã QR thanh toán PayOS" shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="white" /><path d={qr.path} fill="#17221e" /></svg>}
      <div className="payment-qr-info">
        {qr && <p>Quét mã bằng ứng dụng ngân hàng để thanh toán.</p>}
        <dl>
          {payment.bankInfo?.accountName && <div><dt>Người nhận</dt><dd>{payment.bankInfo.accountName}</dd></div>}
          {payment.bankInfo?.accountNumber && <div><dt>Số tài khoản</dt><dd>{payment.bankInfo.accountNumber}</dd></div>}
          {payment.bankInfo?.description && <div><dt>Nội dung chuyển khoản</dt><dd>{payment.bankInfo.description}</dd></div>}
          {payment.expiresAt && <div><dt>Hạn thanh toán</dt><dd>{new Date(payment.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</dd></div>}
        </dl>
      </div>
    </div>}
    {payment.provider === 'simulator' && <p>Thanh toán đang ở chế độ thử nghiệm. Đơn chỉ được xác nhận sau khi hệ thống nhận thông báo thanh toán hợp lệ.</p>}
    {payment.reconciliationNotice && <p role="status">{payment.reconciliationNotice}</p>}{error && <p role="alert">{error}</p>}
    {!confirmed && <div className="payment-actions">
      {payment.provider === 'payos' && pending && !payment.requiresReview && /^https:\/\/pay\.payos\.vn\//.test(payment.paymentUrl || '') && <a href={payment.paymentUrl} target="_blank" rel="noreferrer">Mở trang thanh toán PayOS ↗</a>}
      <button disabled={checking} onClick={() => checkPayment(true)}>Kiểm tra thanh toán</button>
      {payment.status === 'INITIATED' && onRetry && <button disabled={checking} onClick={retry}>Thử tạo lại mã thanh toán</button>}
    </div>}
    {confirmed && <dialog className="payment-success-dialog" ref={successDialog} aria-labelledby={successTitle} onCancel={dismissSuccess}>
      <div className="payment-success-icon"><Icon name="task_alt" /></div>
      <h2 id={successTitle}>Thanh toán thành công</h2>
      <p>Sifit đã nhận <strong>{money(payment.amount)}</strong>. Bạn có thể theo dõi giao hàng trong Đơn mua.</p>
      <form method="dialog" onSubmit={dismissSuccess}><button type="submit">Đã hiểu</button></form>
    </dialog>}
  </section>;
}

import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAction } from '../hooks/useAction';
import * as api from '../services/operationsService';
import { Facts, Status } from './OperationsUI';
import { Feedback, Field } from './MarketplaceUI';
import { idOf, money } from '../utils/marketplace';
import { date } from '../utils/operationFormatting';
import { paymentActionLabels, paymentIssueLabels, paymentReviewLabels } from '../utils/paymentReview';
import { refundLabels } from '../utils/refundLabels';
import { useRef } from 'react';
export default function PaymentExceptionDetails({ paymentId, onChange }) {
  const { user, openResource } = useApp(); const isAdmin = user.role === 'admin';
  const [record, setRecord] = useState(null); const [loadError, setLoadError] = useState('');
  const [action, setAction] = useState(''); const [note, setNote] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState(''); const attempt = useRef(null); const { busy, error, run } = useAction();
  const load = async () => { const result = await api.get(`/payments/${paymentId}/review`); setRecord(result); setLoadError(''); };
  useEffect(() => { let live = true; setRecord(null); setLoadError(''); api.get(`/payments/${paymentId}/review`).then(result => { if (live) setRecord(result); }).catch(cause => { if (live) setLoadError(cause.response?.data?.message || 'Không tải được hồ sơ đối soát.'); }); return () => { live = false; }; }, [paymentId]);
  useEffect(() => setConfirmed(false), [record?.payment.reviewVersion]);
  const payment = record?.payment;
  const canAccept = payment && !payment.allocatedAmount && payment.availableAmount >= payment.amount && !payment.adjustmentReservedAmount && record.group?.paymentStatus === 'UNPAID';
  const canWait = payment && !payment.allocatedAmount && payment.missingAmount > 0 && !payment.adjustmentReservedAmount && record.group?.orderStatus === 'PENDING_PAYMENT';
  const canRefund = payment?.availableAmount > 0 && !payment.adjustmentReservedAmount;
  const choices = [['WAIT_TOPUP', 'Chờ người mua bổ sung tiền', canWait], ['ACCEPT_PAYMENT', 'Tiếp tục đơn sau khi kiểm tra hàng', canAccept], ['REFUND_UNALLOCATED', 'Lập khoản hoàn tiền chưa phân bổ', canRefund]];
  return <section className="ops-card payment-exception-details" aria-label="Đối soát thanh toán bất thường"><h2>Đối soát thanh toán</h2>
    <Feedback busy={busy || !record && !loadError} error={error || loadError} />{notice && <p role="status">{notice}</p>}
    <div className="ops-actions"><button disabled={busy} onClick={() => run(load)}>Tải lại hồ sơ đối soát</button>{isAdmin && <button disabled={busy} onClick={() => run(async () => { setRecord(await api.post(`/admin/payment-exceptions/${paymentId}/recheck`)); setNotice('Đã truy vấn và đối chiếu lại biên nhận từ PayOS.'); await onChange?.(); })}>Truy vấn lại PayOS</button>}</div>
    {payment && <>
      <Facts entries={[[ 'Tình trạng đối soát', paymentReviewLabels[payment.reviewState] || payment.reviewState ], ['Loại cần kiểm tra', payment.requiresReview ? paymentIssueLabels[payment.reason] : 'Số dư đã được xử lý'],
        ['Phải thanh toán cho đơn', money(payment.amount)], ['Ngân hàng thực nhận', money(payment.receivedAmount)], ['Đã phân bổ cho đơn', money(payment.allocatedAmount)],
        ['Đã hoàn từ tiền chưa phân bổ', money(payment.adjustmentRefundedAmount)], ['Đang giữ để hoàn chênh lệch', money(payment.adjustmentReservedAmount)],
        ['Tiền chưa phân bổ còn có thể xử lý', money(payment.availableAmount)], ['Còn thiếu để trả cho đơn', money(payment.missingAmount)],
        ['Trạng thái nhóm đơn', <Status key="group" value={record.group?.orderStatus} />]]} />
      <p>Tiền thực nhận được tính từ biên nhận ngân hàng đã xác minh. Hoàn chênh lệch được theo dõi riêng với hoàn tiền hàng.</p>
      <h3>Biên nhận ngân hàng</h3>{!record.receipts.length && <p>Chưa có biên nhận đã xác minh để xử lý tiền.</p>}
      {record.receipts.map(receipt => <div key={idOf(receipt)} className="border-b py-3 break-words"><p>Mã ngân hàng: {receipt.reference}</p><p>{money(receipt.amount)} · {date(receipt.occurredAt)}</p></div>)}
      <h3>Đơn liên quan</h3>{record.orders.map(order => <div className="ops-actions" key={idOf(order)}><p>#{idOf(order).slice(-8)} · {order.items[0]?.title} · <Status value={order.orderStatus} /></p><button onClick={() => openResource('ORDER', idOf(order))}>Xem đơn liên quan</button></div>)}
      {isAdmin && payment.requiresReview && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => {
        const body = { action, note: note.trim(), confirmStock: action === 'ACCEPT_PAYMENT' && confirmed };
        const fingerprint = JSON.stringify(body); if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
        await api.post(`/admin/payment-exceptions/${paymentId}/decisions`, { ...body, expectedVersion: payment.reviewVersion, idempotencyKey: attempt.current.key });
        attempt.current = null; setAction(''); setNote(''); setConfirmed(false); await load(); await onChange?.(); setNotice('Đã lưu quyết định và thông báo cho người mua.');
      }); }}>
        <h3>Quyết định xử lý của admin</h3><Field label="Hướng xử lý thanh toán"><select className="input-field" required value={action} onChange={event => { setAction(event.target.value); setConfirmed(false); }}><option value="">Chọn hướng xử lý</option>{choices.map(([value, label, enabled]) => <option key={value} value={value} disabled={!enabled}>{label}</option>)}</select></Field>
        {action === 'ACCEPT_PAYMENT' && <p>Hệ thống chỉ phân bổ đúng {money(payment.amount)} cho đơn và kiểm tra lại từng món đồ. Tiền dư vẫn cần được xử lý riêng.</p>}
        {action === 'REFUND_UNALLOCATED' && <p>Lập khoản hoàn {money(payment.availableAmount)} chưa phân bổ. Người mua cung cấp tài khoản, admin duyệt và ghi nhận chuyển khoản kèm chứng từ. Nếu đơn chưa được thanh toán, đơn sẽ được hủy và giải phóng phần hàng còn được giữ.</p>}
        <Field label="Căn cứ và hướng dẫn đối soát"><textarea className="input-field" required minLength={10} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></Field>
        <label><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> {action === 'ACCEPT_PAYMENT' ? 'Tôi đã kiểm tra hàng còn sẵn và người mua đồng ý tiếp tục đơn.' : 'Tôi đã kiểm tra biên nhận và nội dung quyết định ở trên.'}</label>
        <button disabled={busy || !confirmed || !choices.some(([value, , enabled]) => value === action && enabled)}>Lưu quyết định đối soát</button>
      </form>}
      {record.refunds.length > 0 && <><h3>Khoản hoàn chênh lệch</h3>{record.refunds.map(refund => <div className="ops-actions" key={idOf(refund)}><p>{money(refund.amount)} · {refundLabels[refund.status] || refund.status}</p><button onClick={() => openResource('REFUND', idOf(refund))}>Xem khoản hoàn chênh lệch</button></div>)}</>}
      <h3>Lịch sử đối soát</h3>{!record.actions.length && <p>Chưa có quyết định xử lý thủ công.</p>}{record.actions.map(entry => <div className="border-b py-3 break-words" key={idOf(entry)}><p>{date(entry.createdAt)} · {paymentActionLabels[entry.action]}</p><p>{entry.note}</p>{entry.amount > 0 && <p>Số tiền: {money(entry.amount)}</p>}</div>)}
    </>}
  </section>;
}

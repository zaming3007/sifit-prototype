import { useEffect, useRef, useState } from 'react';
import * as api from '../services/operationsService';
import { Dialog, Facts } from './OperationsUI';
import { Feedback, Field } from './MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { idOf, money } from '../utils/marketplace';
export default function AdminRefundCreate({ payment, context, onClose, onSaved }) {
  const [data, setData] = useState(null); const [loadError, setLoadError] = useState('');
  const [orderId, setOrderId] = useState(context?.orderId || ''); const [amount, setAmount] = useState('');
  const [reason, setReason] = useState(context ? `Hoàn theo kết quả khiếu nại đơn ${context.orderId}` : '');
  const [confirmed, setConfirmed] = useState(false); const attempt = useRef(null); const { busy, error, run } = useAction();
  useEffect(() => { let live = true; api.get(`/admin/manual-refunds/payment/${idOf(payment)}/context`).then(value => { if (live) setData(value); }).catch(cause => { if (live) setLoadError(cause.response?.data?.message || 'Không tải được đơn hàng.'); }); return () => { live = false; }; }, [payment]);
  const order = data?.orders.find(item => idOf(item) === orderId);
  const remaining = Math.max(0, Math.min((order?.buyerTotal || 0) - (order?.refundedAmount || 0) - (order?.refundPendingAmount || 0), payment.amount - (payment.refundedAmount || 0) - (payment.refundReservedAmount || 0)));
  const dispute = data?.disputes.find(item => idOf(item.orderId) === orderId);
  return <Dialog title="Duyệt khoản hoàn cho người mua" busy={busy} onClose={onClose}><Feedback busy={busy || !data && !loadError} error={error || loadError} />
    <p>Chọn đúng đơn cần hoàn trong lần thanh toán. Người mua cung cấp tài khoản; admin kiểm tra tài khoản trước khi chuyển tiền.</p>
    {data && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => {
      const body = { paymentId: idOf(payment), orderId, amount: Number(amount), reason: reason.trim(), ...(dispute ? { disputeId: idOf(dispute) } : {}) };
      const fingerprint = JSON.stringify(body); if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
      const result = await api.post('/admin/manual-refunds', { ...body, idempotencyKey: attempt.current.key }); await onSaved(result.refund);
    }); }}>
      <Field label="Đơn hàng cần hoàn"><select className="input-field" required value={orderId} onChange={event => { setOrderId(event.target.value); setAmount(''); setConfirmed(false); }}><option value="">Chọn đơn hàng</option>{data.orders.map(item => <option key={idOf(item)} value={idOf(item)} disabled={item.refundPendingAmount > 0 || item.paymentStatus !== 'PAID'}>#{idOf(item).slice(-8)} · {item.items[0]?.title} · {money(item.buyerTotal)}</option>)}</select></Field>
      {order && <Facts entries={[[ 'Giá trị đơn', money(order.buyerTotal) ], ['Đã hoàn cho đơn', money(order.refundedAmount || 0)], ['Tối đa khoản hoàn này', money(remaining)]]} />}
      {dispute && <p>Kết quả khiếu nại: {dispute.resolution}</p>}
      <Field label="Số tiền duyệt hoàn (VND)"><input className="input-field" type="number" min="1" max={remaining} step="1" required value={amount} onChange={event => setAmount(event.target.value)} /></Field>
      <Field label="Lý do duyệt hoàn"><textarea className="input-field" required minLength={10} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></Field>
      <label><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Tôi đã kiểm tra căn cứ hoàn, đúng đơn và đúng số tiền cần hoàn.</label>
      <button disabled={busy || !confirmed || !order || remaining < 1}>Duyệt khoản hoàn và yêu cầu tài khoản</button>
    </form>}
  </Dialog>;
}

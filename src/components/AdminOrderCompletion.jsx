import { useState } from 'react';
import { Dialog } from './OperationsUI';
import { Field, Feedback } from './MarketplaceUI';
import { useAction } from '../hooks/useAction';
import * as api from '../services/operationsService';
export default function AdminOrderCompletion({ order, onChange }) {
  const [open, setOpen] = useState(false); const [note, setNote] = useState(''); const [allowUnconfirmed, setAllowUnconfirmed] = useState(false); const { busy, error, run } = useAction();
  if (order.orderStatus === 'COMPLETED') return <p>Đơn đã hoàn tất{order.completedBy ? ' sau khi admin duyệt' : ''}. Việc chi trả được theo dõi riêng trong mục Tài chính.</p>;
  if (order.orderStatus !== 'DELIVERED') return null;
  return <><button onClick={() => setOpen(true)}>Kiểm tra & hoàn tất đơn</button>{open && <Dialog title="Duyệt hoàn tất đơn hàng" busy={busy} onClose={() => setOpen(false)}><p>{order.buyerConfirmedAt ? 'Người mua đã xác nhận nhận hàng.' : 'Người mua chưa xác nhận nhận hàng.'}</p><p>Đối chiếu kết quả giao hàng và khiếu nại trước khi duyệt. Hoàn tất đơn không đồng nghĩa đã chuyển tiền cho người bán.</p><Feedback error={error} busy={busy} /><form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await api.post(`/admin/orders/${order._id}/complete`, { note: note.trim(), allowUnconfirmed }); setOpen(false); await onChange(); }); }}><Field label="Căn cứ hoàn tất đơn"><textarea className="input-field" required minLength={10} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></Field>{!order.buyerConfirmedAt && <label><input type="checkbox" checked={allowUnconfirmed} onChange={event => setAllowUnconfirmed(event.target.checked)} /> Đã đối chiếu bằng chứng giao hàng và hết hạn phản hồi của người mua.</label>}<button className="btn-primary" disabled={busy}>Xác nhận hoàn tất đơn</button></form></Dialog>}</>;
}

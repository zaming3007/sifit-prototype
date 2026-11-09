import { useState } from 'react';
import usePagedResource from '../hooks/usePagedResource';
import { useAction } from '../hooks/useAction';
import * as api from '../services/operationsService';
import { Dialog, Facts, Pager, ResourceFeedback } from './OperationsUI';
import { Feedback } from './MarketplaceUI';
import RefundDetails from './RefundDetails';
import { refundLabels } from '../utils/refundLabels';
import { idOf, money } from '../utils/marketplace';
export default function AdminRefundList() {
  const [status, setStatus] = useState(''); const [selected, setSelected] = useState(null); const { busy, error, run } = useAction();
  const resource = usePagedResource('/admin/manual-refunds', status ? { status } : {});
  const refresh = async () => { const result = await api.get(`/refunds/${idOf(selected)}`); setSelected(result.refund); resource.reload(); };
  return <div className="ops-page"><h2>Hoàn tiền cho người mua</h2><p>Khoản hoàn được theo dõi riêng theo từng đơn; chứng từ chỉ dành cho người mua liên quan và admin.</p>
    <label>Trạng thái khoản hoàn<select aria-label="Lọc khoản hoàn" value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả</option>{Object.entries(refundLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <button onClick={resource.reload}>Làm mới khoản hoàn</button><Feedback busy={busy} error={error} /><ResourceFeedback resource={resource} />
    {resource.items.map(item => <section className="ops-card" key={idOf(item)}><Facts entries={[[ 'Khoản hoàn', idOf(item) ], ['Loại', item.kind === 'RECEIPT_ADJUSTMENT' ? 'Hoàn tiền chênh lệch thanh toán' : 'Hoàn tiền hàng'], [item.orderId ? 'Đơn hàng' : 'Thanh toán', idOf(item.orderId || item.paymentId)], ['Số tiền', money(item.amount)], ['Trạng thái', refundLabels[item.status]]]} /><button disabled={busy} onClick={() => run(async () => setSelected((await api.get(`/refunds/${idOf(item)}`)).refund))}>Chi tiết và xử lý hoàn tiền</button></section>)}<Pager resource={resource} />
    {selected && <Dialog title="Xử lý khoản hoàn" onClose={() => setSelected(null)}><RefundDetails key={idOf(selected)} refund={selected} onChange={refresh} /></Dialog>}
  </div>;
}

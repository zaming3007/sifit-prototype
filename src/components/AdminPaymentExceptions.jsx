import { useState } from 'react';
import usePagedResource from '../hooks/usePagedResource';
import { Dialog, Facts, Pager, ResourceFeedback } from './OperationsUI';
import PaymentExceptionDetails from './PaymentExceptionDetails';
import { idOf, money } from '../utils/marketplace';
import { paymentReviewLabels, paymentIssueLabels } from '../utils/paymentReview';
export default function AdminPaymentExceptions() {
  const [status, setStatus] = useState(''); const [selected, setSelected] = useState(null);
  const resource = usePagedResource('/admin/payment-exceptions', status ? { status } : {});
  return <section className="ops-page"><h2>Thanh toán cần đối soát</h2><p>Kiểm tra tiền thiếu, thừa hoặc về khi đơn đã hết hạn. Quyết định và hoàn tiền đều có lịch sử riêng.</p>
    <div className="ops-toolbar"><label>Trạng thái đối soát<select aria-label="Lọc trạng thái đối soát" value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả đang chờ</option>{['OPEN', 'WAITING_TOPUP', 'REFUND_PENDING', 'RESOLVED'].map(value => <option key={value} value={value}>{paymentReviewLabels[value]}</option>)}</select></label><button onClick={resource.reload}>Làm mới hàng đợi đối soát</button></div>
    <ResourceFeedback resource={resource} />{resource.items.map(item => <article className="ops-card" key={idOf(item)}><h3>Thanh toán #{idOf(item).slice(-8)}</h3><Facts entries={[[ 'Tình trạng', paymentReviewLabels[item.reviewState] ], ['Loại', item.requiresReview ? paymentIssueLabels[item.reason] : 'Đã xử lý'], ['Phải thu', money(item.amount)], ['Thực nhận', money(item.receivedAmount)], ['Chưa phân bổ', money(item.availableAmount)]]} /><div className="ops-actions"><button onClick={() => setSelected(idOf(item))}>Xem và xử lý đối soát</button></div></article>)}<Pager resource={resource} />
    {selected && <Dialog title="Xử lý thanh toán bất thường" onClose={() => setSelected(null)}><PaymentExceptionDetails key={selected} paymentId={selected} onChange={resource.reload} /></Dialog>}
  </section>;
}

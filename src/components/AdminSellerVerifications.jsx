import { useState } from 'react';
import usePagedResource from '../hooks/usePagedResource';
import { Dialog, Pager, ResourceFeedback, Facts } from './OperationsUI';
import SellerVerificationDetails from './SellerVerificationDetails';
import { idOf } from '../utils/marketplace';
import { date } from '../utils/operationFormatting';
import { verificationLabels } from '../utils/sellerVerification';
export default function AdminSellerVerifications() {
  const [status, setStatus] = useState('PENDING'), [selected, setSelected] = useState(null);
  const resource = usePagedResource('/admin/seller-verifications', { status });
  return <section className="ops-page"><h2>Hồ sơ xác minh cửa hàng</h2><div className="ops-toolbar"><label>Lọc hồ sơ xác minh<select aria-label="Lọc hồ sơ xác minh" value={status} onChange={event => setStatus(event.target.value)}>{['PENDING', 'VERIFIED', 'REJECTED'].map(value => <option key={value} value={value}>{verificationLabels[value]}</option>)}</select></label><button onClick={resource.reload}>Làm mới danh sách xác minh</button></div><ResourceFeedback resource={resource} />
    {resource.items.map(item => <article className="ops-card" key={idOf(item)}><h3>{item.sellerId?.shopName || 'Hồ sơ shop'}</h3><Facts entries={[[ 'Trạng thái', verificationLabels[item.verificationStatus] ], ['Ngày gửi', date(item.submittedAt)], ['Ngày kiểm tra', date(item.reviewedAt)]]} /><button onClick={() => setSelected(idOf(item))}>Kiểm tra hồ sơ xác minh</button></article>)}<Pager resource={resource} />
    {selected && <Dialog title="Kiểm tra xác minh shop" onClose={() => setSelected(null)}><SellerVerificationDetails verificationId={selected} onChange={resource.reload} /></Dialog>}
  </section>;
}

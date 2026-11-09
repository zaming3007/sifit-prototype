import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../services/operationsService';
import { useAction } from '../hooks/useAction';
import { Feedback, Field } from './MarketplaceUI';
import { Facts } from './OperationsUI';
import { idOf } from '../utils/marketplace';
import { date } from '../utils/operationFormatting';
import { localDateTime, returnLabels } from '../utils/disputeCase';
export default function DisputeReturnPanel({ dispute, onChange }) {
  const { user } = useApp(); const flow = dispute.returnFlow; const { busy, error, run } = useAction();
  const [shipment, setShipment] = useState({ carrierName: flow?.shipment?.carrierName || '', trackingNumber: flow?.shipment?.trackingNumber || '', trackingUrl: flow?.shipment?.trackingUrl || '', shippedAt: localDateTime(flow?.shipment?.shippedAt), note: flow?.shipment?.note || '' });
  const [receiptNote, setReceiptNote] = useState(''); const [receiptConfirmed, setReceiptConfirmed] = useState(false);
  const [verifyNote, setVerifyNote] = useState(''); const [override, setOverride] = useState(false); const [verified, setVerified] = useState(false);
  useEffect(() => { if (flow?.status === 'AWAITING_SHIPMENT') setShipment(previous => ({ ...previous, shippedAt: localDateTime() })); }, [flow?.status]);
  useEffect(() => { setReceiptConfirmed(false); setVerified(false); }, [dispute.contentVersion]);
  if (!flow?.required) return <p>Quyết định không yêu cầu trả hàng.</p>;
  const isBuyer = user._id === idOf(dispute.buyerId); const isSeller = user._id === idOf(dispute.sellerId);
  const isAdmin = user.role === 'admin' && !isBuyer && !isSeller;
  const version = dispute.contentVersion || 0;
  return <section className="ops-card" aria-label="Theo dõi trả hàng"><h3>Quy trình trả hàng</h3><Feedback busy={busy} error={error} />
    <Facts entries={[[ 'Tiến độ trả hàng', returnLabels[flow.status] ], ['Hạn gửi trả', date(flow.shipBy)], ['Bên chịu phí gửi trả', flow.shippingPayer === 'SELLER' ? 'Người bán' : 'Người mua'],
      ['Người nhận', flow.address?.recipientName], ['Điện thoại nhận', flow.address?.phone], ['Địa chỉ nhận trả', [flow.address?.addressLine, flow.address?.ward, flow.address?.province].filter(Boolean).join(', ')], ['Hướng dẫn gửi trả', flow.instructions]]} />
    {new Date(flow.shipBy) < new Date() && flow.status === 'AWAITING_SHIPMENT' && <p role="status">Đã qua hạn dự kiến. Vui lòng phản hồi để admin kiểm tra; hệ thống không tự hủy quyền khiếu nại.</p>}
    {flow.shipment?.trackingNumber && <><Facts entries={[[ 'Đơn vị vận chuyển trả', flow.shipment.carrierName ], ['Mã vận đơn trả', flow.shipment.trackingNumber], ['Thời gian gửi trả', date(flow.shipment.shippedAt)], ['Ghi chú gửi trả', flow.shipment.note]]} />{flow.shipment.trackingUrl?.startsWith('https://') && <a href={flow.shipment.trackingUrl} target="_blank" rel="noreferrer">Mở trang theo dõi vận đơn trả</a>}</>}
    {isBuyer && ['AWAITING_SHIPMENT', 'SHIPPED'].includes(flow.status) && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { const { trackingUrl, ...body } = shipment; await api.post(`/disputes/${idOf(dispute)}/return-shipment`, { ...body, shippedAt: new Date(body.shippedAt).toISOString(), expectedVersion: version, ...(trackingUrl.trim() ? { trackingUrl: trackingUrl.trim() } : {}) }); await onChange(); }); }}>
      <h4>Khai báo hàng đã gửi trả</h4><p>Đặt vận chuyển bên ngoài theo hướng dẫn trên, rồi nhập vận đơn thực tế. Tải thêm ảnh biên nhận trong phần bằng chứng.</p>
      {[[ 'Đơn vị vận chuyển trả', 'carrierName', 2, 100], ['Mã vận đơn trả', 'trackingNumber', 3, 100]].map(([label, key, min, max]) => <Field key={key} label={label}><input className="input-field" required minLength={min} maxLength={max} value={shipment[key]} onChange={event => setShipment({ ...shipment, [key]: event.target.value })} /></Field>)}
      <Field label="Liên kết theo dõi trả hàng (tùy chọn)"><input className="input-field" type="url" maxLength={500} value={shipment.trackingUrl} onChange={event => setShipment({ ...shipment, trackingUrl: event.target.value })} placeholder="https://..." /></Field>
      <Field label="Thời gian gửi trả"><input className="input-field" type="datetime-local" required step="1" value={shipment.shippedAt} onChange={event => setShipment({ ...shipment, shippedAt: event.target.value })} /></Field>
      <Field label="Ghi chú gửi trả"><textarea className="input-field" required minLength={10} maxLength={1000} value={shipment.note} onChange={event => setShipment({ ...shipment, note: event.target.value })} /></Field><button disabled={busy}>Lưu vận đơn trả hàng</button>
    </form>}
    {isSeller && flow.status === 'SHIPPED' && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await api.post(`/disputes/${idOf(dispute)}/return-receipt`, { expectedVersion: version, note: receiptNote.trim() }); await onChange(); }); }}><Field label="Ghi chú kiểm tra hàng trả"><textarea className="input-field" required minLength={10} maxLength={1000} value={receiptNote} onChange={event => setReceiptNote(event.target.value)} /></Field><label><input type="checkbox" required checked={receiptConfirmed} onChange={event => setReceiptConfirmed(event.target.checked)} /> Tôi đã thực nhận và kiểm tra hàng trả.</label><button disabled={busy || !receiptConfirmed}>Xác nhận đã nhận lại hàng</button></form>}
    {flow.sellerReceipt?.receivedAt && <Facts entries={[[ 'Người bán xác nhận nhận lại', date(flow.sellerReceipt.receivedAt) ], ['Kiểm tra của người bán', flow.sellerReceipt.note]]} />}
    {isAdmin && ['SHIPPED', 'SELLER_RECEIVED'].includes(flow.status) && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await api.post(`/admin/disputes/${idOf(dispute)}/verify-return`, { expectedVersion: version, note: verifyNote.trim(), overrideSellerConfirmation: override }); await onChange(); }); }}>
      <h4>Admin kiểm tra nhận lại hàng</h4>{flow.status === 'SHIPPED' && <label><input type="checkbox" checked={override} onChange={event => setOverride(event.target.checked)} /> Xử lý khi người bán chưa xác nhận: tôi đã kiểm tra bằng chứng giao trả.</label>}
      <Field label="Căn cứ xác minh trả hàng"><textarea className="input-field" required minLength={flow.status === 'SHIPPED' ? 30 : 10} maxLength={1000} value={verifyNote} onChange={event => setVerifyNote(event.target.value)} /></Field>
      <label><input type="checkbox" required checked={verified} onChange={event => setVerified(event.target.checked)} /> Tôi đã đối chiếu vận đơn, bằng chứng và việc nhận lại hàng.</label><button disabled={busy || !verified || (flow.status === 'SHIPPED' && !override)}>Xác minh đã nhận lại, cho phép bước hoàn tiền</button>
    </form>}
    {flow.verification?.verifiedAt && <Facts entries={[[ 'Admin xác minh trả hàng', date(flow.verification.verifiedAt) ], ['Căn cứ xác minh', flow.verification.note]]} />}
    {flow.status !== 'VERIFIED' && <p>Khoản hoàn sẽ bị chặn cho đến khi admin xác minh nhận lại hàng.</p>}
  </section>;
}

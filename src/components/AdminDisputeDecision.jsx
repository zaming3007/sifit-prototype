import { useEffect, useState } from 'react';
import * as api from '../services/operationsService';
import { useAction } from '../hooks/useAction';
import { Field, Feedback } from './MarketplaceUI';
import { idOf } from '../utils/marketplace';
import { localDateTime } from '../utils/disputeCase';

export default function AdminDisputeDecision({ dispute, onChange }) {
  const [status, setStatus] = useState('RESOLVED_BUYER'); const [resolution, setResolution] = useState('');
  const [returnRequired, setReturnRequired] = useState(false); const [instructions, setInstructions] = useState('');
  const [address, setAddress] = useState({ recipientName: '', phone: '', addressLine: '', ward: '', province: '' });
  const [shippingPayer, setShippingPayer] = useState('SELLER'); const [shipBy, setShipBy] = useState(() => localDateTime(Date.now() + 7 * 86400000));
  const [confirmed, setConfirmed] = useState(false); const { busy, error, run } = useAction();
  useEffect(() => setConfirmed(false), [dispute.contentVersion]);
  return <section className="ops-card"><h3>Quyết định xử lý của admin</h3><p>Kiểm tra phản hồi và ảnh của hai bên trước khi chốt. Quyết định này chưa tự động hoàn tiền.</p><Feedback busy={busy} error={error} />
    <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => {
      await api.patch(`/admin/disputes/${idOf(dispute)}/resolve`, { status, resolution: resolution.trim(), expectedVersion: dispute.contentVersion || 0,
        returnRequired: status === 'RESOLVED_BUYER' && returnRequired, ...(status === 'RESOLVED_BUYER' && returnRequired ? { returnDetails: {
          address, instructions: instructions.trim(), shippingPayer, shipBy: new Date(shipBy).toISOString(),
        } } : {}) }); await onChange();
    }); }}>
      <Field label="Kết quả khiếu nại"><select className="input-field" value={status} onChange={event => { setStatus(event.target.value); setConfirmed(false); }}><option value="RESOLVED_BUYER">Chấp nhận bên mua</option><option value="RESOLVED_SELLER">Chấp nhận bên bán</option><option value="CLOSED">Đóng khiếu nại</option></select></Field>
      <Field label="Căn cứ quyết định"><textarea className="input-field" required minLength={10} maxLength={1000} value={resolution} onChange={event => setResolution(event.target.value)} /></Field>
      {status === 'RESOLVED_BUYER' && <Field label="Cách xử lý hàng hóa"><select className="input-field" value={returnRequired ? 'RETURN' : 'DIRECT'} onChange={event => { setReturnRequired(event.target.value === 'RETURN'); setConfirmed(false); }}><option value="DIRECT">Hoàn tiền trực tiếp, không yêu cầu trả hàng</option><option value="RETURN">Yêu cầu trả hàng trước khi hoàn tiền</option></select></Field>}
      {status === 'RESOLVED_BUYER' && returnRequired && <fieldset className="space-y-3"><legend>Thông tin nhận hàng trả</legend><p>Điền địa chỉ đã xác nhận với người bán. Hai bên chỉ xem được thông tin này trong vụ việc của mình.</p>
        {[[ 'Tên người nhận hàng trả', 'recipientName', 2, 100], ['Điện thoại nhận hàng trả', 'phone', 8, 20], ['Địa chỉ nhận hàng trả', 'addressLine', 5, 250], ['Phường/xã nhận hàng trả', 'ward', 2, 100], ['Tỉnh/thành nhận hàng trả', 'province', 2, 100]].map(([label, key, min, max]) => <Field key={key} label={label}><input className="input-field" required minLength={min} maxLength={max} value={address[key]} onChange={event => setAddress({ ...address, [key]: event.target.value })} /></Field>)}
        <Field label="Bên chịu phí gửi trả"><select className="input-field" value={shippingPayer} onChange={event => setShippingPayer(event.target.value)}><option value="SELLER">Người bán</option><option value="BUYER">Người mua</option></select></Field>
        <Field label="Hạn người mua gửi trả"><input className="input-field" type="datetime-local" step="1" required value={shipBy} onChange={event => setShipBy(event.target.value)} /></Field>
        <Field label="Hướng dẫn gửi trả"><textarea className="input-field" required minLength={10} maxLength={1000} value={instructions} onChange={event => setInstructions(event.target.value)} /></Field>
      </fieldset>}
      <label><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Tôi đã kiểm tra nội dung vụ việc và thông tin xử lý ở trên.</label><button disabled={busy || !confirmed}>Chốt quyết định khiếu nại</button>
    </form>
  </section>;
}

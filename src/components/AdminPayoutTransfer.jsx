import { useState } from 'react';
import { Dialog, Facts } from './OperationsUI';
import { Feedback, Field } from './MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { money, idOf } from '../utils/marketplace';
import * as api from '../services/operationsService';
export default function AdminPayoutTransfer({ payout, onClose, onSaved }) {
  const [reference, setReference] = useState(''); const [note, setNote] = useState(''); const [transferred, setTransferred] = useState(false); const { busy, error, run } = useAction();
  const bank = payout.bankSnapshot;
  return <Dialog title="Ghi nhận chuyển tiền cho người bán" busy={busy} onClose={onClose}><Facts entries={[[ 'Số tiền phải chuyển', money(payout.amount)], ['Ngân hàng', bank?.bankName], ['Số tài khoản', bank?.accountNumber], ['Chủ tài khoản', bank?.accountName]]} /><p>Chuyển khoản từ tài khoản ngân hàng Sifit đến đúng thông tin đã duyệt ở trên. Chỉ ghi nhận sau khi ngân hàng báo thành công; thao tác này không tự chuyển tiền.</p><Feedback busy={busy} error={error} /><form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await api.post(`/admin/payouts/${idOf(payout)}/record-transfer`, { reference: reference.trim(), note: note.trim(), transferred, amount: payout.amount }); onSaved(); }); }}><Field label="Mã giao dịch ngân hàng"><input className="input-field" required minLength={5} maxLength={100} value={reference} onChange={event => setReference(event.target.value)} /></Field><Field label="Ghi chú đối chiếu chuyển khoản"><textarea className="input-field" required minLength={10} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></Field><label><input type="checkbox" required checked={transferred} onChange={event => setTransferred(event.target.checked)} /> Tôi đã đối chiếu ngân hàng, chuyển đúng số tiền và đúng người nhận.</label><button className="btn-primary" disabled={busy || !transferred}>Ghi nhận đã chuyển tiền</button></form></Dialog>;
}

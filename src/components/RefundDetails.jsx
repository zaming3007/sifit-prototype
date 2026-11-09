import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Facts } from './OperationsUI';
import { Feedback, Field } from './MarketplaceUI';
import { useAction } from '../hooks/useAction';
import * as api from '../services/operationsService';
import { saveRefundBank, uploadRefundProof, downloadRefundProof } from '../services/refundService';
import { idOf, money } from '../utils/marketplace';
import { date } from '../utils/operationFormatting';

import { refundLabels } from '../utils/refundLabels';
import banks from '../data/refundBanks.json';
const localTime = () => { const value = new Date(); return new Date(value - value.getTimezoneOffset() * 60000).toISOString().slice(0, 19); };
export default function RefundDetails({ refund, onChange }) {
  const { user, openResource } = useApp(); const admin = user.role === 'admin';
  const [bank, setBank] = useState({ bankName: refund.bank?.bankName || '', bankBin: refund.bank?.bankBin || '', accountNumber: refund.bank?.accountNumber || '', accountName: refund.bank?.accountName || '' });
  const [ownsAccount, setOwnsAccount] = useState(false); const [bankOpen, setBankOpen] = useState(!refund.bank?.accountNumber);
  const [reference, setReference] = useState(''); const [note, setNote] = useState('');
  const [transferredAt, setTransferredAt] = useState(localTime); const [transferred, setTransferred] = useState(false);
  const [file, setFile] = useState(null); const [cancelNote, setCancelNote] = useState(''); const [cancelOpen, setCancelOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false); const [correctionNote, setCorrectionNote] = useState(''); const [notTransferred, setNotTransferred] = useState(false);
  const { busy, error, run } = useAction();
  useEffect(() => { if (refund.status === 'APPROVED') setTransferredAt(localTime()); }, [refund.status]);
  const bankView = refund.bankSnapshot?.accountNumber ? refund.bankSnapshot : refund.bank;
  return <section className="ops-card refund-details" aria-label="Chi tiết hoàn tiền">
    <h2>{refund.kind === 'RECEIPT_ADJUSTMENT' ? 'Hoàn tiền chênh lệch thanh toán' : `Hoàn tiền đơn ${idOf(refund.orderId).slice(-8)}`}</h2>
    <Facts entries={[[ 'Mã khoản hoàn', idOf(refund)], ['Số tiền hoàn', money(refund.amount)], ['Trạng thái khoản hoàn', refundLabels[refund.status] || refund.status],
      ['Lý do', refund.reason], ['Ngày lập', date(refund.createdAt)], ['Ngày hoàn tất', date(refund.completedAt)]]} />
    <Feedback busy={busy} error={error} />
    <div className="ops-actions"><button disabled={busy} onClick={() => run(onChange)}>Tải lại thông tin hoàn tiền</button>{refund.orderId ? <button onClick={() => openResource('ORDER', idOf(refund.orderId))}>Xem đơn liên quan</button> : <button onClick={() => openResource('PAYMENT', idOf(refund.paymentId))}>Xem thanh toán liên quan</button>}{refund.disputeId && <button onClick={() => openResource('DISPUTE', idOf(refund.disputeId))}>Xem khiếu nại liên quan</button>}</div>
    {bankView?.accountNumber && <div className="refund-bank"><h3>Tài khoản nhận tiền {refund.bankSnapshot?.accountNumber ? 'đã chốt' : 'người mua cung cấp'}</h3><Facts entries={[[ 'Ngân hàng', bankView.bankName ], ['Số tài khoản', bankView.accountNumber], ['Chủ tài khoản', bankView.accountName]]} /></div>}
    {!admin && ['REQUESTED', 'PENDING'].includes(refund.status) && <>
      {refund.bank?.accountNumber && <button disabled={busy} onClick={() => setBankOpen(value => !value)}>Sửa tài khoản nhận hoàn</button>}
      {bankOpen && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await saveRefundBank(idOf(refund), { ...bank, ownsAccount }); setBankOpen(false); await onChange(); }); }}>
        <h3>Tài khoản nhận hoàn tiền</h3><p>Kiểm tra chính xác thông tin. Tài khoản sẽ được chốt sau khi admin duyệt chuyển khoản.</p>
        <Field label="Ngân hàng nhận hoàn"><select className="input-field" required value={bank.bankBin} onChange={event => { const chosen = banks.find(item => item.bin === event.target.value); setBank({ ...bank, bankBin: chosen?.bin || '', bankName: chosen?.shortName || '' }); }}><option value="">Chọn ngân hàng của bạn</option>{banks.map(item => <option key={item.bin} value={item.bin}>{item.shortName} — {item.name}</option>)}</select></Field>
        {[[ 'Số tài khoản nhận hoàn', 'accountNumber', 4, 34], ['Tên chủ tài khoản', 'accountName', 3, 100]].map(([label, key, min, max]) => <Field label={label} key={key}><input className="input-field" required minLength={min} maxLength={max} pattern={key === 'accountNumber' ? '[A-Za-z0-9]{4,34}' : undefined} value={bank[key]} onChange={event => setBank({ ...bank, [key]: event.target.value })} /></Field>)}
        <label><input type="checkbox" required checked={ownsAccount} onChange={event => setOwnsAccount(event.target.checked)} /> Tôi xác nhận đây là tài khoản của mình và thông tin nhận tiền chính xác.</label>
        <button disabled={busy || !ownsAccount}>Gửi tài khoản nhận hoàn</button>
      </form>}
    </>}
    {admin && refund.status === 'REQUESTED' && <p role="status">Đang chờ người mua cung cấp tài khoản qua thông báo hoặc chi tiết đơn hàng.</p>}
    {admin && refund.status === 'PENDING' && <div className="ops-actions"><button disabled={busy} onClick={() => run(async () => { await api.post(`/admin/manual-refunds/${idOf(refund)}/approve`, { expectedVersion: refund.__v }); await onChange(); })}>Duyệt tài khoản và chuyển khoản</button></div>}
    {admin && ['PENDING', 'APPROVED'].includes(refund.status) && !refund.proof?.sha256 && <><button disabled={busy} onClick={() => setCorrectionOpen(value => !value)}>Yêu cầu sửa tài khoản nhận tiền</button>{correctionOpen && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await api.post(`/admin/manual-refunds/${idOf(refund)}/request-bank-correction`, { note: correctionNote.trim(), notTransferred }); setCorrectionOpen(false); await onChange(); }); }}><Field label="Lý do cần sửa tài khoản"><textarea className="input-field" required minLength={10} maxLength={500} value={correctionNote} onChange={event => setCorrectionNote(event.target.value)} /></Field><label><input type="checkbox" required checked={notTransferred} onChange={event => setNotTransferred(event.target.checked)} /> Tôi xác nhận chưa chuyển tiền cho khoản hoàn này.</label><button disabled={busy || !notTransferred}>Gửi yêu cầu sửa tài khoản</button></form>}</>}
    {admin && ['REQUESTED', 'PENDING'].includes(refund.status) && <>
      <button disabled={busy} onClick={() => setCancelOpen(value => !value)}>Hủy khoản hoàn chưa chuyển</button>
      {cancelOpen && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await api.post(`/admin/manual-refunds/${idOf(refund)}/cancel`, { note: cancelNote.trim() }); await onChange(); }); }}><Field label="Lý do hủy khoản hoàn"><textarea className="input-field" required minLength={10} maxLength={500} value={cancelNote} onChange={event => setCancelNote(event.target.value)} /></Field><button className="ops-danger" disabled={busy}>Xác nhận hủy khoản hoàn</button></form>}
    </>}
    {admin && refund.status === 'APPROVED' && <>
      <p>Chuyển khoản từ tài khoản Sifit đến đúng tài khoản đã chốt ở trên. Sau khi ngân hàng báo thành công, tải ảnh chứng từ và ghi nhận giao dịch.</p>
      {!refund.proof?.sha256 ? <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await uploadRefundProof(idOf(refund), file); await onChange(); }); }}><Field label="Ảnh chứng từ hoàn tiền"><input type="file" required accept="image/png,image/jpeg,image/webp" onChange={event => setFile(event.target.files[0] || null)} /></Field><p>JPEG, PNG hoặc WebP, tối đa 5 MB. Chứng từ được lưu riêng tư.</p><button disabled={busy || !file || file.size > 5 * 1024 * 1024}>Lưu chứng từ hoàn tiền</button></form> : <p role="status">Đã lưu chứng từ hoàn tiền.</p>}
      <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await api.post(`/admin/manual-refunds/${idOf(refund)}/record-transfer`, { amount: refund.amount, reference: reference.trim(), note: note.trim(), transferredAt: new Date(transferredAt).toISOString(), transferred }); await onChange(); }); }}>
        <Field label="Mã giao dịch hoàn tiền"><input className="input-field" required minLength={5} maxLength={100} pattern="[A-Za-z0-9._/\-]+" value={reference} onChange={event => setReference(event.target.value)} /></Field>
        <Field label="Thời gian chuyển khoản"><input className="input-field" type="datetime-local" step="1" required value={transferredAt} onChange={event => setTransferredAt(event.target.value)} /></Field>
        <Field label="Ghi chú đối chiếu hoàn tiền"><textarea className="input-field" required minLength={10} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></Field>
        <label><input type="checkbox" required checked={transferred} onChange={event => setTransferred(event.target.checked)} /> Tôi đã kiểm tra ngân hàng, chuyển đúng số tiền và đúng tài khoản đã duyệt.</label>
        <button disabled={busy || !refund.proof?.sha256 || !transferred}>Ghi nhận đã hoàn tiền</button>
      </form>
    </>}
    {refund.transferReference && <Facts entries={[[ 'Mã chuyển khoản hoàn', refund.transferReference ], ['Thời gian chuyển', date(refund.transferredAt)], ['Ghi chú chuyển khoản', refund.transferNote]]} />}
    {refund.proof?.sha256 && <div className="ops-actions"><button disabled={busy} onClick={() => run(() => downloadRefundProof(idOf(refund)))}>Tải chứng từ hoàn tiền</button></div>}
    <details><summary>Lịch sử khoản hoàn</summary>{refund.auditHistory?.map((entry, i) => <p key={i}>{date(entry.at)} · {{ CREATED: 'Đã lập khoản hoàn', BANK_SUBMITTED: 'Đã gửi tài khoản', BANK_CORRECTION_REQUESTED: 'Đã yêu cầu sửa tài khoản', APPROVED: 'Đã duyệt chuyển khoản', PROOF_UPLOADED: 'Đã lưu chứng từ', TRANSFER_RECORDED: 'Đã ghi nhận hoàn tiền', CANCELLED: 'Đã hủy' }[entry.action] || entry.action} · {entry.note}</p>)}</details>
  </section>;
}

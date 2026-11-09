import { useEffect, useState } from 'react';
import { useAction } from '../hooks/useAction';
import { Field, Feedback } from './MarketplaceUI';
import { Facts } from './OperationsUI';
import { verificationLabels, documentLabels } from '../utils/sellerVerification';
import * as api from '../services/operationsService';
import { uploadDocument } from '../services/verificationDocumentService';
import SellerVerificationDetails from './SellerVerificationDetails';
import SellerBankAccount from './SellerBankAccount';
import { idOf } from '../utils/marketplace';
export default function SellerVerificationPanel({ onChange }) {
  const [status, setStatus] = useState(null), [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ legalName: '', phone: '', contactAddress: '' });
  const [files, setFiles] = useState({}), [consent, setConsent] = useState(false), [ownsAccount, setOwnsAccount] = useState(false), [notice, setNotice] = useState('');
  const { busy, error, run } = useAction();
  const load = async () => {
    setNotice('');
    const result = (await api.get('/seller/verification/status')).verification; setStatus(result);
    if (result.latest) {
      const next = await api.get(`/seller-verifications/${idOf(result.latest)}`); setDetail(next);
      setForm({ legalName: next.verification.legalName || '', phone: next.verification.phone || '', contactAddress: next.verification.contactAddress || '' });
    } else setDetail(null);
    setConsent(false); setOwnsAccount(false);
  };
  useEffect(() => { run(load); }, [run]);
  const record = detail?.verification, draft = record?.verificationStatus === 'DRAFT';
  const canCreate = status && !status.payoutVerified && !['DRAFT', 'PENDING'].includes(record?.verificationStatus);
  const refresh = async () => { await load(); await onChange?.(); };
  return <section className="verification-panel"><SellerBankAccount onSaved={refresh} /><h2>Xác minh chủ shop và tài khoản nhận tiền</h2><p>Lưu ngân hàng ở trên, điền thông tin chủ shop, tải hai ảnh rồi gửi admin kiểm tra. Ảnh chỉ hiển thị cho bạn và admin.</p><Feedback busy={busy} error={error} />{notice && <p role="status">{notice}</p>}<button disabled={busy} onClick={() => run(refresh)}>Làm mới xác minh shop</button>
    {status && <p>Trạng thái: {verificationLabels[status.verificationStatus]} · {status.payoutVerified ? 'Đã đủ điều kiện xác minh để xét chi trả' : 'Cần hồ sơ thủ công đã duyệt trước khi xét chi trả'}</p>}
    {(canCreate || draft) && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => {
      if (draft) await api.put(`/seller/verification/${idOf(record)}`, { ...form, expectedVersion: record.contentVersion });
      else await api.post('/seller/verification/draft', form);
      await refresh(); setNotice('Đã lưu bản nháp. Kiểm tra và tải đủ hai ảnh trước khi gửi.');
    }); }}><h3>{draft ? 'Sửa thông tin bản nháp' : 'Lập hồ sơ xác minh'}</h3>
      <Field label="Họ tên chủ shop"><input className="input-field" required minLength={3} maxLength={100} value={form.legalName} onChange={event => setForm({ ...form, legalName: event.target.value })} /></Field>
      <Field label="Số điện thoại xác minh"><input className="input-field" type="tel" required pattern="\+?[0-9]{9,15}" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></Field>
      <Field label="Địa chỉ liên hệ xác minh"><textarea className="input-field" required minLength={10} maxLength={300} value={form.contactAddress} onChange={event => setForm({ ...form, contactAddress: event.target.value })} /></Field><p>Họ tên cần khớp tên chủ tài khoản, có thể dùng chữ có dấu hoặc không dấu.</p><button disabled={busy}>{draft ? 'Lưu thay đổi hồ sơ nháp' : 'Lưu bản nháp xác minh'}</button>
    </form>}
    {draft && <section className="ops-card"><h3>Ảnh xác minh</h3><p>Mỗi loại một ảnh JPEG, PNG hoặc WebP, tối đa 5 MB. Ảnh chủ shop cần thể hiện họ tên; ảnh ngân hàng cần thể hiện tên chủ tài khoản và số tài khoản. Có thể che số dư và giao dịch không liên quan.</p>
      <Facts entries={[[ 'Ngân hàng theo hồ sơ', record.bankSnapshot?.bankName ], ['Số tài khoản theo hồ sơ', record.bankSnapshot?.accountNumber], ['Chủ tài khoản theo hồ sơ', record.bankSnapshot?.accountName]]} />
      {Object.entries(documentLabels).map(([kind, label]) => <form key={kind} className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await uploadDocument(idOf(record), kind, files[kind]); await refresh(); setNotice(`Đã lưu ${label.toLowerCase()}.`); }); }}><Field label={label}><input type="file" required accept="image/jpeg,image/png,image/webp" onChange={event => setFiles({ ...files, [kind]: event.target.files[0] })} /></Field><div className="ops-actions"><button disabled={busy || !files[kind] || files[kind].size > 5 * 1024 * 1024}>Lưu {label.toLowerCase()}</button>{detail.documents.some(item => item.kind === kind) && <><span>Đã tải</span><button type="button" disabled={busy} onClick={() => run(async () => { await api.remove(`/seller/verification/${idOf(record)}/documents/${kind}`); await refresh(); })}>Xóa {label.toLowerCase()}</button></>}</div></form>)}
      <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { await api.post('/seller/verification/submit', { verificationId: idOf(record), expectedVersion: record.contentVersion, consent, ownsAccount }); await refresh(); setNotice('Đã gửi hồ sơ xác minh, đang chờ admin kiểm tra.'); }); }}>
        <label><input type="checkbox" required checked={ownsAccount} onChange={event => setOwnsAccount(event.target.checked)} /> Tôi là chủ tài khoản ngân hàng và thông tin hồ sơ là chính xác.</label>
        <label><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /> Tôi đồng ý để Sifit dùng hồ sơ này cho việc xác minh shop và tài khoản nhận tiền.</label>
        <button disabled={busy || !consent || !ownsAccount || detail.documents.length !== 2 || !detail.bankMatches}>Gửi hồ sơ xác minh shop</button>
      </form>
    </section>}
    {record && <SellerVerificationDetails key={`${idOf(record)}-${record.contentVersion}`} verificationId={idOf(record)} onChange={refresh} />}
  </section>;
}

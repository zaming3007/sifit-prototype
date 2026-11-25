import { useEffect, useState } from 'react';
import { useAction } from '../hooks/useAction';
import { Field, Feedback } from './MarketplaceUI';
import { verificationLabels, documentLabels } from '../utils/sellerVerification';
import * as api from '../services/operationsService';
import { uploadDocument } from '../services/verificationDocumentService';
import SellerVerificationDetails from './SellerVerificationDetails';
import SellerBankAccount from './SellerBankAccount';
import VerificationPhotoInput from './VerificationPhotoInput';
import Icon from './Icon';
import { idOf } from '../utils/marketplace';

const photoHints = {
  OWNER_IDENTITY: 'Ảnh cần rõ họ tên chủ shop.',
  BANK_OWNERSHIP: 'Ảnh cần rõ tên chủ tài khoản và số tài khoản.',
};

export default function SellerVerificationPanel({ onChange }) {
  const [status, setStatus] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ legalName: '', phone: '', contactAddress: '' });
  const [files, setFiles] = useState({});
  const [consent, setConsent] = useState(false);
  const [ownsAccount, setOwnsAccount] = useState(false);
  const [notice, setNotice] = useState('');
  const [showRecord, setShowRecord] = useState(false);
  const { busy, error, run } = useAction();

  const load = async () => {
    setNotice('');
    const result = (await api.get('/seller/verification/status')).verification;
    setStatus(result);
    if (result.latest) {
      const next = await api.get(`/seller-verifications/${idOf(result.latest)}`);
      setDetail(next);
      const { legalName, phone, contactAddress } = next.verification;
      setForm({ legalName: legalName || '', phone: phone || '', contactAddress: contactAddress || '' });
    } else setDetail(null);
    setConsent(false);
    setOwnsAccount(false);
  };
  useEffect(() => { run(load); }, [run]);

  const record = detail?.verification;
  const verificationId = idOf(record);
  const draft = record?.verificationStatus === 'DRAFT';
  const currentStatus = draft ? 'DRAFT' : status?.verificationStatus;
  const canCreate = status && !status.payoutVerified && !['DRAFT', 'PENDING'].includes(record?.verificationStatus);
  const canSubmit = draft && ownsAccount && consent && detail.documents.length === 2 && detail.bankMatches && !Object.values(files).some(Boolean);
  const refresh = async () => { await load(); await onChange?.(); };
  const chooseFile = (kind, file) => setFiles(current => ({ ...current, [kind]: file }));

  const saveDraft = event => {
    event.preventDefault();
    run(async () => {
      if (draft) await api.put(`/seller/verification/${verificationId}`, { ...form, expectedVersion: record.contentVersion });
      else {
        await api.post('/seller/verification/draft', form);
        setFiles({});
      }
      await refresh();
      setNotice('Đã lưu bản nháp. Chọn hai ảnh xác minh để tiếp tục.');
    });
  };

  const savePhoto = kind => run(async () => {
    await uploadDocument(verificationId, kind, files[kind]);
    await refresh();
    chooseFile(kind, undefined);
    setNotice(`Đã lưu ${documentLabels[kind].toLowerCase()}.`);
  });

  const removePhoto = kind => run(async () => {
    await api.remove(`/seller/verification/${verificationId}/documents/${kind}`);
    await refresh();
  });

  const submit = event => {
    event.preventDefault();
    if (!canSubmit) return;
    run(async () => {
      await api.post('/seller/verification/submit', { verificationId, expectedVersion: record.contentVersion, consent, ownsAccount });
      setFiles({});
      await refresh();
      setNotice('Đã gửi hồ sơ xác minh, đang chờ admin kiểm tra.');
    });
  };

  const draftForm = (
    <form className="seller-verification-form" onSubmit={saveDraft}>
      <div className="seller-verification-fields">
        <Field label="Họ tên chủ shop"><input className="input-field" required minLength={3} maxLength={100} value={form.legalName} onChange={event => setForm({ ...form, legalName: event.target.value })} /></Field>
        <Field label="Số điện thoại xác minh"><input className="input-field" type="tel" required pattern="\+?[0-9]{9,15}" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label="Địa chỉ liên hệ xác minh"><textarea className="input-field" required rows={2} minLength={10} maxLength={300} value={form.contactAddress} onChange={event => setForm({ ...form, contactAddress: event.target.value })} /></Field>
      </div>
      <p className="seller-payout-hint">Họ tên chủ shop cần khớp tên chủ tài khoản.</p>
      <button className="seller-primary-button" disabled={busy}>{draft ? 'Lưu thay đổi hồ sơ nháp' : 'Lưu bản nháp xác minh'}</button>
    </form>
  );

  return <>
    <SellerBankAccount onSaved={refresh} />
    <details className="verification-panel">
      <summary>
        <span className="seller-verification-title"><Icon name="verified_user" /><span>Xác minh tài khoản nhận tiền</span></span>
        {currentStatus && <span className="seller-verification-status" data-status={currentStatus}>{verificationLabels[currentStatus]}</span>}
        <Icon className="seller-verification-chevron" name="expand_more" />
      </summary>
      <div className="seller-verification-body">
        <div className="seller-verification-toolbar">
          <p className="seller-payout-hint">{status?.payoutVerified ? 'Đã đủ điều kiện xác minh để xét chi trả.' : 'Hoàn tất hồ sơ và hai ảnh để admin xác minh tài khoản nhận tiền.'}</p>
          <button type="button" className="seller-secondary-button" disabled={busy} onClick={() => run(refresh)}>Làm mới xác minh shop</button>
        </div>
        <Feedback busy={busy} error={error} />
        {notice && <p className="seller-verification-notice" role="status">{notice}</p>}
        {record?.rejectionReason && <p className="seller-verification-warning" role="alert">Lý do cần bổ sung: {record.rejectionReason}</p>}
        {canCreate && <section className="seller-verification-step"><h3>Lập hồ sơ xác minh</h3>{draftForm}</section>}
        {draft && <>
          <details className="seller-verification-step" open={!detail.bankMatches || undefined}>
            <summary>Sửa thông tin hồ sơ</summary>
            {!detail.bankMatches && <p className="seller-verification-warning">Tài khoản nhận tiền đã thay đổi. Lưu lại thông tin hồ sơ trước khi gửi.</p>}
            {draftForm}
          </details>
          <section className="seller-verification-step">
            <h3>Ảnh xác minh</h3>
            <p className="seller-payout-hint">JPEG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh. Chỉ bạn và admin được xem.</p>
            <div className="verification-photos">
              {Object.entries(documentLabels).map(([kind, label]) => (
                <VerificationPhotoInput key={`${verificationId}-${kind}`} verificationId={verificationId} kind={kind} label={label} hint={photoHints[kind]}
                  saved={detail.documents.find(item => item.kind === kind)} file={files[kind]} busy={busy}
                  onSelect={file => chooseFile(kind, file)} onSave={() => savePhoto(kind)} onRemove={() => removePhoto(kind)} />
              ))}
            </div>
          </section>
          <form className="seller-verification-confirm" onSubmit={submit}>
            <label><input type="checkbox" required checked={ownsAccount} onChange={event => setOwnsAccount(event.target.checked)} /> Tôi là chủ tài khoản ngân hàng và thông tin đã khai là chính xác.</label>
            <label><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /> Tôi đồng ý để Sifit sử dụng hồ sơ này để xác minh.</label>
            <button className="seller-primary-button" disabled={busy || !canSubmit}>Gửi hồ sơ xác minh shop</button>
          </form>
        </>}
        {record && <details className="seller-verification-step" onToggle={event => setShowRecord(event.currentTarget.open)}>
          <summary>Chi tiết và lịch sử hồ sơ</summary>
          {showRecord && <SellerVerificationDetails key={`${verificationId}-${record.contentVersion}`} verificationId={verificationId} onChange={refresh} />}
        </details>}
      </div>
    </details>
  </>;
}

import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAction } from '../hooks/useAction';
import { Feedback, Field } from './MarketplaceUI';
import { Facts } from './OperationsUI';
import { date } from '../utils/operationFormatting';
import { idOf } from '../utils/marketplace';
import { verificationLabels, documentLabels, verificationHistoryLabels } from '../utils/sellerVerification';
import * as api from '../services/operationsService';
import { documentBlob, downloadDocument } from '../services/verificationDocumentService';

function PrivateDocument({ verificationId, document }) {
  const [url, setUrl] = useState(''); const { busy, error, run } = useAction();
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return <div className="ops-card"><h4>{documentLabels[document.kind]}</h4><Feedback busy={busy} error={error} />
    <div className="ops-actions"><button disabled={busy} onClick={() => run(async () => { setUrl(URL.createObjectURL(await documentBlob(verificationId, document.kind))); })}>Xem {documentLabels[document.kind].toLowerCase()}</button><button disabled={busy} onClick={() => run(() => downloadDocument(verificationId, document.kind))}>Tải {documentLabels[document.kind].toLowerCase()}</button></div>
    {url && <img src={url} alt={documentLabels[document.kind]} style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain', marginTop: 12 }} />}
  </div>;
}
export default function SellerVerificationDetails({ verificationId, onChange }) {
  const { user } = useApp(); const admin = user.role === 'admin';
  const [data, setData] = useState(null), [loadError, setLoadError] = useState(''), [note, setNote] = useState(''), [checked, setChecked] = useState(false), [notice, setNotice] = useState('');
  const { busy, error, run } = useAction();
  const load = async () => { setData(await api.get(`/seller-verifications/${verificationId}`)); setChecked(false); setLoadError(''); setNotice(''); };
  useEffect(() => { let live = true; setData(null); setLoadError(''); api.get(`/seller-verifications/${verificationId}`).then(result => { if (live) setData(result); }).catch(cause => { if (live) setLoadError(cause.response?.data?.message || 'Không tải được hồ sơ xác minh.'); }); return () => { live = false; }; }, [verificationId]);
  const record = data?.verification;
  const decide = approved => run(async () => { await api.patch(`/admin/seller-verifications/${verificationId}/${approved ? 'approve' : 'reject'}`, { expectedVersion: record.contentVersion || 0, reason: note.trim(), ...(approved ? { checkedDocuments: checked } : {}) }); setNote(''); await load(); await onChange?.(); setNotice(approved ? 'Đã duyệt hồ sơ và thông báo cho shop.' : 'Đã gửi lý do để shop bổ sung hồ sơ.'); });
  return <section className="ops-card verification-details" aria-label="Chi tiết hồ sơ xác minh"><h2>Hồ sơ xác minh shop</h2><Feedback busy={busy || !data && !loadError} error={error || loadError} />{notice && <p role="status">{notice}</p>}<button disabled={busy} onClick={() => run(load)}>Tải lại hồ sơ xác minh</button>
    {record && <><h3>{data.shop.shopName}</h3><Facts entries={[[ 'Trạng thái hồ sơ', verificationLabels[record.verificationStatus] ], ['Trạng thái shop hiện tại', verificationLabels[data.shop.verificationStatus]], ['Họ tên chủ shop', record.legalName], ['Số điện thoại', record.phone], ['Địa chỉ liên hệ', record.contactAddress], ['Ngày gửi', date(record.submittedAt)], ['Ngày kiểm tra', date(record.reviewedAt)], ['Ngân hàng', record.bankSnapshot?.bankName], ['Số tài khoản', record.bankSnapshot?.accountNumber], ['Tên chủ tài khoản', record.bankSnapshot?.accountName]]} />
      {record.rejectionReason && <p role="alert">Lý do cần bổ sung: {record.rejectionReason}</p>}
      {!data.bankMatches && <p>Tài khoản hiện tại khác hồ sơ này. Người bán cần lưu lại bản nháp hoặc gửi hồ sơ mới để xác minh.</p>}
      {record.verificationMethod !== 'MANUAL_REVIEW' && <p>Hồ sơ mô phỏng cũ chưa đủ căn cứ xác minh. Cần yêu cầu người bán gửi hồ sơ thủ công.</p>}
      <h3>Ảnh riêng tư</h3><p>Chỉ chủ shop và admin được xem ảnh. Việc kiểm tra do admin thực hiện, không phải xác thực tự động từ ngân hàng hoặc cơ quan cấp giấy tờ.</p>
      {data.documents.map(document => <PrivateDocument key={`${idOf(document)}-${document.updatedAt}`} verificationId={verificationId} document={document} />)}
      {admin && record.verificationStatus === 'PENDING' && <form className="workflow-form" onSubmit={event => { event.preventDefault(); decide(true); }}><h3>Quyết định xác minh</h3><Field label="Căn cứ duyệt hoặc yêu cầu bổ sung"><textarea className="input-field" required minLength={10} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></Field><label><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} /> Tôi đã kiểm tra ảnh, thông tin chủ shop và tài khoản nhận tiền.</label><div className="ops-actions"><button disabled={busy || !checked || !data.bankMatches || data.documents.length !== 2 || record.verificationMethod !== 'MANUAL_REVIEW'}>Duyệt xác minh shop</button><button type="button" disabled={busy || note.trim().length < 10} onClick={() => decide(false)}>Yêu cầu bổ sung hồ sơ</button></div></form>}
      <h3>Lịch sử hồ sơ</h3>{record.history?.map((entry, i) => <p className="break-words" key={i}>{date(entry.at)} · {verificationHistoryLabels[entry.action] || entry.action}{entry.note && ` · ${documentLabels[entry.note] || entry.note}`}</p>)}
    </>}
  </section>;
}

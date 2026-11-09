import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../services/operationsService';
import { uploadDisputeEvidence, getDisputeEvidenceBlob } from '../services/disputeCaseService';
import usePagedResource from '../hooks/usePagedResource';
import { useAction } from '../hooks/useAction';
import { Facts, Pager, ResourceFeedback, Status } from './OperationsUI';
import { Feedback, Field } from './MarketplaceUI';
import { idOf } from '../utils/marketplace';
import { date } from '../utils/operationFormatting';
import { actorLabels, canContribute, caseActionLabels, evidenceLabels, disputeReasonLabels } from '../utils/disputeCase';
import AdminDisputeDecision from './AdminDisputeDecision';
import DisputeReturnPanel from './DisputeReturnPanel';
export default function DisputeCaseDetails({ dispute, onChange }) {
  const { user, openResource } = useApp(); const id = idOf(dispute); const { busy, error, run } = useAction();
  const messages = usePagedResource(`/disputes/${id}/messages`); const [files, setFiles] = useState([]); const [fileError, setFileError] = useState('');
  const [body, setBody] = useState(''); const attempt = useRef(null);
  const [file, setFile] = useState(null); const [caption, setCaption] = useState(''); const [category, setCategory] = useState('GENERAL');
  const [previews, setPreviews] = useState({}); const previewUrls = useRef({}); const mounted = useRef(false);
  const [fileRevision, setFileRevision] = useState(0);
  useEffect(() => { let live = true; setFileError(''); api.get(`/disputes/${id}/evidence`).then(result => { if (live) setFiles(result.items); }).catch(cause => { if (live) setFileError(cause.response?.data?.message || 'Không tải được danh sách bằng chứng.'); }); return () => { live = false; }; }, [id, fileRevision]);
  useEffect(() => { mounted.current = true; const urls = previewUrls.current; return () => { mounted.current = false; Object.values(urls).forEach(url => URL.revokeObjectURL(url)); }; }, []);
  const refresh = async () => { await onChange(); messages.reload(); setFileRevision(value => value + 1); };
  const canEdit = canContribute(dispute); const independentAdmin = user.role === 'admin' && ![idOf(dispute.buyerId), idOf(dispute.sellerId)].includes(user._id);
  return <section className="space-y-5 dispute-case" aria-label="Bằng chứng và xử lý khiếu nại">
    <section className="ops-card"><h2>Khiếu nại đơn {idOf(dispute.orderId).slice(-8)}</h2><Facts entries={[[ 'Trạng thái', <Status key="status" value={dispute.status} /> ], ['Lý do', disputeReasonLabels[dispute.reason] || dispute.reason], ['Mô tả', dispute.description], ['Kết quả', dispute.resolution], ['Ngày mở', date(dispute.createdAt)]]} />
      <div className="ops-actions"><button disabled={busy} onClick={() => run(refresh)}>Tải lại hồ sơ khiếu nại</button><button onClick={() => openResource('ORDER', idOf(dispute.orderId))}>Xem đơn hàng</button>{dispute.refundId && <button onClick={() => openResource('REFUND', idOf(dispute.refundId))}>Xem khoản hoàn đã ghi nhận</button>}</div><Feedback busy={busy} error={error || fileError} />
    </section>
    <section className="ops-card"><h3>Ảnh bằng chứng của các bên ({files.length}/{dispute.returnFlow?.required ? 30 : 20})</h3><p>Ảnh chỉ dành cho hai bên trong vụ việc và admin. Mỗi người gửi tối đa 10 ảnh sản phẩm và thêm 5 ảnh trả hàng khi cần; ảnh JPEG/PNG/WebP không quá 5 MB. Hạn mức ảnh trả hàng được giữ riêng.</p>
      {!files.length && !fileError && <p>Chưa có ảnh bằng chứng.</p>}
      {dispute.evidence?.length > 0 && <details><summary>Tham chiếu bằng chứng từ hồ sơ cũ</summary>{dispute.evidence.map((reference, index) => <p className="break-all" key={index}>{reference}</p>)}</details>}
      <div className="space-y-4">{files.map(item => <article key={idOf(item)} className="border rounded-xl p-3 space-y-2"><p><strong>{actorLabels[item.authorRole]}</strong> · {item.authorId?.fullName} · {date(item.createdAt)}</p><p>{evidenceLabels[item.category]} · {item.caption}</p>
        <div className="ops-actions"><button disabled={busy} onClick={() => run(async () => { if (previewUrls.current[idOf(item)]) return; const blob = await getDisputeEvidenceBlob(id, idOf(item)); if (!mounted.current) return; const url = URL.createObjectURL(blob); previewUrls.current[idOf(item)] = url; setPreviews(previous => ({ ...previous, [idOf(item)]: url })); })}>Xem ảnh bằng chứng</button>{previews[idOf(item)] && <a href={previews[idOf(item)]} download={`dispute-evidence-${idOf(item)}.${item.mimeType === 'image/jpeg' ? 'jpg' : item.mimeType === 'image/webp' ? 'webp' : 'png'}`}>Tải ảnh bằng chứng</a>}</div>
        {previews[idOf(item)] && <img className="max-w-full max-h-96 object-contain rounded-lg" src={previews[idOf(item)]} alt={item.caption} />}
      </article>)}</div>
      {canEdit && <form className="workflow-form mt-4" onSubmit={event => { event.preventDefault(); const input = event.target.querySelector('input[type=file]'); run(async () => { await uploadDisputeEvidence(id, file, caption.trim(), category); setFile(null); setCaption(''); if (input) input.value = ''; await refresh(); }); }}>
        <Field label="Ảnh bằng chứng khiếu nại"><input type="file" required accept="image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files[0] || null)} /></Field>
        <Field label="Loại bằng chứng"><select className="input-field" value={category} onChange={event => setCategory(event.target.value)}>{Object.entries(evidenceLabels).filter(([value]) => value === 'GENERAL' || dispute.returnFlow?.required).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Mô tả ảnh bằng chứng"><textarea className="input-field" required minLength={3} maxLength={500} value={caption} onChange={event => setCaption(event.target.value)} /></Field><button disabled={busy || !file || file.size > 5 * 1024 * 1024}>Gửi ảnh bằng chứng</button>
      </form>}
    </section>
    <section className="ops-card"><h3>Phản hồi trong khiếu nại</h3><ResourceFeedback resource={messages} />
      {[...messages.items].reverse().map(item => <article className="border-b py-3" key={idOf(item)}><p><strong>{actorLabels[item.authorRole]}</strong> · {item.authorId?.fullName} · {date(item.createdAt)}</p><p className="whitespace-pre-wrap break-words">{item.body}</p></article>)}<Pager resource={messages} />
      {canEdit ? <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { const text = body.trim(); if (attempt.current?.body !== text) attempt.current = { body: text, key: crypto.randomUUID() }; await api.post(`/disputes/${id}/messages`, { body: text, idempotencyKey: attempt.current.key }); setBody(''); attempt.current = null; await refresh(); }); }}><Field label="Nội dung phản hồi khiếu nại"><textarea className="input-field" required maxLength={2000} value={body} onChange={event => setBody(event.target.value)} /></Field><button disabled={busy}>Gửi phản hồi khiếu nại</button></form> : <p>Vụ việc đã chốt bước xử lý; nội dung được giữ để đối chiếu.</p>}
    </section>
    {independentAdmin && ['OPEN', 'UNDER_REVIEW'].includes(dispute.status) && <AdminDisputeDecision dispute={dispute} onChange={refresh} />}
    {dispute.status === 'RESOLVED_BUYER' && <DisputeReturnPanel dispute={dispute} onChange={refresh} />}
    <section className="ops-card"><h3>Lịch sử vụ việc</h3>{dispute.auditHistory?.map((entry, index) => <p key={index}>{date(entry.at)} · {idOf(entry.actorId) === idOf(dispute.buyerId) ? 'Người mua' : idOf(entry.actorId) === idOf(dispute.sellerId) ? 'Người bán' : 'Admin'} · {caseActionLabels[entry.action] || entry.action}{entry.note && !['EVIDENCE_ADDED', 'MESSAGE_ADDED'].includes(entry.action) ? ` · ${entry.note}` : ''}</p>)}</section>
  </section>;
}

import { useEffect, useState } from 'react';
import * as api from '../services/operationsService';
import apiClient from '../services/apiClient';
import usePagedResource from '../hooks/usePagedResource';
import { useAction } from '../hooks/useAction';
import { useApp } from '../context/AppContext';
import { Panel, Feedback, Field, Tabs } from '../components/MarketplaceUI';
import { Pager, ResourceFeedback } from '../components/OperationsUI';
import { idOf, money } from '../utils/marketplace';
const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—';

export function OverdueOrders({ admin = false }) {
  const { openResource } = useApp();
  const list = usePagedResource(admin ? '/admin/operations/orders' : '/seller/overdue-orders');
  return <Panel title="Đơn quá hạn gửi hàng"><button onClick={list.reload}>Làm mới đơn quá hạn</button><ResourceFeedback resource={list} />{list.items.map(order => <article className="ops-card" key={idOf(order)}><p>Đơn {idOf(order)} · Hạn gửi: {date(order.sellerShipBy)}</p><p>Đơn đã thanh toán không tự hủy. Vui lòng liên hệ các bên để xử lý.</p><button onClick={() => openResource('ORDER', idOf(order))}>Xem đơn hàng</button></article>)}<Pager resource={list} /></Panel>;
}

export function RecoveryPanel({ admin = false }) {
  const { openResource } = useApp(); const prefix = admin ? '/admin' : '/seller';
  const list = usePagedResource(`${prefix}/recoveries`); const { busy, error, run } = useAction();
  const [detail, setDetail] = useState(null); const [orderId, setOrderId] = useState(''); const [reason, setReason] = useState('');
  const [receipt, setReceipt] = useState({ amount: '', reference: '', receivedAt: '', note: '', confirmed: false });
  const [proof, setProof] = useState(null); const [preview, setPreview] = useState('');
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const load = async id => setDetail(await api.get(`${prefix}/recoveries/${id}`));
  return <Panel title="Thu hồi tiền sau chi trả"><p>Chỉ thu đủ phần seller đã nhận mới mở hoàn toàn bộ số dư cho buyer. Hệ thống không tự chuyển tiền.</p><Feedback busy={busy} error={error} />
    {admin && <form className="ops-form" onSubmit={event => { event.preventDefault(); run(async () => { const result = await api.post('/admin/recoveries', { orderId, reason }); await load(idOf(result.recovery)); list.reload(); }); }}><Field label="ID đơn đã chi trả"><input className="input-field" required pattern="[a-fA-F0-9]{24}" value={orderId} onChange={event => setOrderId(event.target.value)} /></Field><Field label="Lý do tiếp nhận / thu hồi"><textarea className="input-field" required minLength={10} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></Field><div className="ops-actions"><button disabled={busy}>Mở hồ sơ thu hồi</button><button type="button" disabled={busy || !/^[a-f0-9]{24}$/i.test(orderId) || reason.trim().length < 10} onClick={() => run(async () => { const result = await api.post(`/admin/orders/${orderId}/post-payout-dispute`, { reason }); openResource('DISPUTE', idOf(result.dispute)); })}>Tiếp nhận khiếu nại sau chi trả</button></div><p>Cần chốt khiếu nại cho buyer và xác minh hàng trả (nếu yêu cầu) trước khi mở thu hồi.</p></form>}
    <button disabled={busy} onClick={list.reload}>Làm mới hồ sơ</button><ResourceFeedback resource={list} />
    {list.items.map(item => <article className="ops-card" key={idOf(item)}><p>{idOf(item)} · {item.status}</p><p>Đã thu {money(item.receivedAmount)} / {money(item.requiredAmount)} · Hoàn buyer {money(item.refundAmount)}</p><button disabled={busy} onClick={() => run(() => load(idOf(item)))}>Chi tiết thu hồi</button></article>)}<Pager resource={list} />
    {detail && <section className="ops-card"><h3>Hồ sơ {idOf(detail.recovery)}</h3><p>{detail.recovery.reason}</p><p>{detail.recovery.status} · Còn thu {money(detail.recovery.requiredAmount - detail.recovery.receivedAmount)}</p><button onClick={() => openResource('DISPUTE', idOf(detail.recovery.disputeId))}>Xem khiếu nại</button>
      {detail.recovery.status === 'FUNDED' && <p role="status">Đã thu đủ. Admin lập khoản hoàn trong Tài chính với đúng đơn, khiếu nại và số tiền {money(detail.recovery.refundAmount)}.</p>}
      {detail.receipts.map(item => <div key={idOf(item)}><p>{item.reference} · {money(item.amount)} · {date(item.receivedAt)}</p><button disabled={busy} onClick={() => run(async () => { const response = await apiClient.get(`${prefix}/recoveries/${idOf(detail.recovery)}/receipts/${idOf(item)}/proof`, { responseType: 'blob' }); setPreview(URL.createObjectURL(response.data)); })}>Xem chứng từ {item.reference}</button></div>)}
      {preview && <div><img src={preview} alt="Chứng từ thu hồi riêng tư" className="max-w-full max-h-96" /><button onClick={() => setPreview('')}>Đóng chứng từ</button></div>}
      {admin && detail.recovery.status === 'OPEN' && <form className="ops-form" onSubmit={event => { event.preventDefault(); run(async () => {
        const body = new FormData(); for (const [key, value] of Object.entries(receipt)) body.append(key, key === 'receivedAt' ? new Date(value).toISOString() : String(value)); body.append('proof', proof);
        await apiClient.post(`/admin/recoveries/${idOf(detail.recovery)}/receipts`, body, { headers: { 'Content-Type': 'multipart/form-data' } }); await load(idOf(detail.recovery)); list.reload(); setProof(null);
      }); }}><h3>Ghi nhận tiền thực nhận từ seller</h3>
        {[['amount', 'Số tiền thực nhận', 'number'], ['reference', 'Mã biên nhận ngân hàng', 'text'], ['receivedAt', 'Thời điểm thực nhận', 'datetime-local'], ['note', 'Ghi chú đối soát', 'text']].map(([key, label, type]) => <Field key={key} label={label}><input className="input-field" type={type} required min={key === 'amount' ? 1 : undefined} max={key === 'amount' ? detail.recovery.requiredAmount - detail.recovery.receivedAmount : undefined} value={receipt[key]} onChange={event => setReceipt({ ...receipt, [key]: event.target.value })} /></Field>)}
        <Field label="Ảnh chứng từ thu hồi"><input type="file" accept="image/png,image/jpeg,image/webp" required onChange={event => setProof(event.target.files[0])} /></Field><label><input type="checkbox" required checked={receipt.confirmed} onChange={event => setReceipt({ ...receipt, confirmed: event.target.checked })} /> Tôi đã đối chiếu tiền thực vào tài khoản, không chỉ dựa trên ảnh người bán gửi.</label><button disabled={busy || !proof}>Xác nhận biên nhận thu hồi</button>
      </form>}
    </section>}
  </Panel>;
}

function Queue({ kind }) {
  const { openResource } = useApp(); const list = usePagedResource(`/admin/operations/${kind}`, { status: 'failed' });
  const [reason, setReason] = useState(''); const { busy, error, run } = useAction();
  return <><Field label="Lý do thử lại"><input className="input-field" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></Field><button disabled={busy} onClick={list.reload}>Làm mới hàng đợi</button><Feedback busy={busy} error={error} /><ResourceFeedback resource={list} />
    {list.items.map(item => <article className="ops-card" key={idOf(item)}><p>{idOf(item)} · {item.status} · {item.attempts} lượt thử</p><p>Tạo: {date(item.createdAt)}{item.expiresAt && ` · Hết hạn: ${date(item.expiresAt)}`}</p>{kind === 'disputes' ? <><p>{item.description}</p><button onClick={() => openResource('DISPUTE', idOf(item))}>Xử lý khiếu nại quá hạn</button></> : <button disabled={busy || reason.trim().length < 5 || (item.expiresAt && new Date(item.expiresAt) <= new Date())} onClick={() => run(async () => { await api.post(`/admin/operations/${kind}/${idOf(item)}/retry`, { reason }); list.reload(); })}>Đưa về hàng đợi thử lại</button>}</article>)}<Pager resource={list} /></>;
}

export default function AdminOperations() {
  const [tab, setTab] = useState('jobs'); const [summary, setSummary] = useState(null); const [reason, setReason] = useState('');
  const { busy, error, run } = useAction(); const refresh = async () => setSummary(await api.get('/admin/operations/health'));
  useEffect(() => { run(refresh); }, [run]);
  return <div className="ops-page"><Tabs value={tab} onChange={setTab} disabled={busy} items={[[ 'jobs', 'Tác vụ nền' ], ['outbox', 'Thông báo lỗi' ], ['mail', 'Email lỗi' ], ['orders', 'Đơn quá hạn' ], ['disputes', 'Khiếu nại quá hạn' ], ['recoveries', 'Thu hồi sau chi trả' ]]} /><Feedback busy={busy} error={error} />
    {tab === 'jobs' && <Panel title="Sức khỏe tác vụ nền"><button disabled={busy} onClick={() => run(refresh)}>Làm mới tác vụ</button>{summary && <><p>Scheduler: {summary.backgroundJobsEnabled ? 'Đang bật' : 'Đang tắt'} · SMTP: {summary.smtpConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'}</p><p>Thông báo lỗi: {summary.outboxFailed} · Email lỗi: {summary.mailFailed}</p><Field label="Lý do chạy lại tác vụ"><input className="input-field" value={reason} onChange={event => setReason(event.target.value)} /></Field>{summary.jobs.map(job => <article className="ops-card" key={job._id}><h3>{job._id}</h3><p>Thành công gần nhất: {date(job.lastSucceededAt)} · Lỗi: {job.lastError || '—'} · Tổng lỗi: {job.failureCount}</p><button disabled={busy || reason.trim().length < 5 || new Date(job.lockedUntil) > new Date()} onClick={() => run(async () => { await api.post(`/admin/jobs/${job._id}/retry`, { reason }); await refresh(); })}>Yêu cầu chạy lại ở lượt kế tiếp</button></article>)}</>}</Panel>}
    {tab === 'orders' && <OverdueOrders admin />}{tab === 'recoveries' && <RecoveryPanel admin />}{['outbox', 'mail', 'disputes'].includes(tab) && <Queue key={tab} kind={tab} />}
  </div>;
}

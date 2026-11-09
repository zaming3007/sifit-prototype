import { useEffect, useState } from 'react';
import usePagedResource from '../hooks/usePagedResource';
import { useAction } from '../hooks/useAction';
import { Dialog, Facts, Pager, ResourceFeedback } from '../components/OperationsUI';
import { Feedback } from '../components/MarketplaceUI';
import { reportReasons, reportStatus } from '../constants/productReports';
import * as api from '../services/productReportService';
import { money } from '../utils/marketplace';

export default function AdminProductReports({ onBusyChange }) {
  const [status, setStatus] = useState('OPEN');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('resolve');
  const [decision, setDecision] = useState('KEEP');
  const [policyAction, setPolicyAction] = useState('WARN');
  const [days, setDays] = useState(7);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const resource = usePagedResource('/admin/product-reports', { ...(status ? { status } : {}), ...(reason ? { reason } : {}) });
  const { busy, error, run, setError } = useAction();
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  const open = (report, nextMode) => { setSelected(report); setMode(nextMode); setNote(''); setDecision('KEEP'); setPolicyAction('WARN'); setError(''); setNotice(''); };
  const canHide = product => product && ['ACTIVE', 'PENDING', 'REJECTED'].includes(product.status) && !product.deletedAt;
  return <div className="ops-page product-reports-admin">
    <p className="ops-note">Báo cáo chỉ là yêu cầu kiểm tra. Số lượng báo cáo không tự động làm ẩn sản phẩm.</p>
    <div className="ops-toolbar"><label>Trạng thái báo cáo<select aria-label="Trạng thái báo cáo" value={status} disabled={busy} onChange={event => setStatus(event.target.value)}><option value="OPEN">Chờ kiểm tra</option><option value="RESOLVED">Đã xử lý</option><option value="">Tất cả</option></select></label><label>Lý do báo cáo<select aria-label="Lọc lý do báo cáo" value={reason} disabled={busy} onChange={event => setReason(event.target.value)}><option value="">Tất cả lý do</option>{Object.entries(reportReasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button disabled={busy || resource.busy} onClick={resource.reload}>Tải lại báo cáo</button></div>
    <ResourceFeedback resource={resource} />
    {notice && <p className="report-success" role="status">{notice}</p>}
    {resource.items.map(report => <article key={report._id} className="ops-card product-report-card">
      <div className="report-card-heading"><h2>{report.productId?.title || report.productSnapshot.title}</h2><span className={`report-badge ${report.status === 'OPEN' ? 'is-open' : ''}`}>{reportStatus(report)}</span></div>
      <Facts entries={[
        ['Người báo cáo', report.reporterId?.fullName || 'Tài khoản không còn tồn tại'], ['Người bán', report.sellerId?.fullName || 'Không còn tài khoản'],
        ['Lý do', reportReasons[report.reason]], ['Ngày gửi', new Date(report.createdAt).toLocaleString('vi-VN')],
        ['Trạng thái sản phẩm', report.productId?.status || 'Không còn sản phẩm'],
      ]} />
      <p className="report-user-description">{report.description}</p>
      {report.reporterId?.reportingBlockedUntil && new Date(report.reporterId.reportingBlockedUntil) > new Date() && <p className="report-note">Quyền báo cáo tạm khóa đến {new Date(report.reporterId.reportingBlockedUntil).toLocaleString('vi-VN')}</p>}
      {report.reporterId?.reportingWarning && <p className="report-note">Nhắc nhở gần nhất: {report.reporterId.reportingWarning}</p>}
      {report.resolutionNote && <p>Kết quả: {report.resolutionNote} · {report.resolvedBy?.fullName} · {new Date(report.resolvedAt).toLocaleString('vi-VN')}</p>}
      <div className="ops-actions"><button disabled={busy} onClick={() => open(report, 'resolve')}>{report.status === 'OPEN' ? 'Xem & xử lý' : 'Xem chi tiết'}</button>{report.reporterId && <button disabled={busy} onClick={() => open(report, 'policy')}>Quản lý quyền báo cáo</button>}</div>
    </article>)}
    <Pager resource={resource} />
    {selected && <Dialog title={mode === 'policy' ? 'Quản lý quyền báo cáo' : 'Kiểm tra báo cáo sản phẩm'} onClose={() => { setSelected(null); setError(''); }} busy={busy}>
      <h3>{selected.productSnapshot.title}</h3><p>{reportReasons[selected.reason]}</p><p className="report-user-description">{selected.description}</p>
      <Feedback busy={busy} error={error} />
      {mode === 'resolve' ? <>
        <details className="report-snapshot" open><summary>Thông tin sản phẩm tại lúc báo cáo</summary><p>{money(selected.productSnapshot.price)} · {selected.productSnapshot.brand}</p><p>{selected.productSnapshot.description}</p><div className="report-snapshot-images">{selected.productSnapshot.images?.map((image, index) => <a key={index} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={`Ảnh sản phẩm ${index + 1}`} /></a>)}</div></details>
        <p>Trạng thái sản phẩm hiện tại: {selected.productId?.status || 'Không còn sản phẩm'}</p>
        {selected.status === 'OPEN' ? <form className="report-form" onSubmit={event => { event.preventDefault(); run(async () => {
          await api.resolveReport(selected._id, { decision, note: note.trim() });
          setSelected(null); resource.reload(); setNotice(decision === 'HIDE' ? 'Đã ẩn sản phẩm và thông báo kết quả.' : 'Đã đóng báo cáo, giữ nguyên trạng thái sản phẩm.');
        }); }}>
          <label>Kết quả kiểm tra<select aria-label="Kết quả kiểm tra" value={decision} disabled={busy} onChange={event => setDecision(event.target.value)}><option value="KEEP">Bác báo cáo / giữ hiện trạng</option><option value="HIDE" disabled={!canHide(selected.productId)}>Xác nhận vi phạm / ẩn sản phẩm</option></select></label>
          {!canHide(selected.productId) && <p className="report-note">Sản phẩm đã ẩn, đã bán, đang giữ chỗ hoặc không còn tồn tại không thể bị ẩn lại. Bạn vẫn có thể đóng báo cáo với ghi chú kiểm tra.</p>}
          <label>Ghi chú xử lý<textarea aria-label="Ghi chú xử lý" required minLength={10} maxLength={1000} rows={4} value={note} disabled={busy} onChange={event => setNote(event.target.value)} /></label><p className="report-note">Ghi chú được lưu vào lịch sử và gửi trong thông báo kết quả. Hãy nêu căn cứ kiểm tra, tránh đưa thông tin riêng tư của người báo cáo.</p>
          <button className="btn-primary" disabled={busy || note.trim().length < 10}>Xác nhận xử lý</button>
        </form> : <p>Kết quả: {selected.resolutionNote}</p>}
      </> : <form className="report-form" onSubmit={event => { event.preventDefault(); run(async () => {
        await api.moderateReporter(selected._id, { action: policyAction, note: note.trim(), ...(policyAction === 'BLOCK' ? { days } : {}) });
        setSelected(null); resource.reload(); setNotice('Đã cập nhật quyền báo cáo và gửi thông báo đến người dùng.');
      }); }}>
        <p>Tài khoản: <strong>{selected.reporterId?.fullName}</strong></p><p className="report-note">Chỉ xử lý khi có căn cứ lạm dụng. Báo cáo không được chấp nhận không đồng nghĩa với spam. Các thao tác được lưu trong nhật ký quản trị.</p>
        <label>Thao tác<select aria-label="Thao tác quyền báo cáo" value={policyAction} disabled={busy} onChange={event => setPolicyAction(event.target.value)}><option value="WARN">Gửi nhắc nhở</option><option value="BLOCK">Tạm khóa quyền báo cáo</option><option value="UNBLOCK">Mở lại quyền báo cáo</option></select></label>
        {policyAction === 'BLOCK' && <label>Thời hạn khóa (ngày)<input aria-label="Thời hạn khóa (ngày)" type="number" required min={1} max={30} value={days} disabled={busy} onChange={event => setDays(Number(event.target.value))} /></label>}
        <label>Lý do xử lý<textarea aria-label="Lý do xử lý quyền báo cáo" required minLength={10} maxLength={1000} rows={4} value={note} disabled={busy} onChange={event => setNote(event.target.value)} /></label>
        <button className="btn-primary" disabled={busy || note.trim().length < 10}>Cập nhật quyền báo cáo</button>
      </form>}
    </Dialog>}
  </div>;
}

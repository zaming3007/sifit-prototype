import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Dialog } from './OperationsUI';
import { Feedback } from './MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { reportReasons, reportStatus } from '../constants/productReports';
import * as api from '../services/productReportService';
import { getApiErrorMessage } from '../utils/errorHandler';

function ProductReportForm({ product, onClose }) {
  const { user, openAuth } = useApp();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAction();
  const allowed = user && ['buyer', 'seller'].includes(user.role) && user._id !== product.seller?._id;
  const pending = reports.find(report => report.status === 'OPEN');
  useEffect(() => {
    if (!allowed) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setLoadError('');
    api.myReports(product._id, controller.signal).then(result => { if (!controller.signal.aborted) setReports(result.items); })
      .catch(cause => { if (!controller.signal.aborted) setLoadError(getApiErrorMessage(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, product._id, revision]);
  return <Dialog title="Báo cáo sản phẩm" onClose={onClose} busy={busy}>
    <p className="report-product-title">{product.title}</p>
    {!user ? <><p>Đăng nhập để gửi báo cáo và theo dõi kết quả kiểm tra.</p><button className="btn-primary" onClick={() => { onClose(); openAuth(); }}>Đăng nhập để báo cáo</button></>
      : !allowed ? <p>Bạn không thể gửi báo cáo cho sản phẩm này bằng tài khoản hiện tại.</p>
      : <><Feedback busy={loading || busy} error={error || loadError} />
        {loadError && <button onClick={() => setRevision(value => value + 1)}>Thử tải lại báo cáo</button>}
        {pending && <p className="report-success" role="status">{sent ? 'Đã gửi báo cáo. Quản trị viên sẽ kiểm tra.' : 'Bạn đã báo cáo sản phẩm này. Vui lòng chờ quản trị viên xử lý.'}</p>}
        {!loading && !loadError && !pending && <form className="report-form" onSubmit={event => { event.preventDefault(); run(async () => {
          const report = await api.createReport(product._id, { reason, description: description.trim() });
          setReports(previous => [report, ...previous]); setSent(true);
        }); }}>
          <label>Lý do báo cáo<select aria-label="Lý do báo cáo" required value={reason} disabled={busy} onChange={event => setReason(event.target.value)}><option value="">Chọn lý do</option>{Object.entries(reportReasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Mô tả vấn đề<textarea aria-label="Mô tả vấn đề" required minLength={10} maxLength={1000} rows={4} disabled={busy} value={description} placeholder="Nêu chi tiết bạn nhận thấy để quản trị viên có thể kiểm tra (ít nhất 10 ký tự)." onChange={event => setDescription(event.target.value)} /></label>
          <span className="report-character-count">{description.length}/1.000 ký tự</span>
          <p className="report-note">Tối đa 3 báo cáo trong 10 phút và 10 báo cáo trong 24 giờ. Mỗi sản phẩm chỉ có một báo cáo đang chờ từ bạn. Sản phẩm được admin kiểm tra trước khi xử lý.</p>
          <button className="btn-primary" type="submit" disabled={busy || description.trim().length < 10 || !reason}>Gửi báo cáo</button>
        </form>}
        {!!reports.length && <section className="report-history"><h3>Báo cáo của bạn về sản phẩm này</h3>{reports.map(report => <article key={report._id}><strong>{reportStatus(report)}</strong><p>{reportReasons[report.reason]} · {new Date(report.createdAt).toLocaleString('vi-VN')}</p><p>{report.description}</p>{report.resolutionNote && <p>Kết quả kiểm tra: {report.resolutionNote}</p>}</article>)}</section>}
      </>}
  </Dialog>;
}
export default function ReportModal({ isOpen, product, onClose }) {
  const { user } = useApp();
  return isOpen && product ? <ProductReportForm key={`${product._id}:${user?._id || 'guest'}`} product={product} onClose={onClose} /> : null;
}

import usePagedResource from '../hooks/usePagedResource';
import BuyerHeading from '../components/BuyerHeading';
import { Pager, ResourceFeedback } from '../components/OperationsUI';
import { reportReasons, reportStatus } from '../constants/productReports';

export default function MyProductReports() {
  const resource = usePagedResource('/product-reports/my');
  return <div className="member-page member-report-history"><BuyerHeading title="Báo cáo của tôi" description="Theo dõi kết quả kiểm tra, kể cả khi sản phẩm không còn hiển thị."><button className="member-secondary" disabled={resource.busy} onClick={resource.reload}>Làm mới</button></BuyerHeading>
    <ResourceFeedback resource={resource} />
    <div className="report-history-cards">{resource.items.map(report => <article key={report._id} className="ops-card"><div className="report-card-heading"><h2>{report.productSnapshot.title}</h2><span className={`report-badge ${report.status === 'OPEN' ? 'is-open' : ''}`}>{reportStatus(report)}</span></div><p className="report-note">{reportReasons[report.reason]} · {new Date(report.createdAt).toLocaleString('vi-VN')}</p><p className="report-user-description">{report.description}</p>{report.resolutionNote && <div className="report-result"><strong>Kết quả kiểm tra</strong><p>{report.resolutionNote}</p><time>{new Date(report.resolvedAt).toLocaleString('vi-VN')}</time></div>}</article>)}</div>
    <Pager resource={resource} />
  </div>;
}

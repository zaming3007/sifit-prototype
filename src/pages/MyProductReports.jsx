import { useState } from 'react';
import { useApp } from '../context/AppContext';
import usePagedResource from '../hooks/usePagedResource';
import { useAction } from '../hooks/useAction';
import BuyerHeading from '../components/BuyerHeading';
import { Pager, ResourceFeedback } from '../components/OperationsUI';
import { Feedback, Field } from '../components/MarketplaceUI';
import { reportReasons, reportStatus } from '../constants/productReports';
import * as productReportService from '../services/productReportService';
import Icon from '../components/Icon';

export default function MyProductReports() {
  const { user, products } = useApp();
  const resource = usePagedResource('/product-reports/my');
  const { busy, error, run } = useAction();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    reason: '',
    description: '',
  });

  const eligibleProducts = (products || []).filter(
    item => item?._id && item.seller?._id !== user?._id
  );

  const handleSubmit = event => {
    event.preventDefault();
    if (!form.productId || !form.reason || form.description.trim().length < 10) return;
    run(async () => {
      await productReportService.createReport(form.productId, {
        reason: form.reason,
        description: form.description.trim(),
      });
      setCreateOpen(false);
      setForm({ productId: '', reason: '', description: '' });
      resource.reload();
    });
  };

  return (
    <div className="member-page member-report-history max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 space-y-6">
      <BuyerHeading
        title="Báo cáo & Khiếu nại sản phẩm của tôi"
        description="Theo dõi kết quả kiểm tra và gửi báo cáo mới khi phát hiện sản phẩm vi phạm."
      >
        <button
          type="button"
          className="member-secondary inline-flex items-center gap-1.5"
          disabled={resource.busy || busy}
          onClick={resource.reload}
        >
          <Icon name="refresh" className="text-xs" />
          Làm mới
        </button>
        {user?.role !== 'admin' && (
          <button
            type="button"
            className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-1.5 cursor-pointer"
            disabled={busy}
            onClick={() => {
              setForm(prev => ({
                ...prev,
                productId: prev.productId || eligibleProducts[0]?._id || '',
              }));
              setCreateOpen(prev => !prev);
            }}
          >
            <Icon name={createOpen ? 'close' : 'add'} className="text-sm" />
            {createOpen ? 'Đóng biểu mẫu' : 'Tạo khiếu nại / báo cáo'}
          </button>
        )}
      </BuyerHeading>

      <Feedback busy={busy} error={error} />

      {createOpen && user?.role !== 'admin' && (
        <form
          onSubmit={handleSubmit}
          className="p-5 bg-white border border-emerald-200 rounded-2xl shadow-sm space-y-4 animate-fade-in"
        >
          <h2 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
            <Icon name="flag" className="text-primary text-base" />
            Tạo báo cáo / khiếu nại sản phẩm mới
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Chọn sản phẩm cần khiếu nại" icon="shopping_bag">
              <select
                required
                className="input-field"
                value={form.productId}
                onChange={event => setForm(prev => ({ ...prev, productId: event.target.value }))}
              >
                <option value="">-- Chọn sản phẩm --</option>
                {eligibleProducts.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.title} ({item.brand || 'Vintage'})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Lý do khiếu nại / báo cáo" icon="flag">
              <select
                required
                aria-label="Lý do báo cáo"
                className="input-field"
                value={form.reason}
                onChange={event => setForm(prev => ({ ...prev, reason: event.target.value }))}
              >
                <option value="">-- Chọn lý do --</option>
                {Object.entries(reportReasons).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Mô tả chi tiết vấn đề (tối thiểu 10 ký tự)" icon="edit">
            <textarea
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              className="input-field"
              value={form.description}
              onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
              placeholder="Mô tả rõ dấu hiệu vi phạm hoặc vấn đề bạn phát hiện trên sản phẩm này..."
            />
          </Field>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy || !form.productId || !form.reason || form.description.trim().length < 10}
              className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="send" className="text-xs" />
              Gửi báo cáo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
              className="btn-outline text-xs py-2.5 px-4 cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      <ResourceFeedback resource={resource} />

      <div className="report-history-cards space-y-3">
        {resource.items.map(report => (
          <article key={report._id} className="ops-card">
            <div className="report-card-heading">
              <h2>{report.productSnapshot.title}</h2>
              <span className={`report-badge ${report.status === 'OPEN' ? 'is-open' : ''}`}>
                {reportStatus(report)}
              </span>
            </div>
            <p className="report-note">
              {reportReasons[report.reason]} · {new Date(report.createdAt).toLocaleString('vi-VN')}
            </p>
            <p className="report-user-description">{report.description}</p>
            {report.resolutionNote && (
              <div className="report-result">
                <strong>Kết quả kiểm tra</strong>
                <p>{report.resolutionNote}</p>
                <time>{new Date(report.resolvedAt).toLocaleString('vi-VN')}</time>
              </div>
            )}
          </article>
        ))}
      </div>
      <Pager resource={resource} />
    </div>
  );
}

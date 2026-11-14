import { useEffect, useState } from 'react';
import * as api from '../services/operationsService';
import * as productReportService from '../services/productReportService';
import { uploadDisputeEvidence } from '../services/disputeCaseService';
import usePagedResource from '../hooks/usePagedResource';
import { useApp } from '../context/AppContext';
import { useAction } from '../hooks/useAction';
import { Feedback, Field, Tabs } from '../components/MarketplaceUI';
import { date, shortId, statusLabels } from '../utils/operationFormatting';
import { Dialog, Facts, Pager, ResourceFeedback, Status } from '../components/OperationsUI';
import { reportReasons } from '../constants/productReports';
import { idOf, money } from '../utils/marketplace';
import Icon from '../components/Icon';
import ShipmentOperations from './ShipmentOperations';

function SellerInbox({ section }) {
  const { user, products, openResource } = useApp();
  const [type, setType] = useState('product');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [reply, setReply] = useState('');
  const [createDisputeModal, setCreateDisputeModal] = useState(false);
  const [disputeActionType, setDisputeActionType] = useState('response');
  const [disputeForm, setDisputeForm] = useState({
    disputeId: '',
    body: '',
    evidenceCategory: 'GENERAL',
    evidenceCaption: '',
    productId: '',
    reason: 'MISLEADING_INFO',
    description: '',
  });
  const [evidenceFile, setEvidenceFile] = useState(null);

  const { busy, error, run } = useAction();
  const path =
    section === 'disputes'
      ? '/seller/disputes'
      : section === 'payouts'
      ? '/seller/payouts'
      : type === 'product'
      ? '/seller/reviews'
      : '/seller/ratings';
  const resource = usePagedResource(path, section === 'disputes' && status ? { status } : {});

  useEffect(() => {
    if (section === 'reviews') {
      run(async () => setSummary((await api.get('/seller/ratings/summary')).summary));
    }
  }, [section, run]);

  const otherProducts = (products || []).filter(
    item => item?._id && item.seller?._id !== user?._id
  );

  return (
    <div className="ops-page">
      <h1>
        {section === 'disputes'
          ? 'Khiếu nại liên quan đến shop'
          : section === 'payouts'
          ? 'Các đợt chi trả'
          : 'Đánh giá từ khách hàng'}
      </h1>
      <Feedback busy={busy} error={error} />

      {section === 'reviews' && (
        <>
          <Tabs
            value={type}
            onChange={setType}
            items={[
              ['product', 'Đánh giá sản phẩm'],
              ['shop', 'Đánh giá shop'],
            ]}
          />
          {summary && (
            <section className="ops-card">
              <h2>Uy tín cửa hàng</h2>
              <Facts
                entries={[
                  ['Điểm trung bình', summary.averageRating ?? summary.ratingAverage ?? 0],
                  ['Lượt đánh giá', summary.totalRatings ?? summary.ratingCount ?? 0],
                ]}
              />
            </section>
          )}
        </>
      )}

      <div className="ops-toolbar">
        {section === 'disputes' && (
          <label>
            Trạng thái khiếu nại
            <select
              aria-label="Trạng thái khiếu nại"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">Tất cả</option>
              {['OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED'].map(
                value => (
                  <option key={value} value={value}>
                    {statusLabels[value] || value}
                  </option>
                )
              )}
            </select>
          </label>
        )}
        <button type="button" onClick={resource.reload}>
          Làm mới danh sách
        </button>
        {section === 'disputes' && user?.role !== 'admin' && (
          <button
            type="button"
            className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 cursor-pointer"
            onClick={() => {
              const firstDisputeId = idOf(resource.items[0]) || '';
              setDisputeActionType(firstDisputeId ? 'response' : 'report');
              setDisputeForm(prev => ({
                ...prev,
                disputeId: firstDisputeId,
                productId: otherProducts[0]?._id || '',
              }));
              setCreateDisputeModal(true);
            }}
          >
            <Icon name="add" className="text-sm" />
            Tạo khiếu nại / Phản hồi
          </button>
        )}
      </div>

      <ResourceFeedback resource={resource} />

      {resource.items.map(item => (
        <section className="ops-card" key={idOf(item)}>
          <h2>
            {section === 'reviews'
              ? `${item.rating}/5 sao · ${item.productId?.title || 'Cửa hàng'}`
              : section === 'payouts'
              ? money(item.amount)
              : `Khiếu nại đơn ${shortId(item.orderId)}`}
          </h2>
          <Facts
            entries={[
              ['Trạng thái', <Status key="status" value={item.status} />],
              ['Ngày tạo', date(item.createdAt)],
              ...(section === 'reviews'
                ? [
                    ['Người mua', item.buyerId?.fullName || shortId(item.buyerId)],
                    ['Nội dung', item.comment],
                  ]
                : section === 'disputes'
                ? [
                    ['Lý do', item.reason],
                    ['Mô tả', item.description],
                    ['Kết quả', item.resolution],
                  ]
                : [
                    ['Nhà cung cấp', item.provider],
                    ['Ngày hoàn tất', date(item.completedAt)],
                    ['Lý do thất bại', item.failureReason],
                  ]),
            ]}
          />
          {item.sellerReply?.text && <blockquote>Shop phản hồi: {item.sellerReply.text}</blockquote>}
          <div className="ops-actions">
            <button
              onClick={() =>
                openResource(
                  section === 'reviews'
                    ? 'REVIEW'
                    : section === 'payouts'
                    ? 'PAYOUT'
                    : 'DISPUTE',
                  idOf(item)
                )
              }
            >
              Xem chi tiết
            </button>
            {item.orderId && (
              <button onClick={() => openResource('ORDER', idOf(item.orderId))}>Xem đơn hàng</button>
            )}
            {section === 'reviews' &&
              type === 'product' &&
              item.status === 'PUBLISHED' &&
              !item.sellerReply?.text && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setReplyTo(item);
                    setReply('');
                  }}
                >
                  Phản hồi đánh giá
                </button>
              )}
          </div>
        </section>
      ))}
      <Pager resource={resource} />

      {section === 'disputes' && (
        <p className="ops-note">
          Mở chi tiết khiếu nại để gửi phản hồi, bổ sung bằng chứng và xác nhận khi đã nhận lại hàng trả.
        </p>
      )}

      {createDisputeModal && section === 'disputes' && (
        <Dialog
          title="Bảo vệ Người bán — Gửi phản tố, bằng chứng & khiếu nại"
          busy={busy}
          onClose={() => setCreateDisputeModal(false)}
        >
          <Feedback busy={busy} error={error} />
          <Tabs
            value={disputeActionType}
            onChange={setDisputeActionType}
            items={[
              ['response', '1. Giải trình & Bằng chứng đơn hàng', 'shield'],
              ['return_issue', '2. Khiếu nại hàng hoàn trả', 'local_shipping'],
              ['report', '3. Báo cáo Shop khác vi phạm', 'flag'],
            ]}
          />

          {(disputeActionType === 'response' || disputeActionType === 'return_issue') ? (
            <form
              className="ops-form space-y-3 mt-3"
              onSubmit={event => {
                event.preventDefault();
                if (!disputeForm.disputeId || !disputeForm.body.trim()) return;
                run(async () => {
                  await api.post(`/disputes/${disputeForm.disputeId}/messages`, {
                    body:
                      disputeActionType === 'return_issue'
                        ? `[KHIẾU NẠI HÀNG HOÀN TRẢ] ${disputeForm.body.trim()}`
                        : disputeForm.body.trim(),
                    idempotencyKey: crypto.randomUUID(),
                  });
                  if (evidenceFile) {
                    await uploadDisputeEvidence(
                      disputeForm.disputeId,
                      evidenceFile,
                      (disputeForm.evidenceCaption || disputeForm.body).trim().slice(0, 500),
                      disputeActionType === 'return_issue' ? 'RETURN_RECEIPT' : 'GENERAL'
                    );
                  }
                  setCreateDisputeModal(false);
                  setEvidenceFile(null);
                  setDisputeForm(prev => ({ ...prev, body: '', evidenceCaption: '' }));
                  resource.reload();
                });
              }}
            >
              <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                {disputeActionType === 'return_issue'
                  ? 'Dành cho trường hợp khách gửi trả hàng nhưng món đồ bị tráo đổi, hư hại thêm hoặc không đúng số lượng.'
                  : 'Dành cho trường hợp người mua khiếu nại chưa đúng thực tế — Shop gửi giải trình kèm ảnh chụp lúc đóng gói/bàn giao.'}
              </p>
              <Field label="Chọn hồ sơ đơn hàng đang tranh chấp" icon="receipt_long">
                <select
                  required
                  className="input-field"
                  value={disputeForm.disputeId}
                  onChange={event =>
                    setDisputeForm(prev => ({ ...prev, disputeId: event.target.value }))
                  }
                >
                  <option value="">-- Chọn hồ sơ khiếu nại --</option>
                  {resource.items.map(item => (
                    <option key={idOf(item)} value={idOf(item)}>
                      Đơn #{shortId(item.orderId)} · {item.reason} ({item.status})
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  disputeActionType === 'return_issue'
                    ? 'Mô tả vấn đề của hàng hoàn trả'
                    : 'Nội dung giải trình / phản tố của Shop'
                }
                icon="edit"
              >
                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  className="input-field"
                  value={disputeForm.body}
                  onChange={event =>
                    setDisputeForm(prev => ({ ...prev, body: event.target.value }))
                  }
                  placeholder={
                    disputeActionType === 'return_issue'
                      ? 'Mô tả tình trạng gói hàng nhận lại (bị rách, bẩn, tráo sản phẩm khác...)'
                      : 'Nhập nội dung giải trình về tình trạng sản phẩm lúc đóng gói, mã vận đơn bàn giao...'
                  }
                />
              </Field>
              <Field label="Đính kèm ảnh bằng chứng (JPEG, PNG, WebP - tùy chọn)" icon="image">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event => setEvidenceFile(event.target.files?.[0] || null)}
                />
              </Field>
              <button
                type="submit"
                disabled={busy || !disputeForm.disputeId || !disputeForm.body.trim()}
                className="btn-primary text-xs py-2.5 px-5"
              >
                {disputeActionType === 'return_issue'
                  ? 'Gửi khiếu nại hàng trả'
                  : 'Gửi giải trình & bằng chứng'}
              </button>
            </form>
          ) : (
            <form
              className="ops-form space-y-3 mt-3"
              onSubmit={event => {
                event.preventDefault();
                if (
                  !disputeForm.productId ||
                  !disputeForm.reason ||
                  disputeForm.description.trim().length < 10
                ) {
                  return;
                }
                run(async () => {
                  await productReportService.createReport(disputeForm.productId, {
                    reason: disputeForm.reason,
                    description: disputeForm.description.trim(),
                  });
                  setCreateDisputeModal(false);
                  setDisputeForm(prev => ({ ...prev, description: '' }));
                });
              }}
            >
              <Field label="Chọn sản phẩm vi phạm" icon="shopping_bag">
                <select
                  required
                  className="input-field"
                  value={disputeForm.productId}
                  onChange={event =>
                    setDisputeForm(prev => ({ ...prev, productId: event.target.value }))
                  }
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {otherProducts.map(prod => (
                    <option key={prod._id} value={prod._id}>
                      {prod.title} ({prod.brand || 'Vintage'})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Lý do khiếu nại" icon="flag">
                <select
                  required
                  className="input-field"
                  value={disputeForm.reason}
                  onChange={event =>
                    setDisputeForm(prev => ({ ...prev, reason: event.target.value }))
                  }
                >
                  {Object.entries(reportReasons).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mô tả chi tiết (tối thiểu 10 ký tự)" icon="edit">
                <textarea
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={3}
                  className="input-field"
                  value={disputeForm.description}
                  onChange={event =>
                    setDisputeForm(prev => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Mô tả chi tiết vi phạm (sao chép hình ảnh shop, hàng giả, thông tin sai lệch...)"
                />
              </Field>
              <button
                type="submit"
                disabled={
                  busy ||
                  !disputeForm.productId ||
                  disputeForm.description.trim().length < 10
                }
                className="btn-primary text-xs py-2.5 px-5"
              >
                Gửi khiếu nại sản phẩm
              </button>
            </form>
          )}
        </Dialog>
      )}

      {replyTo && (
        <Dialog title="Phản hồi đánh giá sản phẩm" busy={busy} onClose={() => setReplyTo(null)}>
          <Feedback busy={busy} error={error} />
          <p>{replyTo.comment}</p>
          <form
            className="ops-form"
            onSubmit={e => {
              e.preventDefault();
              run(async () => {
                await api.post(`/reviews/${idOf(replyTo)}/reply`, { text: reply.trim() });
                setReplyTo(null);
                resource.reload();
              });
            }}
          >
            <label>
              Phản hồi của shop
              <textarea
                required
                maxLength="1000"
                value={reply}
                onChange={e => setReply(e.target.value)}
              />
            </label>
            <p className="ops-note">
              Mỗi đánh giá có một phản hồi từ shop. Hãy kiểm tra nội dung trước khi gửi.
            </p>
            <button disabled={busy}>Gửi phản hồi</button>
          </form>
        </Dialog>
      )}
    </div>
  );
}

export default function SellerOperations({ section }) {
  return section === 'shipments' ? (
    <ShipmentOperations />
  ) : (
    <SellerInbox key={section} section={section} />
  );
}

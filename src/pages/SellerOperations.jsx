import { useEffect, useState } from 'react';
import * as api from '../services/operationsService';
import usePagedResource from '../hooks/usePagedResource';
import { useApp } from '../context/AppContext';
import { useAction } from '../hooks/useAction';
import { Feedback, Tabs } from '../components/MarketplaceUI';
import { date, shortId } from '../utils/operationFormatting';
import { Dialog, Facts, Pager, ResourceFeedback, Status } from '../components/OperationsUI';
import { idOf, money } from '../utils/marketplace';
import ShipmentOperations from './ShipmentOperations';

function SellerInbox({ section }) {
  const { openResource } = useApp();
  const [type, setType] = useState('product');
  const [summary, setSummary] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [reply, setReply] = useState('');
  const { busy, error, run } = useAction();
  const path =
    section === 'payouts'
      ? '/seller/payouts'
      : type === 'product'
      ? '/seller/reviews'
      : '/seller/ratings';
  const resource = usePagedResource(path);

  useEffect(() => {
    if (section === 'reviews') {
      run(async () => setSummary((await api.get('/seller/ratings/summary')).summary));
    }
  }, [section, run]);

  return (
    <div className="ops-page">
      <h1>
        {section === 'payouts'
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
        <button type="button" onClick={resource.reload}>
          Làm mới danh sách
        </button>
      </div>

      <ResourceFeedback resource={resource} />

      {resource.items.map(item => (
        <section className="ops-card" key={idOf(item)}>
          <h2>
            {section === 'reviews'
              ? `${item.rating}/5 sao · ${item.productId?.title || 'Cửa hàng'}`
              : money(item.amount)}
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
                  section === 'reviews' ? 'REVIEW' : 'PAYOUT',
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

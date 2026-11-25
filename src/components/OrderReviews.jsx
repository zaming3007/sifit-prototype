import { useEffect, useState } from 'react';
import * as reviewService from '../services/reviewService';
import { useAction } from '../hooks/useAction';
import { idOf } from '../utils/marketplace';
import { formatOrderDate } from '../utils/orderDates';
import { Feedback, Field } from './MarketplaceUI';

function ProductReviewEditor({ order, item, review, onSaved, canCreate }) {
  const { busy, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0);
  const canEdit = review?.canEdit && new Date(review.editDeadline) >= new Date();
  const start = () => {
    setForm({ rating: review?.rating ?? 5, comment: review?.comment || '' });
    setFiles([]); setFileKey(value => value + 1); setOpen(true);
  };
  const save = event => {
    event.preventDefault();
    run(async () => {
      if (files.length + (review?.images?.length || 0) > 5) throw new Error('Một đánh giá chỉ có tối đa 5 ảnh.');
      if (files.some(file => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
        throw new Error('Chọn ảnh JPEG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh.');
      }
      let saved = review
        ? await reviewService.updateReview(review._id, form)
        : await reviewService.createProductReview({ orderId: order._id, productId: idOf(item.productId), ...form });
      // Persist the created review id before uploading, so retrying a failed
      // Cloudinary upload never creates a second review or loses the text.
      onSaved(saved);
      if (files.length) {
        saved = await reviewService.uploadReviewImages(saved._id, files);
        onSaved(saved);
      }
      setFiles([]); setFileKey(value => value + 1); setOpen(false);
    });
  };
  return <section className="review-editor border rounded-xl p-4 space-y-3" aria-label={`Đánh giá sản phẩm ${item.title}`}>
    <h4 className="font-bold">Đánh giá: {item.title}</h4>
    <Feedback busy={busy} error={error} />
    {review?.status === 'REMOVED' ? <p>Bạn đã xóa đánh giá này. Mỗi sản phẩm trong đơn chỉ được đánh giá một lần.</p> : <>
      {review && <div className="space-y-2">
        <p>{review.rating}/5 · {review.status === 'HIDDEN' ? 'Đang bị ẩn' : 'Đã đăng đánh giá'}</p>
        <p className="whitespace-pre-wrap">{review.comment}</p>
        <p>{canEdit ? 'Có thể chỉnh sửa đến' : 'Hạn chỉnh sửa'}: {formatOrderDate(review.editDeadline)}</p>
        <div className="flex gap-3 flex-wrap">{(review.images || []).map(asset => <div key={asset.publicId} className="space-y-1">
          <a href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt="Ảnh đánh giá" className="w-24 h-24 object-cover rounded-xl" /></a>
          {canEdit && <button disabled={busy} onClick={() => run(async () => onSaved(await reviewService.deleteReviewImage(review._id, asset.publicId)))}>Xóa ảnh đánh giá</button>}
        </div>)}</div>
        {review.sellerReply?.text && <p>Phản hồi của người bán: {review.sellerReply.text}</p>}
      </div>}
      {!open && <div className="flex gap-3 flex-wrap">
        {!review && canCreate && <button disabled={busy} onClick={start}>Đánh giá</button>}
        {review && canEdit && <button disabled={busy} onClick={start}>Sửa đánh giá</button>}
        {review && <button disabled={busy} onClick={() => setConfirmDelete(true)}>Xóa đánh giá</button>}
      </div>}
      {open && <form onSubmit={save} className="space-y-3">
        <Field label="Số sao"><input className="input-field" type="number" min="1" max="5" required value={form.rating} onChange={event => setForm({ ...form, rating: Number(event.target.value) })} /></Field>
        <Field label="Nhận xét"><textarea className="input-field" maxLength="2000" placeholder="Nhận xét" value={form.comment} onChange={event => setForm({ ...form, comment: event.target.value })} /></Field>
        <Field label="Ảnh đánh giá (tối đa 5 ảnh, 5 MB mỗi ảnh)"><input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => setFiles([...event.target.files])} /></Field>
        <p className="text-sm text-gray-500">Ảnh được tải sau khi lưu nội dung. Nếu tải ảnh thất bại, nội dung đã lưu vẫn được giữ để bạn thử lại.</p>
        <div className="flex gap-3"><button disabled={busy} type="submit">{review ? 'Lưu đánh giá' : 'Gửi đánh giá'}</button><button type="button" disabled={busy} onClick={() => setOpen(false)}>Hủy sửa đánh giá</button></div>
      </form>}
      {confirmDelete && <div role="group" aria-label="Xác nhận xóa đánh giá" className="p-3 bg-red-50 rounded-xl space-y-2">
        <p>Xóa đánh giá khỏi trang công khai? Bạn không thể đăng lại đánh giá cho sản phẩm này.</p>
        <button disabled={busy} onClick={() => run(async () => { onSaved(await reviewService.removeReview(review._id)); setConfirmDelete(false); setOpen(false); })}>Xác nhận xóa đánh giá</button>
        <button disabled={busy} onClick={() => setConfirmDelete(false)}>Giữ đánh giá</button>
      </div>}
    </>}
  </section>;
}

export default function OrderReviews({ order, onOrderChange }) {
  const { busy, error, run } = useAction();
  const [reviews, setReviews] = useState(order.productReviews || []);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(order.sellerRating || null);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  useEffect(() => { setReviews(order.productReviews || []); }, [order.productReviews]);
  const onSaved = review => setReviews(prev => [...prev.filter(item => item._id !== review._id), review]);
  const canCreate = order.paymentStatus === 'PAID' && !!order.deliveredAt && !order.reviewsBlocked;
  const sellerRating = rating || order.sellerRating;
  return <div className="space-y-4" aria-label="Đánh giá đơn hàng">
    <Feedback busy={busy} error={error} />
    {error && <button disabled={busy} onClick={() => run(onOrderChange)}>Tải lại đánh giá</button>}
    {!canCreate && <p>Chỉ đánh giá khi đơn đã giao, hoàn thành, thanh toán hợp lệ.</p>}
    {order.items.map(item => <ProductReviewEditor key={idOf(item.productId)} order={order} item={item}
      review={reviews.find(review => idOf(review.productId) === idOf(item.productId))} onSaved={onSaved} canCreate={canCreate} />)}
    <section className="border rounded-xl p-4 space-y-3" aria-label="Đánh giá shop">
      <h4 className="font-bold">Đánh giá shop</h4>
      {sellerRating ? <><p>Bạn đã đánh giá shop: {sellerRating.rating}/5</p><p>{sellerRating.comment}</p><p>Mỗi đơn hàng được đánh giá shop một lần.</p></>
        : !ratingOpen ? <button disabled={busy || !canCreate} onClick={() => setRatingOpen(true)}>Đánh giá shop</button>
          : <form className="space-y-3" onSubmit={event => { event.preventDefault(); run(async () => {
            setRating(await reviewService.createSellerRating({ orderId: order._id, ...form }));
            setRatingOpen(false); await onOrderChange();
          }); }}>
            <Field label="Số sao cho shop"><input className="input-field" required type="number" min="1" max="5" value={form.rating} onChange={event => setForm({ ...form, rating: Number(event.target.value) })} /></Field>
            <Field label="Nhận xét về shop"><textarea className="input-field" maxLength="2000" value={form.comment} onChange={event => setForm({ ...form, comment: event.target.value })} /></Field>
            <button disabled={busy}>Gửi đánh giá shop</button><button type="button" disabled={busy} onClick={() => setRatingOpen(false)}>Hủy đánh giá shop</button>
          </form>}
    </section>
  </div>;
}

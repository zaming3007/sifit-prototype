import { useCallback, useEffect, useState } from 'react';
import * as api from '../services/operationsService';
import { useApp } from '../context/AppContext';
import { useAction } from '../hooks/useAction';
import { Feedback } from '../components/MarketplaceUI';
import { date, shortId } from '../utils/operationFormatting';
import { Facts, PayoutDetails, Status } from '../components/OperationsUI';
import { ShipmentDetails } from './ShipmentOperations';
import OrderDetails from '../components/OrderDetails';
import OrderCard from '../components/OrderCard';
import AdminOrderCompletion from '../components/AdminOrderCompletion';
import { normalizeOrder } from '../services/orderService';
import { idOf, money } from '../utils/marketplace';
import { normalizeProduct } from '../utils/normalizers';
import * as productService from '../services/productService';
import { getApiErrorMessage } from '../utils/errorHandler';
import OfferCard from '../components/OfferCard';
import RefundDetails from '../components/RefundDetails';
import DisputeCaseDetails from '../components/DisputeCaseDetails';
import PaymentExceptionDetails from '../components/PaymentExceptionDetails';
import SellerVerificationDetails from '../components/SellerVerificationDetails';

export default function ResourcePage() {
  const { user, resourceTarget, openResource, setActiveChatId, fetchChats, setCurrentView, openProduct } = useApp();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { busy, error, run } = useAction();
  const { type, id } = resourceTarget;
  const reload = useCallback(async () => {
    if (!/^[a-fA-F0-9]{24}$/.test(id || '')) throw new Error('Đường dẫn không hợp lệ.');
    const paths = { REFUND: `/refunds/${id}`, OFFER: `/offers/${id}`, ORDER: `/orders/${id}`, DISPUTE: `/disputes/${id}`, SHIPMENT: `/shipments/${id}`, PAYMENT: `/payments/${id}`, REVIEW: `/account/reviews/${id}`, PAYOUT: `/${user.role === 'admin' ? 'admin' : 'seller'}/payouts/${id}`, USER: `/admin/users/${id}` };
    if (type === 'VERIFICATION') return api.get(`/seller-verifications/${id}`);
    if (type === 'CONVERSATION') { await fetchChats(); setActiveChatId(id); setCurrentView('chat'); return; }
    if (type === 'PRODUCT') {
      let product;
      if (user.role === 'seller' || user.role === 'admin') product = normalizeProduct((await api.get(`/${user.role}/products/${id}`)).product);
      else product = await productService.getProduct(id);
      if (!product) throw new Error('Sản phẩm không còn khả dụng hoặc bạn không có quyền xem.');
      return { product };
    }
    if (!paths[type]) throw new Error('Chưa hỗ trợ loại thông báo này.');
    return api.get(paths[type]);
  // Navigation helpers are provided by the application context.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, user.role]);
  useEffect(() => { let live = true; setRecord(null); setLoading(true); setLoadError(''); reload().then(value => { if (live) setRecord(value); }).catch(error => { if (live) setLoadError(getApiErrorMessage(error)); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [reload]);
  const refresh = async () => { setLoadError(''); setRecord(await reload()); };
  const order = record?.order && normalizeOrder(record.order);
  const review = record?.review;
  return <div className="ops-page"><div className="ops-toolbar"><h1>Chi tiết {({ VERIFICATION: 'hồ sơ xác minh', REFUND: 'khoản hoàn tiền', OFFER: 'đề nghị giá', ORDER: 'đơn hàng', DISPUTE: 'khiếu nại', SHIPMENT: 'vận chuyển', PAYMENT: 'thanh toán', REVIEW: 'đánh giá', PAYOUT: 'chi trả', PRODUCT: 'sản phẩm', CONVERSATION: 'hội thoại', USER: 'tài khoản' })[type] || 'thông báo'}</h1><button disabled={busy || loading} onClick={() => run(refresh)}>Làm mới chi tiết</button><button onClick={() => setCurrentView('notifications')}>Về thông báo</button></div><Feedback busy={busy || loading} error={error || loadError} />
    {order && (user.role === 'buyer' ? <OrderCard key={order._id} order={order} onChange={refresh} /> : <section className="ops-card"><Facts entries={[[ 'Mã đơn', idOf(order) ], ['Trạng thái', <Status key="status" value={order.orderStatus} />], ['Thanh toán', <Status key="status" value={order.paymentStatus} />], ['Tổng tiền', money(order.totalAmount)]]} />{order.items.map((item, index) => <p key={index}>{item.title} · {money(item.price)}</p>)}<OrderDetails order={order} now={Date.now()} /></section>)}
    {record?.shipment && <section className="ops-card"><ShipmentDetails shipment={record.shipment} /><button onClick={() => openResource('ORDER', idOf(record.shipment.orderId))}>Xem đơn hàng</button></section>}
    {record?.offer && <OfferCard offer={record.offer} onChange={() => run(refresh)} showHistory />}
    {record?.refund && <RefundDetails key={idOf(record.refund)} refund={record.refund} onChange={refresh} />}
    {order && user.role === 'admin' && <section className="ops-card"><AdminOrderCompletion order={order} onChange={refresh} /></section>}
    {record?.payout && <section className="ops-card"><PayoutDetails payout={record.payout} openResource={openResource} /></section>}
    {record?.user && <section className="ops-card"><Facts entries={[[ 'Họ tên', record.user.fullName ], ['Email', record.user.email], ['Vai trò', record.user.role], ['Trạng thái', record.user.status], ['Ngày tạo', date(record.user.createdAt)], ['Ngày cập nhật', date(record.user.updatedAt)]]} /></section>}
    {record?.payment && <section className="ops-card"><Facts entries={[[ 'Mã giao dịch', idOf(record.payment) ], ['Giá trị', money(record.payment.amount)], ['Trạng thái', <Status key="status" value={record.payment.status} />], ['Đã yêu cầu hoàn', money(record.payment.refundedAmount || 0)], ['Nhà cung cấp', record.payment.provider], ['Ngày tạo', date(record.payment.createdAt)]]} />{record.payment.provider === 'simulator' && <p className="ops-note">Thanh toán đang ở chế độ mô phỏng.</p>}</section>}
    {record?.dispute && <DisputeCaseDetails key={idOf(record.dispute)} dispute={record.dispute} onChange={refresh} />}
    {record?.verification && <SellerVerificationDetails key={idOf(record.verification)} verificationId={idOf(record.verification)} onChange={refresh} />}
    {record?.payment?.provider === 'payos' && (record.payment.requiresReview || record.payment.exceptionReviewState && record.payment.exceptionReviewState !== 'NONE') && <PaymentExceptionDetails key={idOf(record.payment)} paymentId={idOf(record.payment)} onChange={refresh} />}
    {review && <section className="ops-card"><h2>{review.rating}/5 sao · {review.title}</h2><Facts entries={[[ 'Người đánh giá', review.buyerId?.fullName || shortId(review.buyerId) ], ['Trạng thái', <Status key="status" value={review.status} />], ['Nội dung', review.comment], ['Ngày tạo', date(review.createdAt)], ['Phản hồi shop', review.sellerReply?.text], ['Lý do kiểm duyệt', review.moderation?.reason]]} /><div className="ops-images">{review.images?.map((image, i) => <a key={i} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={`Ảnh đánh giá ${i + 1}`} /></a>)}</div>{review.orderId && <button onClick={() => openResource('ORDER', idOf(review.orderId))}>Xem đơn hàng liên quan</button>}</section>}
    {record?.product && <section className="ops-card"><h2>{record.product.title}</h2><p>{record.product.description}</p><Facts entries={[[ 'Giá', money(record.product.price) ], ['Trạng thái', record.product.status], ['Lý do từ chối', record.product.rejectionReason]]} /><div className="ops-images">{record.product.images?.map((image, i) => <img key={i} src={typeof image === 'string' ? image : image.url} alt="" />)}</div>{record.product.status === 'active' && <button onClick={() => openProduct(record.product)}>Xem trang sản phẩm</button>}</section>}
  </div>;
}

import { useEffect, useRef, useState } from 'react';
import * as orderService from '../services/orderService';
import * as paymentService from '../services/paymentService';
import * as shippingService from '../services/shippingService';
import OrderDetails from './OrderDetails';
import SellerOrderSummary from './SellerOrderSummary';
import OrderReviews from './OrderReviews';
import Icon from './Icon';
import { Feedback, Field } from './MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { money, idOf } from '../utils/marketplace';
import '../seller-orders.css';
import PaymentPanel from './PaymentPanel';
import ManualShipmentForm from './ManualShipmentForm';
import * as operations from '../services/operationsService';
import { useApp } from '../context/AppContext';
import { refundLabels } from '../utils/refundLabels';
import { formatOrderDate } from '../utils/orderDates';
import '../buyer-orders.css';


const paymentStatuses = { UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', FAILED: 'Thất bại', REFUND_PENDING: 'Chờ hoàn tiền', REFUNDED: 'Đã hoàn tiền' };
const statuses = { PENDING_PAYMENT: 'Chờ thanh toán', PAID: 'Đã đặt hàng', PROCESSING: 'Đang chuẩn bị', SHIPPED: 'Đang vận chuyển', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', REFUND_PENDING: 'Chờ hoàn tiền', REFUNDED: 'Đã hoàn tiền' };
export default function OrderCard({ order, seller = false, addresses = [], onChange, onPay, activePayment, onViewPayment }) {
  const { openResource } = useApp();
  const { busy, error, run } = useAction();
  const [tracking, setTracking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [now, setNow] = useState(Date.now);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [shipment, setShipment] = useState({ pickupAddressId: '', weightGrams: '', packageLengthCm: '', packageWidthCm: '', packageHeightCm: '' });
  const [quote, setQuote] = useState(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [shippingProvider, setShippingProvider] = useState('manual');
  const [handoverNote, setHandoverNote] = useState('');
  useEffect(() => { let live = true; operations.get('/payments/config').then(config => { if (live) setShippingProvider(config.shippingProvider); }).catch(() => {}); return () => { live = false; }; }, []);
  const paymentKey = useRef(crypto.randomUUID());
  const shipmentKey = useRef(crypto.randomUUID());
  useEffect(() => {
    if (seller || (!detailsOpen && order.orderStatus !== 'PENDING_PAYMENT')) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [seller, detailsOpen, order.orderStatus]);
  const groupId = idOf(order.checkoutGroupId);
  const showingPayment = groupId && groupId === idOf(activePayment?.checkoutGroupId)
    && (activePayment.requiresReview || ['INITIATED', 'PENDING'].includes(activePayment.status));
  const viewPaymentLabel = activePayment?.requiresReview ? 'Xem đối soát' : activePayment?.qrCode ? 'Xem mã QR' : 'Xem thanh toán';
  const paymentExpired = order.reservationExpiresAt && new Date(order.reservationExpiresAt).getTime() <= now;
  const pay = () => run(async () => {
    if (onPay) await onPay(groupId);
    else setPayment(await paymentService.createPayment({ checkoutGroupId: groupId, idempotencyKey: paymentKey.current }));
  });
  const status = statuses[order.orderStatus] || order.orderStatus;
  const paymentStatus = paymentStatuses[order.paymentStatus] || order.paymentStatus;
  const refund = (order.refundedAmount > 0 || order.refundPendingAmount > 0) && <p className={seller ? "seller-order-refund" : undefined}>Đã hoàn: {money(order.refundedAmount || 0)} · Đang chờ hoàn: {money(order.refundPendingAmount || 0)}{seller && <> · Tiền người bán còn lại: {money(order.sellerProceeds - (order.refundedSellerProceeds || 0))}</>}</p>;
  const feedback = <Feedback error={error} busy={busy} />;
  const actions = (
    <div className="member-order-actions flex gap-3 flex-wrap">
      {!seller && order.orderStatus === 'PENDING_PAYMENT' && <button className="buyer-order-primary" disabled={busy || (!showingPayment && !!paymentExpired)} onClick={showingPayment ? onViewPayment : pay}>{showingPayment ? viewPaymentLabel : 'Thanh toán'}</button>}
      {!seller && (order.orderStatus === 'DELIVERED' || (shippingProvider === 'manual' && order.orderStatus === 'SHIPPED')) && !order.buyerConfirmedAt && <button disabled={busy} onClick={() => run(async () => { await orderService.confirmReceipt(order._id); await onChange(); })}>Xác nhận đã nhận hàng</button>}
      {seller && order.orderStatus === 'PAID' && <button disabled={busy} onClick={() => run(async () => { await operations.post(`/seller/orders/${order._id}/accept`); await onChange(); })}>Xác nhận chuẩn bị hàng</button>}
      {['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.orderStatus) && <button disabled={busy} onClick={() => run(async () => {
        setTracking(await shippingService.getTracking(order._id));
        if (!seller) { setNow(Date.now()); setDetailsOpen(true); }
      })}>Xem vận đơn</button>}
      {seller && ['PAID', 'PROCESSING'].includes(order.orderStatus) && <button className="seller-order-primary" disabled={busy} onClick={() => setShipOpen(!shipOpen)}>Tạo vận đơn</button>}
    </div>
  );
  const firstItem = order.items[0];
  const itemCount = order.items.reduce((count, item) => count + item.quantity, 0);
  return <article className={seller ? 'seller-order-card' : 'buyer-order-card'}>
    {seller ? <>
      <SellerOrderSummary order={order} status={status} paymentStatus={paymentStatus} refund={refund}>{actions}</SellerOrderSummary>
      {feedback}
    </> : <>
      <div className="buyer-order-meta">
        <div><h3>Đơn #{order._id.slice(-8)}</h3><span>{formatOrderDate(order.createdAt)}</span></div>
        <span className="member-order-status" data-status={order.orderStatus}>{status}</span>
      </div>
      <div className="buyer-order-overview">
        <div className="buyer-order-thumb">{firstItem?.image ? <img src={firstItem.image} alt="" /> : <Icon name="shopping_bag" />}</div>
        <div className="buyer-order-item">
          <strong>{firstItem?.title || 'Sản phẩm'}</strong>
          <p>{[order.seller?.name, `${itemCount} món`].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="buyer-order-amount"><span>Tổng thanh toán</span><strong>{money(order.totalAmount)}</strong></div>
      </div>
      <div className="buyer-order-footer">
        {actions}
        <button type="button" className="buyer-order-toggle" aria-expanded={detailsOpen} aria-controls={`buyer-order-${order._id}`} onClick={() => { setNow(Date.now()); setDetailsOpen(open => !open); }}>
          {detailsOpen ? 'Thu gọn' : 'Xem chi tiết'}<Icon name={detailsOpen ? 'expand_less' : 'expand_more'} />
        </button>
      </div>
      <div id={`buyer-order-${order._id}`} className="buyer-order-details" hidden={!detailsOpen}>
        {detailsOpen && <>
          <ul className="buyer-order-breakdown">{order.items.map((item, index) => <li key={idOf(item.productId) || index}><span>{item.title} × {item.quantity}</span><span>{money(item.price)}</span></li>)}</ul>
          <p>Tiền hàng {money(order.subtotal)} · Phí giao hàng {money(order.shippingFee)} · {paymentStatus}</p>
          <OrderDetails order={order} now={now} />
          {order.refunds?.map(refund => <div key={idOf(refund)}><p>Hoàn {money(refund.amount)} · {refundLabels[refund.status]}</p><button onClick={() => openResource('REFUND', idOf(refund))}>Xem khoản hoàn và tài khoản nhận tiền</button></div>)}
          {refund}
          {order.orderStatus === 'COMPLETED' && <OrderReviews order={order} onOrderChange={onChange} />}
          {order.orderStatus === 'PENDING_PAYMENT' && <button disabled={busy} onClick={() => run(async () => { await orderService.cancelOrder(order._id); await onChange(); })}>Hủy toàn bộ đơn trong lần đặt hàng này</button>}
        </>}
      </div>
      {feedback}
    </>}
    {payment && <PaymentPanel payment={payment} onUpdate={setPayment} onConfirmed={onChange} onRetry={pay} />}
    {tracking && <div className={seller ? "seller-order-tracking p-3 bg-gray-50 rounded-xl" : "p-3 bg-gray-50 rounded-xl"}><p>Vận đơn: {tracking.trackingCode || tracking.trackingNumber || tracking.providerShipmentId}</p><p>{tracking.provider} · {tracking.status}</p>{tracking.trackingUrl && /^https?:\/\//i.test(tracking.trackingUrl) && <a href={tracking.trackingUrl} target="_blank" rel="noreferrer">Theo dõi giao hàng</a>}</div>}
    {seller && tracking?.provider === 'manual' && ['PENDING', 'READY_FOR_PICKUP'].includes(tracking.status) && <form className="workflow-form" onSubmit={event => { event.preventDefault(); run(async () => { const result = await operations.post(`/seller/shipments/${idOf(tracking)}/handover`, { note: handoverNote.trim() }); setTracking(result.shipment); await onChange(); }); }}><Field label="Căn cứ bàn giao hàng"><textarea className="input-field" required minLength={10} maxLength={1000} value={handoverNote} onChange={event => setHandoverNote(event.target.value)} placeholder="Mã biên nhận, thời gian bàn giao, ghi chú chứng từ" /></Field><button className="btn-primary" disabled={busy}>Xác nhận đã bàn giao hàng</button></form>}
    {shipOpen && shippingProvider === 'manual' && <ManualShipmentForm order={order} addresses={addresses} onSaved={async () => { setShipOpen(false); setTracking(await shippingService.getTracking(order._id)); await onChange(); }} />}
    {shipOpen && shippingProvider !== 'manual' && <form className="space-y-3" onSubmit={event => { event.preventDefault(); run(async () => {
      await shippingService.createSellerShipment(order._id, { ...shipment, idempotencyKey: shipmentKey.current }); setShipOpen(false); await onChange();
    }); }}><Field label="Địa chỉ lấy hàng"><select required className="input-field" value={shipment.pickupAddressId} onChange={event => { setShipment({ ...shipment, pickupAddressId: event.target.value }); setQuote(null); }}><option value="">Chọn địa chỉ</option>{addresses.filter(item => item.addressType !== 'SHIPPING').map(item => <option key={idOf(item)} value={idOf(item)}>{item.label} · {item.addressLine}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">{[['Khối lượng (gram)', 'weightGrams', 30000], ['Dài (cm)', 'packageLengthCm', 200], ['Rộng (cm)', 'packageWidthCm', 200], ['Cao (cm)', 'packageHeightCm', 200]].map(([label, key, max]) => <Field key={key} label={label}><input className="input-field" type="number" required min="1" max={max} value={shipment[key]} onChange={event => { setShipment({ ...shipment, [key]: event.target.value }); setQuote(null); }} /></Field>)}</div>
      <button type="button" disabled={busy} onClick={() => run(async () => setQuote(await shippingService.quote({ ...shipment, orderId: order._id })))}>Báo giá giao hàng</button>
      {quote && <p>Phí: {money(quote.quote?.shippingFee ?? quote.shippingFee ?? quote.quote?.fee ?? quote.fee)}</p>}
      <button disabled={busy} className="btn-primary">Tạo vận đơn</button>
    </form>}
  </article>;
}

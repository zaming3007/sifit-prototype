import { useEffect, useId, useState } from 'react';
import { idOf, money } from '../utils/marketplace';
import { formatOrderDate } from '../utils/orderDates';
import Icon from './Icon';
import OrderDetails from './OrderDetails';

function SellerOrderBreakdown({ order, refund, id }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const amounts = [
    ['Tiền hàng', order.subtotal],
    ['Phí giao hàng', order.shippingFee],
    ['Tổng thanh toán', order.totalAmount],
    ['Hoa hồng (' + (order.commissionRateBasisPoints || 0) / 100 + '%)', order.commissionAmount],
    ['Tiền người bán', order.sellerProceeds],
  ];
  return <div id={id} className="seller-order-breakdown">
    <section className="seller-order-breakdown-card">
      <h4>Chi tiết thanh toán</h4>
      <dl className="seller-order-finance">
        {amounts.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}
      </dl>
      {refund}
      {order.items.length > 1 && <>
        <h4>Sản phẩm trong đơn</h4>
        <ul className="seller-order-items">
          {order.items.map(item => <li key={idOf(item.productId)}><span>{item.title}</span><span>{money(item.price)} × {item.quantity}</span></li>)}
        </ul>
      </>}
    </section>
    <OrderDetails order={order} now={now} seller />
  </div>;
}

export default function SellerOrderSummary({ order, status, paymentStatus, refund, children }) {
  const [expanded, setExpanded] = useState(false);
  const breakdownId = useId();
  const firstItem = order.items[0];
  const remainingItems = order.items.length - 1;
  const buyer = order.buyer?.name || order.buyer?._id;
  const proceeds = order.sellerProceeds - (order.refundedSellerProceeds || 0);

  return <>
    <header className="seller-order-header">
      <div className="seller-order-reference">
        <h3>Đơn #{order._id.slice(-8)}</h3>
        {order.createdAt && <time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time>}
      </div>
      <span className="member-order-status" data-status={order.orderStatus}>{status}</span>
    </header>
    <div className="seller-order-summary">
      <div className="seller-order-item-preview">
        <span className="seller-order-thumbnail">
          <Icon name="image" />
          {firstItem?.image && <img src={firstItem.image} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}
        </span>
        <div className="seller-order-item-copy">
          <p className="seller-order-item-title">{firstItem?.title || 'Sản phẩm trong đơn'}</p>
          {firstItem && <p className="seller-order-muted">{money(firstItem.price)} × {firstItem.quantity}{remainingItems > 0 && <> · +{remainingItems} sản phẩm</>}</p>}
          {buyer && <p className="seller-order-buyer"><Icon name="person" />{buyer}</p>}
        </div>
      </div>
      <dl className="seller-order-totals">
        <div><dt>Tổng thanh toán</dt><dd>{money(order.totalAmount)}</dd></div>
        <div><dt>Tiền người bán</dt><dd>{money(proceeds)}</dd></div>
      </dl>
    </div>
    <div className="seller-order-footer">
      <span className="seller-order-payment" data-payment={order.paymentStatus}>{paymentStatus}</span>
      <div className="seller-order-controls">
        {children}
        <button type="button" className="seller-order-detail-toggle" aria-expanded={expanded} aria-controls={expanded ? breakdownId : undefined} onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Thu gọn chi tiết' : 'Xem chi tiết đơn'}<Icon name="expand_more" />
        </button>
      </div>
    </div>
    {expanded && <SellerOrderBreakdown order={order} refund={refund} id={breakdownId} />}
  </>;
}

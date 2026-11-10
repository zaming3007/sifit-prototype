import { formatOrderDate, timeRemaining } from '../utils/orderDates';

function Timestamp({ value }) {
  return value ? <time dateTime={new Date(value).toISOString()}>{formatOrderDate(value)}</time> : 'Chưa xác định';
}

export default function OrderDetails({ order, now }) {
  const address = order.shippingAddress;
  return <section aria-label="Thông tin giao hàng và thời hạn" className="member-order-details border rounded-xl p-4 bg-gray-50 space-y-3 text-sm">
    <h4 className="font-bold">Địa chỉ nhận hàng</h4>
    {address ? <address className="not-italic space-y-1">
      <p>{address.recipientName} · {address.phone}</p>
      <p>{[address.addressLine, address.ward, address.city || address.province, address.postalCode].filter(Boolean).join(', ')}</p>
      {address.notes && <p>Ghi chú địa chỉ: {address.notes}</p>}
    </address> : <p>Đơn hàng chưa có thông tin địa chỉ.</p>}
    {order.notes && <p>Ghi chú đơn hàng: {order.notes}</p>}
    {order.sellerShipBy && ['PAID', 'PROCESSING'].includes(order.orderStatus) && <div><p>Hạn gửi hàng: <Timestamp value={order.sellerShipBy} /></p>{new Date(order.sellerShipBy) < new Date(now) && <p className="text-red-700">Đã quá hạn gửi hàng. Vui lòng liên hệ shop hoặc hỗ trợ; đơn đã thanh toán không tự hủy.</p>}</div>}
    <p>Ngày đặt hàng: <Timestamp value={order.createdAt} /></p>
    <p className="text-gray-500">Các mốc thời gian hiển thị theo giờ Việt Nam (UTC+7).</p>
    {order.orderStatus === 'PENDING_PAYMENT' && <div>
      <p>Hạn giữ chỗ / thanh toán: <Timestamp value={order.reservationExpiresAt} /></p>
      {order.reservationExpiresAt && <p className="font-medium">{timeRemaining(order.reservationExpiresAt, now)}</p>}
      {new Date(order.reservationExpiresAt).getTime() <= now
        ? <p className="text-red-700">Đã hết hạn thanh toán. Làm mới đơn để xem trạng thái sau khi hệ thống xử lý hết hạn.</p>
        : <p>Sản phẩm được giữ chỗ đến hạn này. Đơn chưa thanh toán có thể bị hủy khi hết hạn.</p>}
    </div>}
    {order.deliveredAt && <p>Đã xác nhận giao hàng: <Timestamp value={order.deliveredAt} /></p>}
    {order.buyerConfirmedAt && <p>Bạn đã xác nhận nhận hàng: <Timestamp value={order.buyerConfirmedAt} /></p>}
    {order.buyerConfirmedAt && order.orderStatus === 'DELIVERED' && <p>Đã nhận hàng · Chờ admin kiểm tra hoàn tất.</p>}
    {order.protectionEndsAt ? <div>
      <p>Hạn bảo vệ người mua: <Timestamp value={order.protectionEndsAt} /></p>
      <p>{timeRemaining(order.protectionEndsAt, now)}</p>
      <p>Khiếu nại về hàng nhận được phải mở trong thời hạn bảo vệ. Xác nhận nhận hàng không rút ngắn thời hạn này.</p>
    </div> : order.paymentStatus === 'PAID' && <p>Thời hạn bảo vệ sau giao hàng sẽ bắt đầu khi hệ thống xác nhận đã giao. Trước đó, bạn có thể khiếu nại chưa nhận hàng.</p>}
  </section>;
}

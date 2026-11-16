import { idOf } from './marketplace';
import { formatOrderDate } from './orderDates';

export const date = value => value ? formatOrderDate(value) : '—';
export const shortId = value => idOf(value) ? `#${idOf(value).slice(-8)}` : '—';
export const statusLabels = {
  MATCHED: 'Đã đối chiếu', UNMATCHED: 'Chưa khớp giao dịch',
  ACTIVE: 'Hoạt động', SUSPENDED: 'Tạm khóa', PUBLISHED: 'Công khai', HIDDEN: 'Đã ẩn', REMOVED: 'Tác giả đã xóa',
  OPEN: 'Mới mở', UNDER_REVIEW: 'Đang xem xét', RESOLVED_BUYER: 'Chấp nhận bên mua', RESOLVED_SELLER: 'Chấp nhận bên bán', CLOSED: 'Đã đóng',
  PENDING: 'Chờ xử lý', ELIGIBLE: 'Đủ điều kiện', APPROVED: 'Đã duyệt', PAID: 'Đã thanh toán', SUCCEEDED: 'Thành công', FAILED: 'Thất bại',
  REQUESTED: 'Đã yêu cầu', REFUND_PENDING: 'Đang hoàn tiền', PARTIALLY_REFUNDED: 'Hoàn tiền một phần', REFUNDED: 'Đã hoàn tiền',
  READY_FOR_PICKUP: 'Chờ lấy hàng', PICKED_UP: 'Đã lấy hàng', IN_TRANSIT: 'Đang vận chuyển', OUT_FOR_DELIVERY: 'Đang giao', DELIVERED: 'Đã giao',
  DELIVERY_FAILED: 'Giao thất bại', RETURNING: 'Đang hoàn hàng', RETURNED: 'Đã hoàn hàng', CANCELLED: 'Đã hủy',
  VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối', NOT_SUBMITTED: 'Chưa gửi xác minh', COMPLETED: 'Hoàn thành', PROCESSING: 'Đang chuẩn bị',
  CREATED: 'Mới tạo', INITIATED: 'Đã khởi tạo', EXPIRED: 'Hết hạn', RECOGNIZED: 'Đã ghi nhận', REVERSED: 'Đã đảo', PENDING_PAYMENT: 'Chờ thanh toán', SHIPPED: 'Đã bàn giao vận chuyển',
};

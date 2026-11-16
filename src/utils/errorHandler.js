import { notifyAction } from './actionNotifier';

const translations = [
  [/invalid (email or password|credentials)|incorrect.*password/i, 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.'],
  [/email.*already|already.*email/i, 'Email này đã được đăng ký. Hãy đăng nhập hoặc đặt lại mật khẩu.'],
  [/cannot add your own|cannot buy your own/i, 'Bạn không thể mua sản phẩm do chính shop mình đăng bán. Hãy chọn sản phẩm từ shop khác.'],
  [/already in.*cart/i, 'Sản phẩm đã có trong giỏ hàng của bạn.'],
  [/product.*(unavailable|not available|not active)/i, 'Sản phẩm đã ngừng bán hoặc đang được giữ chỗ. Hãy chọn sản phẩm khác.'],
  [/only draft or rejected/i, 'Chỉ sửa được sản phẩm đang là bản nháp hoặc bị từ chối.'],
  [/at least one image/i, 'Hãy tải lên ít nhất một ảnh trước khi gửi duyệt.'],
  [/at most 8|image limit exceeded/i, 'Mỗi sản phẩm được tải tối đa 8 ảnh. Hãy xóa bớt ảnh rồi thử lại.'],
  [/unsupported image|invalid image/i, 'Ảnh không hợp lệ. Hãy chọn ảnh JPEG, PNG hoặc WebP.'],
  [/uploaded file is too large|file too large/i, 'Ảnh vượt quá dung lượng cho phép. Hãy chọn ảnh nhỏ hơn.'],
  [/cart.*empty|empty.*cart/i, 'Giỏ hàng đang trống. Hãy thêm sản phẩm trước khi thanh toán.'],
  [/resource already exists|duplicate/i, 'Thông tin này đã tồn tại. Hãy kiểm tra lại trước khi gửi.'],
  [/not found/i, 'Không tìm thấy nội dung này. Nội dung có thể đã bị xóa hoặc bạn không có quyền xem.'],
  [/suspended|account.*blocked/i, 'Tài khoản đang bị tạm khóa. Vui lòng liên hệ Sifit để được hỗ trợ.'],
  [/insufficient permissions|permission|forbidden|not authorized/i, 'Tài khoản hiện tại không có quyền thực hiện thao tác này. Hãy dùng tài khoản có quyền phù hợp.'],
  [/expired.*token|token.*expired|unauthorized|authentication/i, 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.'],
  [/network error|failed to fetch/i, 'Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.'],
  [/timeout|timed out/i, 'Máy chủ phản hồi chậm. Hãy chờ một chút rồi thử lại.'],
];
const fields = { title: 'Tên sản phẩm', description: 'Mô tả', price: 'Giá bán', email: 'Email', password: 'Mật khẩu', fullName: 'Họ và tên', categoryId: 'Danh mục', phone: 'Số điện thoại', reason: 'Lý do', amount: 'Số tiền', note: 'Ghi chú', startDate: 'Từ ngày', endDate: 'Đến ngày' };
export const errorLocale = () => typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'vi';
function validationMessage(item) {
  const name = fields[String(item.field || item.path || '').split('.').at(-1)] || 'Thông tin';
  const text = item.message || '';
  if (/Start date must not be after end date/i.test(text)) return 'Từ ngày không được sau Đến ngày. Hãy chọn lại khoảng thời gian.';
  if (/Invalid date/i.test(text)) return `${name}: ngày không hợp lệ. Hãy chọn lại ngày.`;
  if (/[^\p{ASCII}]/u.test(text)) return text;
  const bound = text.match(/(?:>=|<=|least|most|minimum|maximum)\s*(\d+)/i)?.[1];
  if (/email/i.test(text)) return `${name}: địa chỉ email không hợp lệ.`;
  if (/too small|at least|minimum|>=/i.test(text)) return `${name}: chưa đạt mức tối thiểu${bound ? ` (${bound})` : ''}.`;
  if (/too big|at most|maximum|<=/i.test(text)) return `${name}: vượt quá mức tối đa${bound ? ` (${bound})` : ''}.`;
  return `${name}: hãy kiểm tra lại giá trị đã nhập.`;
}
export function getApiErrorMessage(error, fallback) {
  const english = errorLocale() === 'en';
  const generic = fallback || (english ? 'Something went wrong. Please try again.' : 'Có lỗi xảy ra. Vui lòng thử lại.');
  if (!error) return generic;
  const response = error.response?.data;
  if (response?.errors?.length) return response.errors.map(item => english ? item.message : validationMessage(item)).join('\n');
  const raw = response?.message || error.message || '';
  if (english) return raw || generic;
  if (/[^\p{ASCII}]/u.test(raw)) return raw;
  const status = error.response?.status;
  const url = error.config?.url || '';
  if (status === 403 && /insufficient permissions/i.test(raw)) {
    if (url.includes('/admin/')) return 'Thao tác này dành cho quản trị viên. Hãy đăng nhập tài khoản admin để tiếp tục.';
    if (url.includes('/seller/') || url === '/products') return 'Thao tác này dành cho người bán. Hãy chuyển sang tài khoản người bán để quản lý cửa hàng.';
    if (/\/(cart|wishlist|orders|conversations)(\/|$)/.test(url)) return 'Tài khoản hiện tại chưa có quyền mua sắm cho thao tác này. Hãy chuyển sang tài khoản người mua hoặc liên hệ Sifit nếu bạn đang dùng tài khoản người bán.';
    return 'Tài khoản hiện tại chưa được phép thực hiện thao tác này. Hãy kiểm tra vai trò tài khoản hoặc liên hệ Sifit.';
  }
  for (const [pattern, translation] of translations) if (pattern.test(raw)) return translation;
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.';
  if (status === 403) return 'Bạn không có quyền truy cập nội dung này. Hãy dùng tài khoản có quyền phù hợp.';
  if (status === 429) return 'Bạn đang thao tác quá nhanh. Hãy chờ một chút rồi thử lại.';
  if (status >= 500) return 'Máy chủ đang gặp sự cố. Hãy thử lại sau ít phút.';
  if (status === 409) return 'Nội dung đã thay đổi hoặc thao tác đã được thực hiện. Hãy tải lại để kiểm tra.';
  if (status === 400 || status === 422) return 'Thông tin chưa hợp lệ. Hãy kiểm tra các mục đã nhập rồi gửi lại.';
  return generic;
}
const reported = new WeakSet();
export function showError(error) {
  if (!error || error.code === 'ERR_CANCELED' || error.name === 'AbortError') return;
  if (typeof error === 'object') { if (reported.has(error)) return; reported.add(error); }
  notifyAction({ category: 'error', title: errorLocale() === 'en' ? 'Unable to complete this action' : 'Chưa thực hiện được thao tác', message: getApiErrorMessage(error), duration: 9000 });
}

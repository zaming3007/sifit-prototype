export const reportReasons = {
  COUNTERFEIT: 'Nghi ngờ hàng giả / nhái', MISLEADING: 'Thông tin hoặc hình ảnh sai lệch',
  PROHIBITED: 'Hàng hóa bị cấm', INAPPROPRIATE: 'Nội dung không phù hợp', SPAM: 'Tin đăng rác / lừa đảo', OTHER: 'Lý do khác',
};
export const reportStatus = report => report.status === 'OPEN' ? 'Chờ kiểm tra' : report.decision === 'HIDE' ? 'Đã xử lý · Ẩn sản phẩm' : 'Đã xử lý · Giữ hiện trạng';

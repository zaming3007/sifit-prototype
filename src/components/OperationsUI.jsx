import { useEffect, useRef } from 'react';
import { money, idOf } from '../utils/marketplace';
import { date, statusLabels, shortId } from '../utils/operationFormatting';

export function Status({ value }) { return <span className={`ops-status ops-status-${String(value).toLowerCase()}`}>{statusLabels[value] || value || '—'}</span>; }
export function Pager({ resource }) {
  const pages = Math.max(resource.pagination.pages || 1, 1);
  return <nav className="ops-pager" aria-label="Phân trang"><span>{resource.pagination.total ?? 0} kết quả · Trang {resource.page}/{pages}</span><div><button disabled={resource.busy || resource.page <= 1} onClick={() => resource.setPage(resource.page - 1)}>Trang trước</button><button disabled={resource.busy || resource.page >= pages} onClick={() => resource.setPage(resource.page + 1)}>Trang sau</button></div></nav>;
}
export function ResourceFeedback({ resource }) { return <>{resource.busy && <p role="status">Đang tải dữ liệu…</p>}{resource.error && <p role="alert" className="ops-error">{resource.error}</p>}{!resource.busy && !resource.error && !resource.items.length && <p className="ops-empty">Chưa có dữ liệu phù hợp.</p>}</>; }
export function Dialog({ title, onClose, children, busy = false }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="ops-dialog" aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><div className="ops-dialog-heading"><h2>{title}</h2><button aria-label="Đóng cửa sổ" disabled={busy} onClick={onClose}>×</button></div>{children}</dialog>;
}
export function Facts({ entries }) { return <dl className="ops-facts">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>; }
export function PayoutDetails({ payout, openResource }) { return <><Facts entries={[
  ['Mã chi trả', idOf(payout)], ['Số tiền', money(payout.amount)], ['Trạng thái', <Status key="status" value={payout.status} />],
  ['Nhà cung cấp', payout.provider], ['Mã giao dịch', payout.providerPayoutId], ['Ngày tạo', date(payout.createdAt)], ['Ngày duyệt', date(payout.approvedAt)],
  ['Ngày xử lý', date(payout.processedAt)], ['Ngày hoàn tất', date(payout.completedAt)], ['Lý do thất bại', payout.failureReason],
  ['Ngân hàng nhận', payout.bankSnapshot?.bankName], ['Số tài khoản nhận', payout.bankSnapshot?.accountNumber], ['Chủ tài khoản', payout.bankSnapshot?.accountName], ['Mã chuyển khoản', payout.transferReference], ['Ghi chú đối chiếu', payout.transferNote],
]} /><p>Đơn hàng trong đợt chi trả:</p><div className="ops-actions">{(payout.orderIds || []).map(order => <button key={idOf(order)} onClick={() => openResource('ORDER', idOf(order))}>{shortId(order)}</button>)}</div>{payout.provider === 'simulator' && <p className="ops-note">Chi trả đang ở chế độ mô phỏng.</p>}</>; }

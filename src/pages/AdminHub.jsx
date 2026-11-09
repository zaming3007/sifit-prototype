import { useCallback, useEffect, useState } from 'react';
import LocalizedContent from '../components/LocalizedContent';
import { Panel, Feedback } from '../components/MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { money, idOf } from '../utils/marketplace';

import * as adminService from '../services/adminService';
import { collectPages } from '../services/pagination';
import { useApp } from '../context/AppContext';
import AdminFinance from './AdminFinance';
import AdminManagement, { AdminCategories } from './AdminManagement';
import AdminReports, { AuditLogs } from './AdminReports';
import AdminProductReports from './AdminProductReports';
import ShipmentOperations from './ShipmentOperations';
import * as operations from '../services/operationsService';
import { adminSections } from '../constants/adminNavigation';
import Icon from '../components/Icon';
import { getApiErrorMessage } from '../utils/errorHandler';
import AdminSellerVerifications from '../components/AdminSellerVerifications';

const extendedTabs = [['verifications', 'Xác minh shop'], ['product-reports', 'Báo cáo sản phẩm'], ['sellers', 'Cửa hàng'], ['categories', 'Danh mục'], ['reviews', 'Đánh giá'], ['shipments', 'Vận chuyển'], ['finance', 'Tài chính'], ['analytics', 'Báo cáo & CSV'], ['audit', 'Nhật ký']];

export default function AdminHub({ tab, setTab, onBusyChange }) {
  const { fetchListings, openResource } = useApp();
  const [stats, setStats] = useState(null);
  const [listResult, setListResult] = useState({ tab: null, items: [] });
  // A new tab renders before its loading effect runs. Never render another
  // tab's records here (for example users have no product images).
  const items = listResult.tab === tab ? listResult.items : [];
  const [notes, setNotes] = useState({});
  const [refundContext, setRefundContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const { busy, error, run, setError } = useAction();
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  const reload = useCallback(async (isCurrent = () => true) => {
    if (extendedTabs.some(([key]) => key === tab)) return;
    if (tab === 'overview') { const result = await adminService.dashboardOverview(); if (isCurrent()) setStats(result); return; }
    const loaders = { users: adminService.listUsers, products: adminService.listProducts, orders: adminService.listOrders,
      reports: adminService.listMessageReports, verifications: adminService.listVerifications, disputes: adminService.listDisputes };
    const result = await collectPages(loaders[tab]);
    if (isCurrent()) setListResult({ tab, items: result.items });
  }, [tab]);
  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    reload(() => current).catch(cause => { if (current) setError(getApiErrorMessage(cause)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [reload, setError]);
  const act = action => run(async () => { await action(); await reload(); if (tab === 'products') await fetchListings(); });
  const note = item => <input className="input-field max-w-md" placeholder="Lý do / ghi chú xử lý" maxLength="1000" value={notes[idOf(item)] || ''} onChange={event => setNotes({ ...notes, [idOf(item)]: event.target.value })} />;
  return <LocalizedContent><div className="admin-content" data-section={tab}>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">SIFIT / TRUNG TÂM QUẢN TRỊ</p><h1>{tab === 'overview' ? 'Tổng quan quản trị' : adminSections.find(([key]) => key === tab)?.[1]}</h1><p>{adminSections.find(([key]) => key === tab)?.[3]}</p></div>{!extendedTabs.some(([key]) => key === tab) && <button className="admin-refresh" disabled={busy} onClick={() => run(reload)}><Icon name="refresh" />Làm mới</button>}</div>
    {tab === 'finance' && <AdminFinance refundContext={refundContext} clearRefundContext={() => setRefundContext(null)} />}
    {tab === 'verifications' && <AdminSellerVerifications />}
    {['sellers', 'reviews'].includes(tab) && <AdminManagement key={tab} section={tab} />}
    {tab === 'categories' && <AdminCategories />}
    {tab === 'shipments' && <ShipmentOperations admin />}
    {tab === 'analytics' && <AdminReports />}
    {tab === 'audit' && <AuditLogs />}
    {tab === 'product-reports' && <AdminProductReports onBusyChange={onBusyChange} />}
    <Feedback error={error} busy={busy || loading} />
    {tab === 'overview' && stats && <section className="admin-dashboard-section"><div className="admin-section-heading"><h2>Số liệu từ hệ thống</h2><span>Dữ liệu từ hệ thống</span></div><dl className="admin-metrics">{[['Người dùng', 'totalUsers'], ['Người bán', 'totalSellers'], ['Sản phẩm', 'totalProducts'], ['Chờ duyệt', 'pendingProducts'], ['Đơn hàng', 'totalOrders'], ['Hoàn thành', 'completedOrders'], ['GMV', 'grossMerchandiseValue', true], ['Hoa hồng đã ghi nhận', 'platformCommissionEarned', true], ['Hoa hồng chờ ghi nhận', 'platformCommissionPending', true], ['Chi trả chờ xử lý', 'pendingPayoutAmount', true], ['Đã chi trả', 'completedPayoutAmount', true], ['Khiếu nại đang mở', 'activeDisputes']].map(([label, key, currency]) => <div className={`admin-metric ${key === 'grossMerchandiseValue' ? 'is-featured' : ''}`} key={key}><div><dt>{label}</dt><span className="admin-metric-icon"><Icon name={{ totalUsers: 'person', totalSellers: 'storefront', totalProducts: 'inventory_2', pendingProducts: 'schedule', totalOrders: 'receipt_long', completedOrders: 'task_alt', grossMerchandiseValue: 'payments', platformCommissionEarned: 'account_balance_wallet', platformCommissionPending: 'schedule', pendingPayoutAmount: 'history', completedPayoutAmount: 'task_alt', activeDisputes: 'forum' }[key]} /></span></div><dd>{currency ? money(stats[key]) : stats[key]}</dd><p>{currency ? 'Theo số liệu tài chính' : 'Toàn hệ thống'}</p></div>)}</dl></section>}
    {tab !== 'overview' && !extendedTabs.some(([key]) => key === tab) && !busy && !loading && !items.length && !error && <p>Chưa có dữ liệu.</p>}
    {tab === 'disputes' && items.filter(item => item.status === 'RESOLVED_BUYER' && !item.refundSettledAt && (!item.returnFlow?.required || item.returnFlow.status === 'VERIFIED')).map(item => <Panel key={`refund-${idOf(item)}`} title={`Tiếp tục xử lý đơn ${idOf(item.orderId)}`}><p>Kết quả khiếu nại chưa tự động hoàn tiền. Kiểm tra giao dịch và số tiền cần hoàn.</p><button disabled={busy} onClick={() => run(async () => { const { order } = await operations.get(`/admin/orders/${idOf(item.orderId)}`); setRefundContext({ checkoutGroupId: idOf(order.checkoutGroupId), orderId: idOf(order), amount: order.buyerTotal, disputeId: idOf(item) }); setTab('finance'); })}>Xử lý hoàn tiền cho đơn này</button></Panel>)}
    {tab === 'users' && items.map(item => <Panel key={item._id} title={`${item.name} · ${item.email}`}><p>{item.role} · {item.status}</p><button onClick={() => openResource('USER', item._id)}>Chi tiết tài khoản</button>{note(item)}<button disabled={busy} onClick={() => act(() => adminService.updateUserStatus(item._id, { status: item.blocked ? 'ACTIVE' : 'SUSPENDED', reason: notes[item._id] || '' }))}>{item.blocked ? 'Mở khóa' : 'Khóa tài khoản'}</button></Panel>)}
    {tab === 'products' && items.map(item => <Panel key={item._id} title={item.title}><p>{money(item.price)} · {item.status} · Người bán: {item.seller?.name}</p><p>{item.description}</p><div className="flex gap-2 flex-wrap">{item.images.map(image => <a key={image} href={image} target="_blank" rel="noreferrer"><img src={image} alt="" className="w-24 h-24 rounded-xl object-cover" /></a>)}</div>{note(item)}<div className="flex gap-3">{item.status === 'pending' && <><button disabled={busy} onClick={() => act(() => adminService.moderateProduct(item._id, 'approve'))}>Duyệt</button><button disabled={busy} onClick={() => act(() => adminService.moderateProduct(item._id, 'reject', notes[item._id] || ''))}>Từ chối</button></>}{item.status === 'active' && <button disabled={busy} onClick={() => act(() => adminService.moderateProduct(item._id, 'hide', notes[item._id] || ''))}>Ẩn sản phẩm</button>}</div></Panel>)}
    {tab === 'orders' && items.map(item => <Panel key={item._id} title={`Đơn ${item._id}`}><p>{item.buyer?.name} → {item.seller?.name}</p><p>{item.orderStatus} · {item.paymentStatus} · {money(item.totalAmount)}</p>{item.items.map(product => <p key={idOf(product.productId)}>{product.title} · {money(product.price)}</p>)}<p>Hoa hồng: {money(item.commissionAmount)} · Tiền người bán: {money(item.sellerProceeds)}</p><button onClick={() => openResource('ORDER', idOf(item))}>Xem &amp; hoàn tất đơn</button></Panel>)}
    {tab === 'reports' && items.map(item => <Panel key={idOf(item)} title={`Báo cáo tin nhắn · ${item.status}`}><p>Người báo cáo: {item.reporterId?.fullName}</p><p>Người bị báo cáo: {item.reportedUserId?.fullName}</p><blockquote>{item.messageId?.content}</blockquote><p>{item.reason}</p>{item.status === 'OPEN' ? <>{note(item)}<button disabled={busy} onClick={() => act(() => adminService.resolveMessageReport(idOf(item), notes[idOf(item)] || ''))}>Đánh dấu đã xử lý</button></> : <p>{item.resolutionNote}</p>}</Panel>)}
    {tab === 'disputes' && items.map(item => <Panel key={idOf(item)} title={`Khiếu nại đơn ${idOf(item.orderId)} · ${item.status}`}><p>{item.reason}</p><p>{item.description}</p><p>{item.evidenceCount || 0} ảnh bằng chứng · {item.messageCount || 0} phản hồi</p><button onClick={() => openResource('DISPUTE', idOf(item))}>Chi tiết, bằng chứng và trả hàng</button>{['OPEN', 'UNDER_REVIEW'].includes(item.status) ? <><p>Nút chấp nhận bên mua tại đây áp dụng hoàn tiền không yêu cầu trả hàng. Mở chi tiết để kiểm tra bằng chứng và chọn quy trình trả hàng.</p>{note(item)}<div className="flex gap-3 flex-wrap">{item.status === 'OPEN' && <button disabled={busy} onClick={() => act(() => adminService.reviewDispute(idOf(item), notes[idOf(item)]))}>Tiếp nhận xem xét</button>}{[['RESOLVED_BUYER', 'Chấp nhận bên mua'], ['RESOLVED_SELLER', 'Chấp nhận bên bán'], ['CLOSED', 'Đóng khiếu nại']].map(([status, label]) => <button key={status} disabled={busy} onClick={() => act(() => adminService.resolveDispute(idOf(item), status, notes[idOf(item)] || '', item.contentVersion || 0))}>{label}</button>)}</div></> : <p>{item.resolution}</p>}</Panel>)}
  </div></LocalizedContent>;
}

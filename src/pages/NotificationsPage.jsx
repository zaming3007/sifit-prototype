import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import * as notificationService from '../services/notificationService';
import { collectPages } from '../services/pagination';
import LocalizedContent from '../components/LocalizedContent';
import ProductCard from '../components/ProductCard';
import { Panel, Feedback } from '../components/MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { idOf } from '../utils/marketplace';
import BuyerHeading from '../components/BuyerHeading';
import Icon from '../components/Icon';


export function WishlistPage() {
  const { wishlist, toggleWishlist } = useApp();
  return <LocalizedContent><div className="max-w-6xl mx-auto px-4 py-8 space-y-4"><h1 className="font-heading font-bold text-3xl">Sản phẩm yêu thích</h1>{!wishlist.length && <p>Chưa có sản phẩm yêu thích.</p>}<div className="product-grid">{wishlist.map(item => item.availability === 'AVAILABLE' ? <ProductCard key={item.productId} product={item.product} /> : <div key={item.productId} className="p-4 bg-white border rounded-xl"><p>{item.title || 'Sản phẩm không còn khả dụng'}</p><p>{item.availability}</p><button onClick={() => toggleWishlist(item.product)}>Bỏ yêu thích</button></div>)}</div></div></LocalizedContent>;
}
export default function NotificationsPage() {
  const { user, openResource, setCurrentView } = useApp();
  const [items, setItems] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [count, setCount] = useState(0);
  const { busy, error, run } = useAction();
  const reload = useCallback(async () => {
    const [result, prefs, unread] = await Promise.all([collectPages(notificationService.listNotifications), notificationService.preferences(), notificationService.unreadCount()]);
    setItems(result.items); setPreferences(prefs); setCount(unread);
  }, []);
  useEffect(() => {
    run(reload);
    const refresh = () => run(reload);
    window.addEventListener('sifit:notifications', refresh);
    return () => window.removeEventListener('sifit:notifications', refresh);
  }, [run, reload]);
  return <LocalizedContent><div className="member-page member-notifications"><BuyerHeading title={`Thông báo (${count} chưa đọc)`} description="Cập nhật mới nhất về đơn hàng và hoạt động của bạn."><button className="member-secondary" disabled={busy} onClick={() => run(reload)}><Icon name="refresh" />Làm mới</button><button className="member-primary" disabled={busy} onClick={() => run(async () => { await notificationService.markAllRead(); await reload(); })}><Icon name="task_alt" />Đọc tất cả</button></BuyerHeading><Feedback busy={busy} error={error} />
    <div className="member-notification-layout"><div className="member-notification-list">
    {items.map(item => <section key={idOf(item)} className={`member-notification ${item.isRead ? '' : 'is-unread'}`}><span className="member-feature-icon"><Icon name={item.resourceType === 'CONVERSATION' ? 'chat_bubble_outline' : 'notifications_none'} /></span><div className="member-notification-body"><div className="member-notification-title"><h2>{item.title}</h2>{!item.isRead && <span className="member-badge">Chưa đọc</span>}</div><p>{item.body}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</time><div className="member-notification-actions">{item.resourceType && item.resourceId && <button disabled={busy} onClick={() => run(async () => { if (!item.isRead) await notificationService.markRead(idOf(item)); if (['PRODUCT_REPORT_RESOLVED', 'REPORTING_POLICY'].includes(item.type)) setCurrentView('report-history'); else openResource(item.resourceType, idOf(item.resourceId)); })}>Xem chi tiết <Icon name="arrow_forward" /></button>}{!item.isRead && <button disabled={busy} onClick={() => run(async () => { await notificationService.markRead(idOf(item)); await reload(); })}>Đánh dấu đã đọc</button>}<button disabled={busy} onClick={() => run(async () => { await notificationService.archive(idOf(item)); await reload(); })}>Ẩn thông báo</button></div></div></section>)}
    {!items.length && !busy && <div className="member-empty"><Icon name="notifications_none" /><p>Chưa có thông báo.</p></div>}
    </div><aside className="member-preferences">{preferences && <Panel title="Tùy chọn thông báo"><p className="member-muted">Chọn những cập nhật bạn muốn nhận.</p>{[['inAppEnabled', 'Thông báo trong ứng dụng'], ['messageNotifications', 'Tin nhắn'], ['orderNotifications', 'Đơn hàng'], ['productNotifications', 'Sản phẩm'], ...(user?.role === 'buyer' ? [['followedShopNotifications', 'Sản phẩm mới từ shop đã theo dõi']] : []), ['shippingNotifications', 'Giao hàng'], ['reviewNotifications', 'Đánh giá'], ['payoutNotifications', 'Chi trả']].map(([key, label]) => <label key={key} className="member-preference"><span>{label}</span><input disabled={busy} type="checkbox" checked={preferences[key]} onChange={event => {
      const previous = preferences;
      const checked = event.target.checked;
      setPreferences({ ...preferences, [key]: checked });
      run(async () => {
        try { setPreferences(await notificationService.updatePreferences({ [key]: checked })); }
        catch (error) { setPreferences(previous); throw error; }
      });
    }} /></label>)}</Panel>}</aside></div>
  </div></LocalizedContent>;
}

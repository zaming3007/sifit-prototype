import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import logo from '../image/logo-favicon/sifit-mark.png';
import UserAvatar from './UserAvatar';

const sellerSections = [
  ['overview', 'Tổng quan', 'dashboard'],
  ['listings', 'Sản phẩm', 'inventory_2'],
  ['add', 'Đăng sản phẩm', 'add_box'],
  ['orders', 'Đơn bán', 'receipt_long'],
  ['offers', 'Đề nghị giá', 'chat_bubble_outline'],
  ['shipments', 'Vận chuyển', 'local_shipping'],
  ['disputes', 'Khiếu nại', 'verified_user'],
  ['reviews', 'Đánh giá', 'star'],
  ['payouts', 'Chi trả', 'account_balance_wallet'],
  ['profile', 'Hồ sơ shop', 'storefront'],
  ['addresses', 'Địa chỉ lấy hàng', 'location_on'],
];

export default function SellerWorkspace({ activeTab, onSelectTab, children }) {
  const { currentView, setCurrentView, user, logoutUser, orders } = useApp();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sifit-seller-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('sifit-seller-sidebar-collapsed', String(collapsed)); } catch { /* Preferences are optional. */ }
  }, [collapsed]);
  const select = tab => { onSelectTab(tab); setCurrentView('seller'); };
  const shared = [['chat', 'Chat', 'chat_bubble_outline'], ['notifications', 'Thông báo', 'notifications_none'], ['account', 'Tài khoản', 'settings'], ['report-history', 'Báo cáo của tôi', 'flag']];
  if (orders.length) shared.push(['history', 'Đơn mua trước đây', 'history']);
  const currentTitle = currentView === 'seller' ? sellerSections.find(([id]) => id === activeTab)?.[1] : shared.find(([id]) => id === currentView)?.[1] || 'Xem trước';
  return <div className={`seller-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside id="seller-sidebar" className="seller-sidebar" aria-label="Thanh bên người bán">
      <button className="seller-brand" aria-label="Kênh bán" onClick={() => select('overview')} title={collapsed ? 'Kênh bán' : undefined}>
        {collapsed ? <span className="seller-brand-mark"><Icon name="checkroom" /></span> : <><img src={logo} alt="Sifit" /><span>SELLER STUDIO</span></>}
      </button>
      <div className="seller-sidebar-scroll">
        <p className="seller-nav-caption">QUẢN LÝ CỬA HÀNG</p>
        <nav className="seller-navigation" aria-label="Quản lý cửa hàng">{sellerSections.map(([id, label, icon]) => <button key={id} aria-label={label} title={collapsed ? label : undefined} aria-current={currentView === 'seller' && activeTab === id ? 'page' : undefined} onClick={() => select(id)}><Icon name={icon} /><span className="seller-nav-label">{label}</span>{currentView === 'seller' && activeTab === id && <span className="seller-active-dot" />}</button>)}</nav>
        <p className="seller-nav-caption seller-nav-divider">KẾT NỐI & TÀI KHOẢN</p>
        <nav className="seller-navigation" aria-label="Tiện ích người bán">{shared.map(([view, label, icon]) => <button key={view} aria-label={label} title={collapsed ? label : undefined} aria-current={currentView === view ? 'page' : undefined} onClick={() => setCurrentView(view)}><Icon name={icon} /><span className="seller-nav-label">{label}</span></button>)}</nav>
      </div>
      <div className="seller-sidebar-bottom">
        <div className="seller-sidebar-shop"><UserAvatar user={user} className="seller-shop-avatar" /><div><strong>{user.name}</strong><span>Không gian người bán</span></div></div>
        <button className="seller-collapse-button" aria-controls="seller-sidebar" aria-expanded={!collapsed} aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'} title={collapsed ? 'Mở rộng thanh bên' : undefined} onClick={() => setCollapsed(value => !value)}><Icon name={collapsed ? 'panel_expand' : 'panel_collapse'} /><span className="seller-nav-label">Thu gọn thanh bên</span></button>
        <button className="seller-signout" aria-label="Đăng xuất" title={collapsed ? 'Đăng xuất' : undefined} onClick={logoutUser}><Icon name="logout" /><span className="seller-nav-label">Đăng xuất</span></button>
      </div>
    </aside>
    <div className="seller-workspace">
      <header className="seller-topbar">
        <div className="seller-breadcrumb"><span>Không gian làm việc</span><Icon name="chevron_right" /><strong>{currentTitle}</strong></div>
        <div className="seller-topbar-actions"><span className="seller-role-label"><span /> Người bán</span><button className="seller-notification-button" aria-label="Mở thông báo" title="Thông báo" onClick={() => setCurrentView('notifications')}><Icon name="notifications_none" /></button><button className="account-button seller-topbar-account" aria-label="Mở tài khoản" onClick={() => setCurrentView('account')}><UserAvatar user={user} className="seller-topbar-avatar" /><span>{user.name}</span><Icon name="expand_more" /></button></div>
      </header>
      <div className="seller-workspace-content">{children}</div>
    </div>
  </div>;
}

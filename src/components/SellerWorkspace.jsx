import NotificationBell from './NotificationBell';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import logo from '../assets/sifit-mark-hGVLPtRq.png';
import WorkspaceAccountMenu, { personalInformation } from './WorkspaceAccountMenu';

const compactSidebar = '(max-width: 760px)';
const pickupAddress = 'Địa chỉ lấy hàng';

const sellerSections = [
  ['overview', 'Tổng quan', 'dashboard'],
  ['listings', 'Sản phẩm', 'inventory_2'],
  ['add', 'Đăng sản phẩm', 'add_box'],
  ['orders', 'Đơn bán', 'receipt_long'],
  ['offers', 'Đề nghị giá', 'chat_bubble_outline'],
  ['shipments', 'Vận chuyển', 'local_shipping'],
  ['reviews', 'Đánh giá', 'star'],
  ['payouts', 'Chi trả', 'account_balance_wallet'],
  ['profile', 'Hồ sơ shop', 'storefront'],
];

export default function SellerWorkspace({ activeTab, onSelectTab, children }) {
  const { currentView, setCurrentView, orders } = useApp();
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try { return localStorage.getItem('sifit-seller-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [isCompact, setIsCompact] = useState(() => window.matchMedia(compactSidebar).matches);
  const [compactCollapsed, setCompactCollapsed] = useState(true);
  const collapsed = isCompact ? compactCollapsed : desktopCollapsed;
  const toggleSidebar = isCompact ? setCompactCollapsed : setDesktopCollapsed;

  useEffect(() => {
    try { localStorage.setItem('sifit-seller-sidebar-collapsed', String(desktopCollapsed)); } catch { /* Preferences are optional. */ }
  }, [desktopCollapsed]);

  useEffect(() => {
    const media = window.matchMedia(compactSidebar);
    const update = event => { setIsCompact(event.matches); setCompactCollapsed(true); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const navigate = view => {
    if (isCompact) setCompactCollapsed(true);
    setCurrentView(view);
  };
  const select = tab => { onSelectTab(tab); navigate('seller'); };
  const shared = [['chat', 'Chat', 'chat_bubble_outline'], ['notifications', 'Thông báo', 'notifications_none']];
  if (orders.length) shared.push(['history', 'Đơn mua trước đây', 'history']);
  const accountView = ['account', 'account-profile'].includes(currentView);
  const pickupAddressView = currentView === 'seller' && activeTab === 'addresses';
  const navigationTitle = currentView === 'seller'
    ? sellerSections.find(([id]) => id === activeTab)?.[1] ?? (pickupAddressView ? pickupAddress : undefined)
    : shared.find(([id]) => id === currentView)?.[1] ?? (currentView === 'report-history' ? 'Báo cáo sản phẩm' : undefined);
  const currentTitle = accountView ? personalInformation : navigationTitle || 'Xem trước';
  return <div className={`seller-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside id="seller-sidebar" className="seller-sidebar" aria-label="Thanh bên người bán">
      <div className="seller-sidebar-header">
        <button
          type="button"
          className="seller-collapse-button"
          aria-controls="seller-sidebar"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          onClick={() => toggleSidebar(value => !value)}
        >
          <Icon name={collapsed ? 'panel_expand' : 'panel_collapse'} />
        </button>
        <button className="seller-brand" aria-label="Kênh bán" onClick={() => select('overview')} title={collapsed ? 'Kênh bán' : undefined}>
          {collapsed ? <span className="seller-brand-mark"><Icon name="checkroom" /></span> : <><img src={logo} alt="Sifit" /><span>SELLER STUDIO</span></>}
        </button>
      </div>
      <div className="seller-sidebar-scroll">
        <p className="seller-nav-caption">QUẢN LÝ CỬA HÀNG</p>
        <nav className="seller-navigation" aria-label="Quản lý cửa hàng">{sellerSections.map(([id, label, icon]) => <button key={id} aria-label={label} title={collapsed ? label : undefined} aria-current={currentView === 'seller' && activeTab === id ? 'page' : undefined} onClick={() => select(id)}><Icon name={icon} /><span className="seller-nav-label">{label}</span>{currentView === 'seller' && activeTab === id && <span className="seller-active-dot" />}</button>)}</nav>
        <p className="seller-nav-caption seller-nav-divider">KẾT NỐI & TÀI KHOẢN</p>
        <nav className="seller-navigation" aria-label="Tiện ích người bán">{shared.map(([view, label, icon]) => <button key={view} aria-label={label} title={collapsed ? label : undefined} aria-current={currentView === view ? 'page' : undefined} onClick={() => navigate(view)}><Icon name={icon} /><span className="seller-nav-label">{label}</span></button>)}</nav>
      </div>
    </aside>
    <div className="seller-workspace">
      <header className="seller-topbar">
        <div className="seller-breadcrumb"><span>Không gian làm việc</span><Icon name="chevron_right" /><strong>{currentTitle}</strong></div>
        <div className="seller-topbar-actions">
          <span className="seller-role-label"><span /> Người bán</span>
          <NotificationBell className="seller-notification-button" onOpen={() => { if (isCompact) setCompactCollapsed(true); }} />
          <WorkspaceAccountMenu
            onProfile={() => navigate('account')}
            onOpen={() => { if (isCompact) setCompactCollapsed(true); }}
            extraAction={{ label: pickupAddress, icon: 'location_on', active: pickupAddressView, onSelect: () => select('addresses') }}
          />
        </div>
      </header>
      <div className="seller-workspace-content">{children}</div>
    </div>
  </div>;
}

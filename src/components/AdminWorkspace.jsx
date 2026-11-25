import NotificationBell from './NotificationBell';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { adminGroups, adminSections } from '../constants/adminNavigation';
import Icon from './Icon';
import logo from '../assets/sifit-mark-hGVLPtRq.png';
import WorkspaceAccountMenu, { personalInformation } from './WorkspaceAccountMenu';
import '../admin.css';

export default function AdminWorkspace({ activeTab, onSelectTab, busy, children }) {
  const { currentView, setCurrentView } = useApp();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('sifit-admin-collapsed') === 'true'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuTrigger = useRef(null);
  const closeDrawer = () => { setMobileOpen(false); menuTrigger.current?.focus(); };
  const title = currentView === 'admin' ? adminSections.find(([key]) => key === activeTab)?.[1] : { chat: 'Chat', notifications: 'Thông báo', account: personalInformation, 'account-profile': personalInformation, resource: 'Chi tiết tài nguyên', history: 'Đơn mua trước đây', detail: 'Chi tiết sản phẩm', shop: 'Chi tiết cửa hàng' }[currentView] || 'Quản trị';
  useEffect(() => { try { localStorage.setItem('sifit-admin-collapsed', String(collapsed)); } catch { /* Local preference only. */ } }, [collapsed]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = event => { if (event.key === 'Escape') { setMobileOpen(false); menuTrigger.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);
  const select = key => { onSelectTab(key); setCurrentView('admin'); setMobileOpen(false); };
  const shared = view => { setCurrentView(view); setMobileOpen(false); };
  return <div className={`admin-shell ${collapsed ? 'admin-collapsed' : ''} ${mobileOpen ? 'admin-mobile-open' : ''}`}>
    {mobileOpen && <button className="admin-backdrop" aria-label="Đóng menu quản trị" onClick={() => setMobileOpen(false)} />}
    <aside id="admin-sidebar" className="admin-sidebar" aria-label="Thanh bên quản trị">
      <div className="admin-sidebar-header">
        <button
          type="button"
          className="admin-collapse"
          aria-label={collapsed ? 'Mở rộng menu quản trị' : 'Thu gọn menu quản trị'}
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          aria-expanded={!collapsed}
          aria-controls="admin-sidebar"
          onClick={() => setCollapsed(value => !value)}
        >
          <Icon name={collapsed ? 'panel_expand' : 'panel_collapse'} />
        </button>
        <button type="button" className="admin-drawer-close" aria-label="Thu gọn menu quản trị trên điện thoại" onClick={closeDrawer}><Icon name="panel_collapse" /></button>
        <button className="admin-brand" aria-label="Trang chủ quản trị" onClick={() => select('overview')}><img src={logo} alt="Sifit" /><span className="admin-brand-label">ADMIN WORKSPACE</span><span className="admin-brand-mark"><Icon name="shield" /></span></button>
      </div>
      <div className="admin-sidebar-scroll"><nav aria-label="Quản lý hệ thống">{adminGroups.map(group => <div className="admin-nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([key, label, icon]) => <button key={key} aria-label={label} title={collapsed ? label : undefined} aria-current={currentView === 'admin' && activeTab === key ? 'page' : undefined} disabled={busy && currentView === 'admin'} onClick={() => select(key)}><Icon name={icon} /><span>{label}</span>{currentView === 'admin' && activeTab === key && <i />}</button>)}</div>)}</nav>
        <nav aria-label="Tiện ích quản trị" className="admin-nav-group"><p>KHÔNG GIAN LÀM VIỆC</p>{[['chat', 'Chat', 'chat_bubble_outline'], ['notifications', 'Thông báo', 'notifications_none']].map(([view, label, icon]) => <button key={view} aria-label={label} title={collapsed ? label : undefined} aria-current={currentView === view ? 'page' : undefined} onClick={() => shared(view)}><Icon name={icon} /><span>{label}</span></button>)}</nav>
      </div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div className="admin-breadcrumb">
          <button type="button" ref={menuTrigger} className="admin-menu-trigger" aria-label="Mở menu quản trị" aria-expanded={mobileOpen} aria-controls="admin-sidebar" onClick={() => setMobileOpen(value => !value)}><Icon name="menu" /></button>
          <span>Không gian quản trị</span><Icon name="chevron_right" /><strong>{title}</strong>
        </div>
        <div className="admin-topbar-actions">
          <span className="admin-role"><i />Quản trị viên</span>
          <NotificationBell className="admin-notification" onOpen={() => setMobileOpen(false)} />
          <WorkspaceAccountMenu onProfile={() => shared('account')} onOpen={() => setMobileOpen(false)} />
        </div>
      </header>
      <div className="admin-workspace-body">{children}</div>
    </div>
  </div>;
}

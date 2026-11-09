import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { adminGroups, adminSections } from '../constants/adminNavigation';
import Icon from './Icon';
import logo from '../image/logo-favicon/sifit-mark.png';
import UserAvatar from './UserAvatar';
import '../admin.css';

export default function AdminWorkspace({ activeTab, onSelectTab, busy, children }) {
  const { currentView, setCurrentView, user, logoutUser } = useApp();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('sifit-admin-collapsed') === 'true'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuTrigger = useRef(null);
  const title = currentView === 'admin' ? adminSections.find(([key]) => key === activeTab)?.[1] : { chat: 'Chat', notifications: 'Thông báo', account: 'Tài khoản', resource: 'Chi tiết tài nguyên', history: 'Đơn mua trước đây', detail: 'Chi tiết sản phẩm', shop: 'Chi tiết cửa hàng' }[currentView] || 'Quản trị';
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
      <button className="admin-brand" aria-label="Trang chủ quản trị" onClick={() => select('overview')}><img src={logo} alt="Sifit" /><span>ADMIN WORKSPACE</span></button>
      <div className="admin-sidebar-scroll"><nav aria-label="Quản lý hệ thống">{adminGroups.map(group => <div className="admin-nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([key, label, icon]) => <button key={key} aria-label={label} title={collapsed ? label : undefined} aria-current={currentView === 'admin' && activeTab === key ? 'page' : undefined} disabled={busy && currentView === 'admin'} onClick={() => select(key)}><Icon name={icon} /><span>{label}</span>{currentView === 'admin' && activeTab === key && <i />}</button>)}</div>)}</nav>
        <nav aria-label="Tiện ích quản trị" className="admin-nav-group"><p>KHÔNG GIAN LÀM VIỆC</p>{[['chat', 'Chat', 'chat_bubble_outline'], ['notifications', 'Thông báo', 'notifications_none'], ['account', 'Tài khoản', 'settings']].map(([view, label, icon]) => <button key={view} aria-label={label} title={collapsed ? label : undefined} aria-current={currentView === view ? 'page' : undefined} onClick={() => shared(view)}><Icon name={icon} /><span>{label}</span></button>)}</nav>
      </div>
      <div className="admin-sidebar-footer"><div className="admin-user"><UserAvatar user={user} className="admin-avatar" /><div><strong>{user.name}</strong><small>Quản trị viên</small></div></div><button className="admin-collapse" aria-label={collapsed ? 'Mở rộng menu quản trị' : 'Thu gọn menu quản trị'} aria-expanded={!collapsed} aria-controls="admin-sidebar" onClick={() => setCollapsed(value => !value)}><Icon name={collapsed ? 'panel_expand' : 'panel_collapse'} /><span>{collapsed ? 'Mở rộng' : 'Thu gọn thanh bên'}</span></button><button className="admin-logout" aria-label="Đăng xuất" title="Đăng xuất" onClick={logoutUser}><Icon name="logout" /><span>Đăng xuất</span></button></div>
    </aside>
    <div className="admin-workspace"><header className="admin-topbar"><div className="admin-breadcrumb"><button ref={menuTrigger} className="admin-menu-trigger" aria-label="Mở menu quản trị" aria-expanded={mobileOpen} aria-controls="admin-sidebar" onClick={() => setMobileOpen(value => !value)}><Icon name="menu" /></button><span>Không gian quản trị</span><Icon name="chevron_right" /><strong>{title}</strong></div><div className="admin-topbar-actions"><span className="admin-role"><i />Quản trị viên</span><button className="admin-notification" aria-label="Mở thông báo" onClick={() => shared('notifications')}><Icon name="notifications_none" /></button><button className="account-button admin-account" aria-label="Tài khoản ADMIN" onClick={() => shared('account')}><UserAvatar user={user} className="admin-avatar" /><span>{user.name}</span><Icon name="expand_more" /></button></div></header><div className="admin-workspace-body">{children}</div></div>
  </div>;
}

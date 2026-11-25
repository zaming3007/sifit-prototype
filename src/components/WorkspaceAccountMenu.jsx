import { useEffect, useId, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import UserAvatar from './UserAvatar';
import '../workspace-account.css';

export const personalInformation = 'Thông tin cá nhân';

export default function WorkspaceAccountMenu({ onProfile, extraAction, onOpen }) {
  const { user, currentView, logoutUser } = useApp();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();
  const active = currentView === 'account' || currentView === 'account-profile';

  useEffect(() => { setOpen(false); }, [currentView]);

  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = event => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const select = action => { setOpen(false); action(); };

  return <div className="workspace-account" ref={menuRef} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button
      ref={triggerRef}
      type="button"
      className="account-button workspace-account-trigger"
      aria-label="Mở tài khoản"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={() => {
        if (!open) onOpen?.();
        setOpen(!open);
      }}
    >
      <UserAvatar user={user} className="workspace-account-avatar" />
      <span className="workspace-account-name">{user.name}</span>
      <Icon name="expand_more" />
    </button>
    {open && <nav id={menuId} className="workspace-account-options" aria-label="Tùy chọn tài khoản">
      <button type="button" aria-current={active ? 'page' : undefined} onClick={() => select(onProfile)}><Icon name="person" />{personalInformation}</button>
      {extraAction && <button type="button" aria-current={extraAction.active ? 'page' : undefined} onClick={() => select(extraAction.onSelect)}><Icon name={extraAction.icon} />{extraAction.label}</button>}
      <button type="button" className="workspace-account-signout" onClick={() => select(logoutUser)}><Icon name="logout" />Đăng xuất</button>
    </nav>}
  </div>;
}

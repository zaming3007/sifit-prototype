import { useApp } from '../context/AppContext';

export default function NotificationBadge() {
  const { notificationCount } = useApp();
  return notificationCount > 0 ? <span className="notification-unread-badge" aria-label={`${notificationCount} thông báo chưa đọc`}>{notificationCount > 99 ? '99+' : notificationCount}</span> : null;
}

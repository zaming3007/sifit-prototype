import { useCallback, useEffect, useRef, useState } from 'react';
import { unreadCount } from '../services/notificationService';

export default function useNotificationCount(userId) {
  const [value, setValue] = useState({ userId: null, count: 0 });
  const revision = useRef(0);
  const refreshNotificationCount = useCallback(async () => {
    const version = ++revision.current;
    if (!userId) return;
    try {
      const count = await unreadCount();
      if (version === revision.current) setValue({ userId, count });
    } catch { /* Keep the previous count during a temporary network failure. */ }
  }, [userId]);
  useEffect(() => {
    refreshNotificationCount();
    if (!userId) return;
    const refresh = () => { if (document.visibilityState !== 'hidden') refreshNotificationCount(); };
    const update = event => {
      ++revision.current;
      setValue({ userId, count: Math.max(0, Number(event.detail?.unreadCount) || 0) });
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('sifit:notifications', refresh);
    window.addEventListener('sifit:notification-count', update);
    window.addEventListener('focus', refresh);
    const invalidate = () => { ++revision.current; };
    return () => {
      invalidate(); clearInterval(timer);
      window.removeEventListener('sifit:notifications', refresh);
      window.removeEventListener('sifit:notification-count', update);
      window.removeEventListener('focus', refresh);
    };
  }, [userId, refreshNotificationCount]);
  return { notificationCount: value.userId === userId ? value.count : 0, refreshNotificationCount };
}

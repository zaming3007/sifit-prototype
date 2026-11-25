import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useAction } from '../hooks/useAction';
import { listNotifications, markAllRead, markRead } from '../services/notificationService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { idOf } from '../utils/marketplace';
import { canOpenNotification, getNotificationIcon, openNotification } from '../utils/notifications';
import Icon from './Icon';
import NotificationBadge from './NotificationBadge';
import '../notification-bell.css';

const previewLimit = 8;
const panelWidth = 368;
const viewportGutter = 12;

function NotificationPreview({ id, close, panelRef }) {
  const { notificationCount, setCurrentView, openResource } = useApp();
  const { locale } = useLanguage();
  const text = (vi, en) => locale === 'vi' ? vi : en;
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const mounted = useRef(false);
  const { busy, error, run } = useAction();

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let controller;
    let timer;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      try {
        const result = await listNotifications({ page: 1, limit: previewLimit }, signal);
        if (signal.aborted) return;
        setItems(result.items);
        setLoadError('');
      } catch (cause) {
        if (!signal.aborted) setLoadError(getApiErrorMessage(cause));
      }
    };
    const refresh = () => { clearTimeout(timer); timer = setTimeout(load, 120); };
    load();
    window.addEventListener('sifit:notifications', refresh);
    return () => {
      controller?.abort();
      clearTimeout(timer);
      window.removeEventListener('sifit:notifications', refresh);
    };
  }, [revision]);

  const activate = item => run(async () => {
    if (!item.isRead) {
      await markRead(idOf(item));
      setItems(previous => previous?.map(entry => idOf(entry) === idOf(item) ? { ...entry, isRead: true } : entry));
    }
    if (mounted.current && canOpenNotification(item)) {
      close();
      openNotification(item, { setCurrentView, openResource });
    }
  });

  const readAll = () => run(async () => {
    await markAllRead();
    setRevision(value => value + 1);
  });

  const date = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
  return (
    <section id={id} ref={panelRef} className="notification-preview" aria-label={text('Thông báo gần đây', 'Recent notifications')}>
      <header className="notification-preview-header">
        <h2>{text('Thông báo', 'Notifications')}</h2>
        <button type="button" className="notification-preview-read" onClick={readAll} disabled={busy || notificationCount === 0}>
          {text('Đọc tất cả', 'Mark all read')}
        </button>
      </header>
      <div className="notification-preview-content">
        {error && <p className="notification-preview-state" role="alert">{error}</p>}
        {loadError && <div className="notification-preview-state" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => { setLoadError(''); setRevision(value => value + 1); }}>{text('Thử lại', 'Try again')}</button>
        </div>}
        {!items && !loadError && <p className="notification-preview-state" role="status">{text('Đang tải thông báo…', 'Loading notifications…')}</p>}
        {items?.length === 0 && !loadError && <p className="notification-preview-state">{text('Bạn chưa có thông báo nào.', 'No notifications yet.')}</p>}
        {items?.length > 0 && <ul className="notification-preview-list">
          {items.map(item => <li key={idOf(item)}>
            <button type="button" className="notification-preview-card" data-unread={!item.isRead} disabled={busy || (item.isRead && !canOpenNotification(item))} onClick={() => activate(item)}>
              <span className="notification-preview-icon"><Icon name={getNotificationIcon(item.type, item.resourceType)} /></span>
              <span className="notification-preview-text">
                <strong>{item.title}</strong>
                {item.body && <span className="notification-preview-body">{item.body}</span>}
                {item.createdAt && <time dateTime={item.createdAt}>{date.format(new Date(item.createdAt))}</time>}
              </span>
              {!item.isRead && <span className="notification-preview-dot"><span className="sr-only">{text('Chưa đọc', 'Unread')}</span></span>}
            </button>
          </li>)}
        </ul>}
      </div>
      <button type="button" className="notification-preview-all" onClick={() => { close(); setCurrentView('notifications'); }}>
        {text('Xem tất cả thông báo', 'See all notifications')} <Icon name="arrow_forward" />
      </button>
    </section>
  );
}

export default function NotificationBell({ className, label = 'Mở thông báo', onOpen }) {
  const { currentView } = useApp();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  useEffect(() => { setOpen(false); }, [currentView]);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const width = Math.min(panelWidth, viewportWidth - viewportGutter * 2);
      const right = Math.min(Math.max(rect.right, width + viewportGutter), viewportWidth - viewportGutter);
      const style = panelRef.current.style;
      style.setProperty('--preview-width', width + 'px');
      style.setProperty('--preview-offset', (rect.right - right) + 'px');
      style.setProperty('--preview-height', (window.innerHeight - rect.bottom - viewportGutter - 8) + 'px');
    };
    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
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

  return (
    <div className="notification-bell" ref={wrapperRef} onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button type="button" className={className} ref={triggerRef} aria-label={label} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => {
        if (!open) onOpen?.();
        setOpen(!open);
      }}>
        <Icon name="notifications_none" />
        <NotificationBadge />
      </button>
      {open && <NotificationPreview id={panelId} close={() => setOpen(false)} panelRef={panelRef} />}
    </div>
  );
}

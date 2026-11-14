import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import * as notificationService from '../services/notificationService';
import { collectPages } from '../services/pagination';
import LocalizedContent from '../components/LocalizedContent';
import ProductCard from '../components/ProductCard';
import { Panel, Feedback } from '../components/MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { idOf } from '../utils/marketplace';
import { ACTION_CATEGORIES, clearActionHistory, getActionHistory } from '../utils/actionNotifier';
import BuyerHeading from '../components/BuyerHeading';
import Icon from '../components/Icon';

export function WishlistPage() {
  const { wishlist, toggleWishlist, browse } = useApp();
  return (
    <LocalizedContent>
      <div className="member-page member-wishlist max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 animate-fade-in space-y-6">
        <BuyerHeading
          title={`Sản phẩm yêu thích (${wishlist.length})`}
          description="Những món đồ bạn đã lưu lại để cân nhắc và theo dõi tình trạng."
        >
          <button className="member-secondary inline-flex items-center gap-1.5" onClick={() => browse()}>
            <Icon name="search" className="text-xs" />
            Khám phá thêm
          </button>
        </BuyerHeading>

        {!wishlist.length ? (
          <div className="member-empty flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
              <Icon name="favorite_border" className="text-3xl" />
            </div>
            <h3 className="font-heading font-bold text-lg text-gray-900">Chưa có sản phẩm yêu thích nào</h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Bấm vào biểu tượng trái tim ở góc mỗi món đồ trong trang mua sắm để lưu lại tủ đồ yêu thích của bạn.
            </p>
            <button className="btn-primary mt-2 inline-flex items-center gap-2" onClick={() => browse()}>
              <Icon name="shopping_bag" className="text-sm" />
              Khám phá sản phẩm
            </button>
          </div>
        ) : (
          <div className="product-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map(item =>
              item.availability === 'AVAILABLE' && item.product ? (
                <ProductCard key={item.productId} product={item.product} />
              ) : (
                <div key={item.productId} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md mb-2">
                      <Icon name="info" className="text-[10px]" />
                      Đã hết hàng
                    </span>
                    <p className="font-bold text-sm text-gray-800 line-clamp-2">{item.title || 'Sản phẩm không còn khả dụng'}</p>
                    <p className="text-xs text-gray-400 mt-1">Món đồ 2hand này đã được bán hoặc gỡ bỏ.</p>
                  </div>
                  <button
                    onClick={() => toggleWishlist(item.product || { _id: item.productId })}
                    className="btn-outline text-xs py-2 mt-4 inline-flex items-center justify-center gap-1.5"
                  >
                    <Icon name="delete" className="text-sm" />
                    Xóa khỏi danh sách
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </LocalizedContent>
  );
}

export default function NotificationsPage() {
  const { user, openResource, setCurrentView } = useApp();
  const [items, setItems] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [count, setCount] = useState(0);
  const [actionLogs, setActionLogs] = useState(getActionHistory);
  const [selectedActionCategory, setSelectedActionCategory] = useState('all');
  const { busy, error, run } = useAction();

  const reload = useCallback(async () => {
    const [result, prefs, unread] = await Promise.all([
      collectPages(notificationService.listNotifications),
      notificationService.preferences(),
      notificationService.unreadCount(),
    ]);
    setItems(result.items);
    setPreferences(prefs);
    setCount(unread);
  }, []);

  useEffect(() => {
    run(reload);
    const refresh = () => run(reload);
    const refreshActions = () => setActionLogs(getActionHistory());
    window.addEventListener('sifit:notifications', refresh);
    window.addEventListener('sifit:action-history-updated', refreshActions);
    return () => {
      window.removeEventListener('sifit:notifications', refresh);
      window.removeEventListener('sifit:action-history-updated', refreshActions);
    };
  }, [run, reload]);

  const filteredActionLogs =
    selectedActionCategory === 'all'
      ? actionLogs
      : actionLogs.filter(entry => entry.category === selectedActionCategory);

  const getNotificationIcon = (type, resourceType) => {
    if (resourceType === 'CONVERSATION') return 'forum';
    if (type?.includes('ORDER') || resourceType === 'ORDER') return 'receipt_long';
    if (type?.includes('SHIPMENT') || resourceType === 'SHIPMENT') return 'local_shipping';
    if (type?.includes('PAYOUT') || resourceType === 'PAYOUT') return 'account_balance_wallet';
    if (type?.includes('REVIEW') || resourceType === 'REVIEW') return 'star';
    if (type?.includes('REPORT')) return 'flag';
    return 'notifications';
  };

  return (
    <LocalizedContent>
      <div className="member-page member-notifications max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 animate-fade-in space-y-6">
        <BuyerHeading
          title={`Thông báo (${count} chưa đọc)`}
          description="Cập nhật mới nhất về đơn mua, đề nghị giá, tin nhắn và hoạt động của bạn."
        >
          <button className="member-secondary inline-flex items-center gap-1.5" disabled={busy} onClick={() => run(reload)}>
            <Icon name="refresh" className={`text-xs ${busy ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            className="member-primary inline-flex items-center gap-1.5"
            disabled={busy || count === 0}
            onClick={() => run(async () => { await notificationService.markAllRead(); await reload(); })}
          >
            <Icon name="task_alt" className="text-xs" />
            Đọc tất cả
          </button>
        </BuyerHeading>

        <Feedback busy={busy} error={error} />

        {/* Categorized Action Notifications Section */}
        <Panel title="Thông báo theo loại thao tác gần đây" icon="sparkles">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedActionCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  selectedActionCategory === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tất cả ({actionLogs.length})
              </button>
              {Object.values(ACTION_CATEGORIES).map(cat => {
                const catCount = actionLogs.filter(item => item.category === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedActionCategory(cat.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      selectedActionCategory === cat.key
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon name={cat.icon} className="text-xs" />
                    <span>{cat.labelVi}</span>
                    {catCount > 0 && (
                      <span className="opacity-80 text-[10px]">({catCount})</span>
                    )}
                  </button>
                );
              })}
            </div>
            {actionLogs.length > 0 && (
              <button
                type="button"
                onClick={clearActionHistory}
                className="text-xs font-semibold text-gray-400 hover:text-red-500 inline-flex items-center gap-1 cursor-pointer"
              >
                <Icon name="delete" className="text-xs" />
                Xóa lịch sử thao tác
              </button>
            )}
          </div>

          {filteredActionLogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {filteredActionLogs.map(entry => (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-start gap-3"
                >
                  <span className="w-9 h-9 rounded-xl bg-white border border-gray-100 text-primary flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Icon name={entry.icon || 'task_alt'} className="text-base" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-emerald-50 px-2 py-0.5 rounded-full">
                        {entry.categoryLabelVi}
                      </span>
                      <time className="text-[10px] text-gray-400">
                        {new Date(entry.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <p className="font-heading font-bold text-xs text-gray-900 mt-1">{entry.title}</p>
                    {entry.message && (
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{entry.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-3">
              Chưa có thông báo thao tác nào thuộc nhóm này. Mỗi khi bạn thêm giỏ hàng, lưu yêu thích, trả giá, đặt đơn hoặc cập nhật hồ sơ, thông báo tương ứng sẽ xuất hiện tức thì.
            </p>
          )}
        </Panel>

        <div className="member-notification-layout grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="member-notification-list lg:col-span-2 space-y-3">
            {items.map(item => {
              const icon = getNotificationIcon(item.type, item.resourceType);
              return (
                <section
                  key={idOf(item)}
                  className={`member-notification p-4 rounded-2xl border transition-all flex gap-3.5 ${
                    item.isRead ? 'bg-white border-gray-100 shadow-xs' : 'bg-primary/5 border-primary/20 shadow-xs is-unread'
                  }`}
                >
                  <span className="member-feature-icon w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-primary flex-shrink-0 shadow-xs">
                    <Icon name={icon} className="text-lg" />
                  </span>
                  <div className="member-notification-body flex-1 min-w-0">
                    <div className="member-notification-title flex items-center justify-between gap-2">
                      <h2 className="font-heading font-bold text-sm text-gray-900">{item.title}</h2>
                      {!item.isRead && (
                        <span className="member-badge bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          Mới
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.body}</p>
                    <time dateTime={item.createdAt} className="text-[10px] text-gray-400 mt-1.5 block">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </time>
                    <div className="member-notification-actions flex items-center gap-3 mt-3 pt-2 border-t border-gray-100/70 text-xs">
                      {item.resourceType && item.resourceId && (
                        <button
                          disabled={busy}
                          className="font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                          onClick={() => run(async () => {
                            if (!item.isRead) await notificationService.markRead(idOf(item));
                            if (['PRODUCT_REPORT_RESOLVED', 'REPORTING_POLICY'].includes(item.type)) setCurrentView('report-history');
                            else openResource(item.resourceType, idOf(item.resourceId));
                          })}
                        >
                          Xem chi tiết <Icon name="arrow_forward" className="text-[11px]" />
                        </button>
                      )}
                      {!item.isRead && (
                        <button
                          disabled={busy}
                          className="text-gray-500 hover:text-gray-900 cursor-pointer inline-flex items-center gap-1"
                          onClick={() => run(async () => { await notificationService.markRead(idOf(item)); await reload(); })}
                        >
                          <Icon name="check" className="text-xs" />
                          Đã đọc
                        </button>
                      )}
                      <button
                        disabled={busy}
                        className="text-gray-400 hover:text-red-500 cursor-pointer ml-auto inline-flex items-center gap-1"
                        onClick={() => run(async () => { await notificationService.archive(idOf(item)); await reload(); })}
                      >
                        <Icon name="close" className="text-xs" />
                        Ẩn
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}

            {!items.length && !busy && (
              <div className="member-empty p-12 bg-white rounded-3xl border border-gray-100 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-1">
                  <Icon name="notifications_none" className="text-2xl" />
                </div>
                <h3 className="font-heading font-bold text-sm text-gray-800">Chưa có thông báo nào</h3>
                <p className="text-xs text-gray-400">Bạn sẽ nhận được thông báo khi có cập nhật về đơn hàng, đề nghị giá hoặc tin nhắn.</p>
              </div>
            )}
          </div>

          {/* Preferences Aside */}
          <aside className="member-preferences lg:col-span-1">
            {preferences && (
              <Panel title="Tùy chọn thông báo">
                <p className="member-muted text-xs text-gray-500 mb-4">Chọn những cập nhật bạn muốn nhận từ Sifit.</p>
                <div className="space-y-2.5">
                  {[
                    ['inAppEnabled', 'Thông báo trong ứng dụng', 'notifications'],
                    ['messageNotifications', 'Tin nhắn', 'forum'],
                    ['orderNotifications', 'Đơn hàng', 'receipt_long'],
                    ['productNotifications', 'Sản phẩm mới & gợi ý', 'sparkles'],
                    ...(user?.role === 'buyer' ? [['followedShopNotifications', 'Sản phẩm từ shop theo dõi', 'storefront']] : []),
                    ['shippingNotifications', 'Vận chuyển & giao hàng', 'local_shipping'],
                    ['reviewNotifications', 'Đánh giá & phản hồi', 'star'],
                    ['payoutNotifications', 'Thu nhập & chi trả', 'account_balance_wallet'],
                  ].map(([key, label, icon]) => (
                    <label key={key} className="member-preference flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-gray-50">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                        <Icon name={icon} className="text-sm text-gray-400" />
                        {label}
                      </span>
                      <input
                        disabled={busy}
                        type="checkbox"
                        checked={Boolean(preferences[key])}
                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                        onChange={event => {
                          const previous = preferences;
                          const checked = event.target.checked;
                          setPreferences({ ...preferences, [key]: checked });
                          run(async () => {
                            try { setPreferences(await notificationService.updatePreferences({ [key]: checked })); }
                            catch (error) { setPreferences(previous); throw error; }
                          });
                        }}
                      />
                    </label>
                  ))}
                </div>
              </Panel>
            )}
          </aside>
        </div>
      </div>
    </LocalizedContent>
  );
}

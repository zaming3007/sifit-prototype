import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitch from './LanguageSwitch';
import { resolveCategoryKey } from './CategoryIcon';
import Icon from './Icon';
import UserAvatar from './UserAvatar';
import logo from '../image/logo-favicon/sifit-mark.png';

const MIN_SIDEBAR_WIDTH = 76;
const MAX_SIDEBAR_WIDTH = 360;
const COLLAPSE_THRESHOLD = 148;
const SNAP_ICON_WIDTH = 78;

export default function Navbar() {
  const {
    currentView,
    setCurrentView,
    cart,
    user,
    logoutUser,
    searchQuery,
    browse,
    openAuth,
    openSellGuide,
    apiCategories,
    filters,
  } = useApp();

  const isSelling = ['sell', 'sell-guide'].includes(currentView);
  const { t, locale } = useLanguage();
  const text = (vi, en) => (locale === 'vi' ? vi : en);

  const [query, setQuery] = useState(searchQuery);
  const [accountOpen, setAccountOpen] = useState(false);

  // Vertical Sidebar states:
  // sidebarHidden: completely hides/shows the vertical navbar
  // sidebarWidth: user-resizable width (when dragged < 148px, switches to icon-only mode)
  // mobileOpen: controls slide-over drawer on mobile/tablet screens
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem('sifit-store-sidebar-hidden') === 'true';
    } catch {
      return false;
    }
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('sifit-store-sidebar-width'));
      return saved >= MIN_SIDEBAR_WIDTH && saved <= MAX_SIDEBAR_WIDTH ? saved : 260;
    } catch {
      return 260;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isCollapsed = sidebarWidth < COLLAPSE_THRESHOLD;
  const effectiveWidth = isCollapsed ? SNAP_ICON_WIDTH : sidebarWidth;

  const accountMenu = useRef(null);
  const accountTrigger = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('sifit-store-sidebar-hidden', String(sidebarHidden));
    } catch {
      /* ignore storage errors */
    }
  }, [sidebarHidden]);

  useEffect(() => {
    try {
      localStorage.setItem('sifit-store-sidebar-width', String(sidebarWidth));
    } catch {
      /* ignore storage errors */
    }
  }, [sidebarWidth]);

  // Sync CSS variable --store-sidebar-width so MainLayout shifts smoothly on desktop
  useEffect(() => {
    const updateLayoutWidth = () => {
      const isDesktop = window.innerWidth > 1024;
      if (!isDesktop || sidebarHidden) {
        document.documentElement.style.setProperty('--store-sidebar-width', '0px');
      } else {
        document.documentElement.style.setProperty('--store-sidebar-width', `${effectiveWidth}px`);
      }
    };
    updateLayoutWidth();
    window.addEventListener('resize', updateLayoutWidth);
    return () => {
      window.removeEventListener('resize', updateLayoutWidth);
      document.documentElement.style.setProperty('--store-sidebar-width', '0px');
    };
  }, [sidebarHidden, effectiveWidth]);

  // Drag-to-resize handler for the vertical navbar
  const startResizing = event => {
    event.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = moveEvent => {
      const rawWidth = Math.max(
        MIN_SIDEBAR_WIDTH,
        Math.min(MAX_SIDEBAR_WIDTH, moveEvent.clientX)
      );
      setSidebarWidth(rawWidth < COLLAPSE_THRESHOLD ? SNAP_ICON_WIDTH : rawWidth);
    };

    const onPointerUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  useEffect(() => {
    if (!accountOpen) return;
    const outside = event => {
      if (!accountMenu.current?.contains(event.target)) setAccountOpen(false);
    };
    const escape = event => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountTrigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const escape = event => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [mobileOpen]);

  const openAccount = view => {
    setAccountOpen(false);
    setMobileOpen(false);
    setCurrentView(view);
  };

  const navigateTo = action => {
    setMobileOpen(false);
    action();
  };

  useEffect(() => setQuery(searchQuery), [searchQuery]);

  useEffect(() => {
    const header = document.querySelector('.store-header');
    const update = () =>
      document.documentElement.style.setProperty(
        '--store-header-height',
        `${header?.getBoundingClientRect().height || 76}px`
      );
    const observer = new ResizeObserver(update);
    if (header) observer.observe(header);
    update();
    return () => observer.disconnect();
  }, []);

  const showSidebar = () => {
    if (window.innerWidth <= 1024) {
      setMobileOpen(true);
    } else {
      setSidebarHidden(false);
    }
  };

  const hideSidebar = () => {
    if (window.innerWidth <= 1024) {
      setMobileOpen(false);
    } else {
      setSidebarHidden(true);
    }
  };

  const buyerWorkspaceLinks = [
    ['checkout', 'Đơn mua & giỏ hàng', 'receipt_long', cart.length > 0 ? cart.length : null],
    ['chat', 'Chat', 'chat_bubble_outline', null],
    ['wishlist', 'Yêu thích', 'favorite_border', null],
    ['offers', 'Đề nghị giá', 'payments', null],
    ['following', 'Shop đang theo dõi', 'storefront', null],
    ['notifications', 'Thông báo', 'notifications_none', null],
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="store-sidebar-backdrop"
          aria-label={text('Đóng thanh điều hướng', 'Close navigation sidebar')}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── VERTICAL SIDEBAR NAVBAR (RESIZABLE & HIDEABLE) ── */}
      <aside
        id="store-vertical-sidebar"
        aria-label={text('Thanh điều hướng chính', 'Main vertical navigation')}
        style={{ width: `${effectiveWidth}px` }}
        className={`store-vnav ${isCollapsed ? 'is-collapsed' : ''} ${
          sidebarHidden ? 'is-hidden' : ''
        } ${mobileOpen ? 'is-mobile-open' : ''} ${isResizing ? 'is-resizing' : ''}`}
      >
        {/* Top Brand Logo (always visible, stays with icons when narrowed) */}
        <div className="store-vnav-header">
          <button
            type="button"
            className="store-vnav-brand"
            aria-label="Sifit — Home"
            title={isCollapsed ? 'Sifit — Trang chủ' : undefined}
            onClick={() => navigateTo(() => setCurrentView('homepage'))}
          >
            <span className="store-vnav-logo-mark">
              <img src={logo} alt="Sifit" />
            </span>
            {!isCollapsed && (
              <div className="store-vnav-brand-text">
                <strong>
                  sifit<span>●</span>
                </strong>
                <small>PRE-LOVED. RE-LOVED.</small>
              </div>
            )}
          </button>
        </div>

        {/* Scrollable Vertical Menu Sections */}
        <div className="store-vnav-scroll custom-scrollbar">
          {/* Group 1: Khám Phá Cửa Hàng */}
          <div className="store-vnav-group">
            {!isCollapsed && (
              <p className="store-vnav-caption">{text('KHÁM PHÁ SHOP', 'EXPLORE SHOP')}</p>
            )}
            <nav className="store-vnav-list" aria-label={t('shop')}>
              <button
                type="button"
                className={`store-vnav-item ${currentView === 'homepage' ? 'is-active' : ''}`}
                onClick={() => navigateTo(() => setCurrentView('homepage'))}
                title={isCollapsed ? text('Trang chủ', 'Home') : undefined}
              >
                <Icon name="storefront" className="store-vnav-icon" />
                {!isCollapsed && <span className="store-vnav-label">{text('Trang chủ', 'Home')}</span>}
              </button>

              <button
                type="button"
                className={`store-vnav-item ${currentView === 'catalog' && !isSelling ? 'is-active' : ''}`}
                onClick={() => navigateTo(() => browse())}
                title={isCollapsed ? t('shop') : undefined}
              >
                <Icon name="shopping_bag" className="store-vnav-icon" />
                {!isCollapsed && <span className="store-vnav-label">{t('shop')}</span>}
                {!isCollapsed && <span className="store-vnav-badge-new">HOT</span>}
              </button>

              <button
                type="button"
                className="store-vnav-item"
                onClick={() => navigateTo(() => browse())}
                title={isCollapsed ? text('Mới lên kệ', 'New arrivals') : undefined}
              >
                <Icon name="sparkles" className="store-vnav-icon text-amber-500" />
                {!isCollapsed && (
                  <span className="store-vnav-label">{text('Mới lên kệ', 'New arrivals')}</span>
                )}
              </button>

              <button
                type="button"
                className="store-vnav-item"
                onClick={() => navigateTo(() => browse({ lastChance: true }))}
                title={isCollapsed ? text('Đồ xinh dưới 500k', 'Finds under 500k') : undefined}
              >
                <Icon name="discount" className="store-vnav-icon text-emerald-600" />
                {!isCollapsed && (
                  <span className="store-vnav-label">{text('Đồ xinh dưới 500k ↗', 'Finds under 500k ↗')}</span>
                )}
              </button>

              <button
                type="button"
                className={`store-vnav-item store-vnav-ai ${currentView === 'ai-stylist' ? 'is-active' : ''}`}
                onClick={() => navigateTo(() => setCurrentView('ai-stylist'))}
                title={isCollapsed ? t('ai') : undefined}
              >
                <Icon name="auto_awesome" className="store-vnav-icon text-emerald-600" />
                {!isCollapsed && <span className="store-vnav-label">{t('ai')}</span>}
                {!isCollapsed && <span className="store-vnav-pill-ai">AI</span>}
              </button>

              {!user && (
                <>
                  <button
                    type="button"
                    className={`store-vnav-item ${currentView === 'sell' ? 'is-active' : ''}`}
                    onClick={() => navigateTo(() => setCurrentView('sell'))}
                    title={isCollapsed ? t('sell') : undefined}
                  >
                    <Icon name="sell" className="store-vnav-icon" />
                    {!isCollapsed && <span className="store-vnav-label">{t('sell')}</span>}
                  </button>
                  <button
                    type="button"
                    className={`store-vnav-item ${currentView === 'sell-guide' ? 'is-active' : ''}`}
                    onClick={() => navigateTo(() => openSellGuide())}
                    title={isCollapsed ? t('cleanOutGuide') : undefined}
                  >
                    <Icon name="info" className="store-vnav-icon" />
                    {!isCollapsed && <span className="store-vnav-label">{t('cleanOutGuide')}</span>}
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Group 2: Danh Mục Mua Sắm */}
          {apiCategories.length > 0 && (
            <div className="store-vnav-group">
              {!isCollapsed && (
                <p className="store-vnav-caption">{text('DANH MỤC THỜI TRANG', 'CATEGORIES')}</p>
              )}
              <nav
                className="store-vnav-list"
                aria-label={locale === 'vi' ? 'Danh mục mua sắm' : 'Shopping categories'}
              >
                {apiCategories.map(category => {
                  const catId = category._id || category.id;
                  const isSelected = currentView === 'catalog' && filters?.categories?.includes(catId);
                  const iconName = resolveCategoryKey(category);
                  return (
                    <button
                      key={catId}
                      type="button"
                      className={`store-vnav-item ${isSelected ? 'is-active' : ''}`}
                      onClick={() => navigateTo(() => browse({ category: catId }))}
                      title={isCollapsed ? category.name : undefined}
                    >
                      <Icon name={iconName} className="store-vnav-icon" />
                      {!isCollapsed && <span className="store-vnav-label">{category.name}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Drag-to-Resize Handle on Right Edge + Circular Arrow Hide Button */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={text('Kéo để thay đổi độ rộng thanh điều hướng', 'Drag to resize navigation sidebar')}
          title={text('Kéo sang trái/phải để thu gọn hoặc mở rộng', 'Drag left/right to resize')}
          className="store-vnav-resizer"
          onPointerDown={startResizing}
          onDoubleClick={() => setSidebarWidth(prev => (prev < COLLAPSE_THRESHOLD ? 260 : SNAP_ICON_WIDTH))}
        >
          <button
            type="button"
            className="store-vnav-edge-hide-btn"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              hideSidebar();
            }}
            aria-label={text('Ẩn thanh điều hướng dọc', 'Hide vertical navigation')}
            title={text('Ẩn thanh điều hướng', 'Hide navigation')}
          >
            <Icon name="chevron_left" className="text-sm" />
          </button>
        </div>
      </aside>

      {/* ── COMPACT TOPBAR (NO MIDDLE LOGO, FULL-LEFT SEARCH BAR & SHOW BUTTON WHEN HIDDEN) ── */}
      <header className="store-header storefront-refresh shadow-xs">
        <div className="announcement">
          <div className="wide-container flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Icon name="sparkles" className="text-amber-300 text-xs" />
              {t('announcement')}
            </span>
            <LanguageSwitch />
          </div>
        </div>

        <div className="header-main wide-container flex items-center justify-between gap-3">
          {/* Show Button + Brand Logo only render in Topbar when Vertical Sidebar is Hidden (or on mobile) */}
          <div className={`store-topbar-left flex items-center gap-2.5 flex-shrink-0 ${!sidebarHidden ? 'is-desktop-hidden' : ''}`}>
            <button
              type="button"
              className="store-vnav-trigger"
              onClick={showSidebar}
              aria-label={text('Hiện thanh điều hướng dọc', 'Show vertical navigation')}
              aria-expanded={!sidebarHidden}
              aria-controls="store-vertical-sidebar"
              title={text('Hiện menu', 'Show menu')}
            >
              <Icon name="menu" className="text-lg" />
            </button>

            <button
              type="button"
              className="store-vnav-brand store-topbar-brand"
              aria-label="Sifit — Home"
              onClick={() => setCurrentView('homepage')}
            >
              <span className="store-vnav-logo-mark">
                <img src={logo} alt="Sifit" />
              </span>
              <div className="store-vnav-brand-text hidden sm:flex">
                <strong>
                  sifit<span>●</span>
                </strong>
                <small>PRE-LOVED. RE-LOVED.</small>
              </div>
            </button>
          </div>

          {/* Search Bar stretched all the way to the left */}
          <form
            className="header-search header-search-stretched relative flex items-center flex-1"
            role="search"
            onSubmit={event => {
              event.preventDefault();
              browse({ query: query.trim() });
            }}
          >
            <Icon name="search" className="ml-3.5 text-gray-400 text-lg" />
            <input
              aria-label={t('searchLabel')}
              placeholder={t('search')}
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="w-full px-3 py-2 bg-transparent outline-none text-sm text-gray-800"
            />
            <button
              type="submit"
              aria-label={t('searchLabel')}
              className="mr-2 p-1.5 text-gray-500 hover:text-primary transition-colors cursor-pointer"
            >
              <Icon name="arrow_forward" className="text-base" />
            </button>
          </form>

          <div className="account-actions flex items-center gap-3 flex-shrink-0">
            <button
              className="bag-button relative p-2.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => (user ? setCurrentView('checkout') : openAuth())}
              aria-label={t('cart')}
              title={t('cart')}
            >
              <Icon name="shopping_bag" className="text-xl text-gray-800" />
              {cart.length > 0 && (
                <span className="bag-count absolute -top-1 -right-1 bg-primary text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {cart.length}
                </span>
              )}
            </button>

            <span className="nav-divider w-px h-5 bg-gray-200" />

            {user ? (
              <>
                <div
                  className="buyer-account relative"
                  ref={accountMenu}
                  onBlur={event => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false);
                  }}
                >
                  <button
                    ref={accountTrigger}
                    className="account-button inline-flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label={`Tài khoản ${user.name}`}
                    aria-expanded={accountOpen}
                    aria-controls="buyer-account-options"
                    onClick={() => setAccountOpen(value => !value)}
                  >
                    <UserAvatar user={user} className="account-avatar w-7 h-7 rounded-full object-cover" />
                    <span className="font-semibold text-sm text-gray-800">
                      {user.name.split(' ').slice(-1)}
                    </span>
                    <Icon name="expand_more" className="text-xs text-gray-500" />
                  </button>

                  {accountOpen && (
                    <nav
                      id="buyer-account-options"
                      className="buyer-account-options absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2.5 z-50 animate-slide-up flex flex-col gap-1"
                      aria-label="Tùy chọn tài khoản"
                    >
                      <p className="px-3 pt-1 pb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {text('Tủ đồ & Cá nhân', 'Wardrobe & Personal')}
                      </p>
                      {buyerWorkspaceLinks.map(([view, label, icon, badge]) => (
                        <button
                          key={view}
                          type="button"
                          aria-current={currentView === view ? 'page' : undefined}
                          className={`flex items-center justify-between gap-2.5 px-3 py-2 text-sm rounded-xl text-left transition-colors ${
                            currentView === view
                              ? 'bg-emerald-50 text-primary font-semibold'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                          }`}
                          onClick={() => openAccount(view)}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Icon name={icon} className="text-base text-gray-400 flex-shrink-0" />
                            <span className="truncate">{label}</span>
                          </span>
                          {badge !== null && (
                            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {badge}
                            </span>
                          )}
                        </button>
                      ))}

                      <hr className="my-1 border-gray-100" />
                      <p className="px-3 pt-1 pb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        {text('Hồ sơ & Bảo mật', 'Profile & Security')}
                      </p>
                      <button
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-xl hover:bg-gray-50 hover:text-primary text-left transition-colors"
                        onClick={() => openAccount('account-profile')}
                      >
                        <Icon name="person" className="text-base text-gray-400" />
                        Thông tin cá nhân
                      </button>
                      <button
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-xl hover:bg-gray-50 hover:text-primary text-left transition-colors"
                        onClick={() => openAccount('account-addresses')}
                      >
                        <Icon name="location_on" className="text-base text-gray-400" />
                        Địa chỉ
                      </button>
                      <button
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-xl hover:bg-gray-50 hover:text-primary text-left transition-colors"
                        onClick={() => openAccount('report-history')}
                      >
                        <Icon name="flag" className="text-base text-gray-400" />
                        Báo cáo của tôi
                      </button>
                      <button
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-xl hover:bg-gray-50 hover:text-primary text-left transition-colors"
                        onClick={() => openAccount('account-password')}
                      >
                        <Icon name="lock" className="text-base text-gray-400" />
                        Đổi mật khẩu
                      </button>
                      <hr className="my-1 border-gray-100" />
                      <button
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 rounded-xl hover:bg-rose-50 text-left transition-colors font-medium"
                        onClick={() => {
                          setAccountOpen(false);
                          logoutUser();
                        }}
                      >
                        <Icon name="logout" className="text-base text-rose-500" />
                        {t('logout')}
                      </button>
                    </nav>
                  )}
                </div>
                <button
                  className="text-link logout-link text-xs text-gray-500 hover:text-gray-900"
                  onClick={logoutUser}
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-link text-sm font-semibold text-gray-700 hover:text-primary px-3 py-1.5"
                  onClick={() => openAuth('login')}
                >
                  {t('login')}
                </button>
                <button
                  className="signup-link px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:shadow-md transition-all cursor-pointer"
                  onClick={() => openAuth('signup')}
                >
                  {t('signup')}
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

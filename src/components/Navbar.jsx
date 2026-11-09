import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitch from './LanguageSwitch';
import Icon from './Icon';
import logo from '../image/logo-favicon/sifit-mark.png';
import UserAvatar from './UserAvatar';

export default function Navbar() {
  const { currentView, setCurrentView, cart, user, logoutUser, searchQuery, browse, openAuth, openSellGuide, apiCategories } = useApp();
  const isSelling = ['sell', 'sell-guide'].includes(currentView);
  const { t, locale } = useLanguage();
  const [query, setQuery] = useState(searchQuery);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenu = useRef(null);
  const accountTrigger = useRef(null);
  useEffect(() => {
    if (!accountOpen) return;
    const outside = event => { if (!accountMenu.current?.contains(event.target)) setAccountOpen(false); };
    const escape = event => {
      if (event.key === 'Escape') { setAccountOpen(false); accountTrigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [accountOpen]);
  const openAccount = view => { setAccountOpen(false); setCurrentView(view); };
  useEffect(() => setQuery(searchQuery), [searchQuery]);
  useEffect(() => {
    const header = document.querySelector('.store-header');
    const update = () => document.documentElement.style.setProperty('--store-header-height', `${header?.getBoundingClientRect().height || 150}px`);
    const observer = new ResizeObserver(update);
    if (header) observer.observe(header);
    update();
    return () => observer.disconnect();
  }, []);
  return <header className="store-header storefront-refresh">
    <div className="announcement"><div className="wide-container"><span>{t('announcement')}</span><LanguageSwitch /></div></div>
    <div className="header-main wide-container">
      <button className="brand-logo" aria-label="Sifit — Home" onClick={() => setCurrentView('homepage')}><img src={logo} alt="Sifit — Wear your style" /></button>
      <nav className="storefront-primary" aria-label={t('shop')}><button className={!isSelling ? 'selected' : ''} onClick={() => browse()}>{t('shop')}</button>{!user && <button className={isSelling ? 'selected' : ''} onClick={() => setCurrentView('sell')}>{t('sell')}</button>}</nav>
      <form className="header-search" role="search" onSubmit={event => { event.preventDefault(); browse({ query: query.trim() }); }}><Icon name="search" /><input aria-label={t('searchLabel')} placeholder={t('search')} value={query} onChange={event => setQuery(event.target.value)} /><button type="submit" aria-label={t('searchLabel')}><Icon name="arrow_forward" /></button></form>
      <div className="account-actions">
        <button className="bag-button" onClick={() => user ? setCurrentView('checkout') : openAuth()} aria-label={t('cart')} title={t('cart')}><Icon name="shopping_bag" />{cart.length > 0 && <span className="bag-count">{cart.length}</span>}</button><span className="nav-divider" />
        {user ? <><div className="buyer-account" ref={accountMenu} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false); }}>
          <button ref={accountTrigger} className="account-button" aria-label={`Tài khoản ${user.name}`} aria-expanded={accountOpen} aria-controls="buyer-account-options" onClick={() => setAccountOpen(value => !value)}><UserAvatar user={user} className="account-avatar" /><span>{user.name.split(' ').slice(-1)}</span></button>
          {accountOpen && <nav id="buyer-account-options" className="buyer-account-options" aria-label="Tùy chọn tài khoản">
            <button onClick={() => openAccount('account-profile')}>Thông tin cá nhân</button>
            <button onClick={() => openAccount('report-history')}>Báo cáo của tôi</button>
            <button onClick={() => openAccount('following')}>Shop đang theo dõi</button>
            <button onClick={() => openAccount('offers')}>Đề nghị giá</button>
            <button onClick={() => openAccount('account-addresses')}>Địa chỉ</button>
            <button onClick={() => openAccount('account-password')}>Đổi mật khẩu</button>
            <button onClick={() => { setAccountOpen(false); logoutUser(); }}>{t('logout')}</button>
          </nav>}
        </div><button className="text-link logout-link" onClick={logoutUser}>{t('logout')}</button></> : <><button className="text-link" onClick={() => openAuth('login')}>{t('login')}</button><button className="signup-link" onClick={() => openAuth('signup')}>{t('signup')}</button></>}
      </div>
    </div>
    {isSelling && <nav className="storefront-guide-links wide-container" aria-label={t('sell')}><button onClick={() => setCurrentView('sell')}>{t('waysToSell')}</button><button onClick={() => openSellGuide()}>{t('cleanOutGuide')}</button></nav>}
    {user?.role === 'buyer' && <div className="storefront-account-row"><nav className="workspace-links wide-container" aria-label="Tài khoản người mua">{[['checkout', 'Đơn mua & giỏ hàng', 'receipt_long'], ['chat', 'Chat', 'chat_bubble_outline'], ['wishlist', 'Yêu thích', 'favorite_border'], ['offers', 'Đề nghị giá', 'chat_bubble_outline'], ['following', 'Shop đang theo dõi', 'storefront'], ['notifications', 'Thông báo', 'notifications_none']].map(([view, label, icon]) => <button key={view} aria-current={currentView === view ? 'page' : undefined} onClick={() => setCurrentView(view)}><Icon name={icon} />{label}</button>)}<button className="ai-button" onClick={() => setCurrentView('ai-stylist')}><Icon name="auto_awesome" />{t('ai')}</button></nav></div>}
    {!isSelling && <nav className="sf-store-nav" aria-label={locale === 'vi' ? 'Danh mục mua sắm' : 'Shopping categories'}><div className="wide-container"><button className="sf-new-link" onClick={() => browse()}><span />{locale === 'vi' ? 'Mới lên kệ' : 'New arrivals'}</button>{apiCategories.map(category => <button key={category._id || category.id} onClick={() => browse({ category: category._id || category.id })}>{category.name}</button>)}<button className="sf-budget-link" onClick={() => browse({ lastChance: true })}>{locale === 'vi' ? 'Đồ xinh dưới 500k ↗' : 'Finds under 500k ↗'}</button></div></nav>}
  </header>;
}

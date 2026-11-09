import Navbar from '../components/Navbar';
import { lazy, Suspense, useEffect, useState } from 'react';
import SellerWorkspace from '../components/SellerWorkspace';
import AdminWorkspace from '../components/AdminWorkspace';
import PortalHeader from '../components/PortalHeader';
import AccountPage from '../pages/AccountPage';
import MyProductReports from '../pages/MyProductReports';
import PaymentResult from '../pages/PaymentResult';
import FollowingShops from '../pages/FollowingShops';
import OffersPage from '../pages/OffersPage';
import AddressBook from '../components/AddressBook';
import BuyerHeading from '../components/BuyerHeading';
import Footer from '../components/Footer';
import Homepage from '../pages/Homepage';
import Catalog from '../pages/Catalog';
import ProductDetail from '../pages/ProductDetail';
import Chat from '../pages/Chat';
import ShopProfile from '../pages/ShopProfile';
import AuthPage from '../pages/AuthPage';
import AiStylist from '../pages/AiStylist';
import InfoPage from '../pages/InfoPage';
import SellPage from '../pages/SellPage';
import CleanOutGuide from '../pages/CleanOutGuide';
import NotificationsPage, { WishlistPage } from '../pages/NotificationsPage';
import { useApp } from '../context/AppContext';

const AdminHub = lazy(() => import('../pages/AdminHub'));
const SellerStudio = lazy(() => import('../pages/SellerStudio'));
const CheckoutTracker = lazy(() => import('../pages/CheckoutTracker'));
const ResourcePage = lazy(() => import('../pages/ResourcePage'));

export default function MainLayout() {
  const { currentView, setCurrentView, user, authLoading, openAuth, dataError, setDataError, publicLoading, reloadPublicData } = useApp();
  const portal = user && user.role !== 'buyer';
  const [sellerTab, setSellerTab] = useState('overview');
  const [adminTab, setAdminTab] = useState('overview');
  const [adminBusy, setAdminBusy] = useState(false);
  const home = user?.role === 'admin' ? 'admin' : user?.role === 'seller' ? 'seller' : 'homepage';
  const allowed = user?.role === 'seller' ? ['seller', 'chat', 'notifications', 'account', 'account-profile', 'report-history', 'payment-result', 'history', 'detail', 'shop', 'resource']
    : user?.role === 'admin' ? ['admin', 'chat', 'notifications', 'account', 'account-profile', 'history', 'detail', 'shop', 'resource'] : null;
  const forbidden = user && (allowed ? !allowed.includes(currentView) : ['seller', 'admin', 'history'].includes(currentView));
  useEffect(() => {
    if (!authLoading && forbidden) setCurrentView(home);
  }, [authLoading, forbidden, home, setCurrentView]);

  const renderView = () => {
    // Keep form state and error messages mounted while a login is in progress.
    if (currentView === 'auth' && !user) return <AuthPage />;
    if (authLoading) return <p className="p-8" role="status">Đang khôi phục phiên đăng nhập…</p>;
    if (forbidden) return <p className="p-8" role="status">Đang mở giao diện tài khoản…</p>;
    if (['offers', 'following', 'payment-result', 'checkout', 'seller', 'chat', 'admin', 'notifications', 'wishlist', 'account', 'account-profile', 'account-addresses', 'account-password', 'report-history', 'history', 'resource'].includes(currentView)) {
      if (authLoading) return <p className="p-8" role="status">Đang khôi phục phiên đăng nhập…</p>;
      if (!user) return <div className="p-8 text-center space-y-4"><p>Đăng nhập để tiếp tục.</p><button onClick={() => openAuth()} className="btn-primary">Đăng nhập</button></div>;
      if (currentView === 'admin' && user.role !== 'admin') return <p className="p-8">Bạn không có quyền quản trị.</p>;
    }
    switch (currentView) {
      case 'homepage': return <Homepage />;
      case 'catalog': return <Catalog />;
      case 'detail': return <ProductDetail />;
      case 'chat': return <Chat />;
      case 'shop': return <ShopProfile />;
      case 'ai-stylist': return <AiStylist />;
      case 'checkout': return <CheckoutTracker />;
      case 'history': return <CheckoutTracker historyOnly />;
      case 'account': return <AccountPage />;
      case 'account-profile': return <AccountPage key="profile" section="profile" />;
      case 'report-history': return <MyProductReports />;
      case 'payment-result': return <PaymentResult />;
      case 'account-addresses': return <div className="member-page member-address-page"><BuyerHeading title="Địa chỉ" description="Quản lý những địa chỉ nhận hàng đã lưu của bạn." /><AddressBook /></div>;
      case 'account-password': return <AccountPage key="password" section="password" />;
      case 'resource': return <ResourcePage />;
      case 'seller': return <SellerStudio tab={sellerTab} setTab={setSellerTab} />;
      case 'sell': return <SellPage />;
      case 'sell-guide': return <CleanOutGuide />;
      case 'admin': return <AdminHub tab={adminTab} setTab={setAdminTab} onBusyChange={setAdminBusy} />;
      case 'auth': return <AuthPage />;
      case 'notifications': return <NotificationsPage />;
      case 'wishlist': return <WishlistPage />;
      case 'following': return <FollowingShops />;
      case 'offers': return <OffersPage />;
      case 'info': return <InfoPage />;
      default: return <Homepage />;
    }
  };

  if (user?.role === 'seller' && !authLoading) return <SellerWorkspace activeTab={sellerTab} onSelectTab={setSellerTab}>
    {dataError && <div role="alert" className="seller-global-error"><p>{dataError}</p><button onClick={() => setDataError('')}>Đóng</button></div>}
    <main className="workspace-screen"><Suspense fallback={<p role="status" className="p-8">Đang mở trang…</p>}>{renderView()}</Suspense></main>
  </SellerWorkspace>;

  if (user?.role === 'admin' && !authLoading) return <AdminWorkspace activeTab={adminTab} onSelectTab={setAdminTab} busy={adminBusy}>
    {dataError && <div role="alert" className="admin-global-error"><p>{dataError}</p><button onClick={() => setDataError('')}>Đóng</button></div>}
    <main><Suspense fallback={<p role="status">Đang mở trang…</p>}>{renderView()}</Suspense></main>
  </AdminWorkspace>;

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-[#17221e]">
      {!authLoading && currentView !== 'auth' && (portal ? <PortalHeader /> : <Navbar />)}
      {currentView !== 'auth' && dataError && <div role="alert" className="px-6 py-3 bg-red-50 text-red-700 flex flex-wrap gap-3"><p>{dataError}</p><button onClick={reloadPublicData}>Thử tải lại</button><button onClick={() => setDataError('')}>Đóng</button></div>}
      {currentView !== 'auth' && !portal && publicLoading && <p role="status" className="px-6 py-2">Đang tải sản phẩm…</p>}
      <main className={`flex-grow ${['detail', 'chat', 'shop', 'ai-stylist', 'checkout', 'seller', 'admin'].includes(currentView) ? 'workspace-screen' : ''}`}><Suspense fallback={<p role="status" className="p-8">Đang mở trang…</p>}>{renderView()}</Suspense></main>
      {!authLoading && !portal && currentView !== 'auth' && <Footer />}
    </div>
  );
}

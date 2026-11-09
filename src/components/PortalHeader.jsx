import { useApp } from '../context/AppContext';
import logo from '../image/logo-favicon/sifit-mark.png';

export default function PortalHeader() {
  const { user, currentView, setCurrentView, logoutUser, orders } = useApp();
  const admin = user.role === 'admin';
  const home = admin ? 'admin' : 'seller';
  const links = [[home, admin ? 'Quản trị' : 'Kênh bán'], ['chat', 'Chat'], ['notifications', 'Thông báo'], ['account', 'Tài khoản']];
  if (orders.length) links.push(['history', 'Đơn mua trước đây']);
  return <header className="border-b border-emerald-100 bg-white sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
      <button onClick={() => setCurrentView(home)} aria-label="Sifit"><img src={logo} alt="Sifit" className="w-28" /></button>
      <div className="flex-1"><p className="font-bold text-lg text-emerald-900">{admin ? 'Trung tâm quản trị' : 'Trung tâm người bán'}</p><p className="text-sm text-gray-500">{user.name}</p></div>
      <button className="account-button text-sm" onClick={() => setCurrentView('account')}>Tài khoản {user.role.toUpperCase()}</button>
      <button className="text-sm underline" onClick={logoutUser}>Đăng xuất</button>
    </div>
    <nav aria-label={admin ? 'Điều hướng quản trị' : 'Điều hướng người bán'} className="max-w-7xl mx-auto px-4 flex gap-2 overflow-x-auto pb-3">
      {links.map(([view, label]) => <button key={view} aria-current={view === currentView ? 'page' : undefined} onClick={() => setCurrentView(view)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${view === currentView ? 'bg-emerald-800 text-white' : 'bg-gray-50 text-gray-700 hover:bg-emerald-50'}`}>{label}</button>)}
    </nav>
  </header>;
}

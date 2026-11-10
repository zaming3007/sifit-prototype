import { LanguageProvider } from './context/LanguageContext';
import { AppContextProvider } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import { useLanguage } from './context/LanguageContext';

function DemoNotice() {
  const { locale } = useLanguage();
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null;
  return <div role="note" style={{ padding: '8px 16px', background: '#eef3d8', color: '#17221e', textAlign: 'center', fontSize: '14px' }}>
    {locale === 'en' ? 'Academic demonstration · Payments are unavailable. Please use test information.' : 'Bản giới thiệu học tập · Chưa mở thanh toán. Vui lòng dùng thông tin thử nghiệm.'}
  </div>;
}

export default function App() {
  return (
    <LanguageProvider><DemoNotice /><AppContextProvider>
      <MainLayout />
    </AppContextProvider></LanguageProvider>
  );
}

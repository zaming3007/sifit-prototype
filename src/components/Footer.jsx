import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import MobileQrCode from './MobileQrCode';
import Icon from './Icon';
import logo from '../image/logo-favicon/sifit-mark.png';

export default function Footer() {
  const { setCurrentView, setInfoPage, browse, apiCategories, user, openAuth } = useApp();
  const { t, locale } = useLanguage();
  const text = (vi, en) => locale === 'vi' ? vi : en;
  const info = page => { setInfoPage(page); setCurrentView('info'); };

  return (
    <footer className="marketplace-footer footer-refresh border-t border-gray-200/80 bg-white mt-auto">
      <div className="wide-container py-6">
        <div className="footer-refresh-main grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Brand Info */}
          <div className="footer-brand space-y-2">
            <button
              aria-label="Sifit — Home"
              onClick={() => setCurrentView('homepage')}
              className="inline-block cursor-pointer"
            >
              <img src={logo} alt="Sifit" className="h-8 w-auto" />
            </button>
            <p className="font-heading font-bold text-xs text-gray-900">
              {text('Đồ đẹp. Một hành trình mới.', 'Good clothes. A new chapter.')}
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {text(
                'Kết nối những tủ đồ, tiếp nối những câu chuyện. Mặc theo cách của bạn cùng Sifit.',
                'Connecting wardrobes and continuing stories. Wear your style with Sifit.'
              )}
            </p>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              <Icon name="eco" className="text-xs" /> PRE-LOVED. RE-LOVED.
            </span>
          </div>

          {/* Explore Category Column */}
          <div className="footer-link-column space-y-2">
            <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Icon name="shopping_bag" className="text-primary text-xs" />
              {text('Khám phá', 'Explore')}
            </h2>
            <nav className="flex flex-col space-y-1.5 text-xs text-gray-600" aria-label={text('Khám phá cửa hàng', 'Explore the shop')}>
              {apiCategories.slice(0, 4).map(category => (
                <button
                  key={category._id || category.id}
                  onClick={() => browse({ category: category._id || category.id })}
                  className="text-left hover:text-primary transition-colors cursor-pointer"
                >
                  {category.name}
                </button>
              ))}
              <button
                onClick={() => browse()}
                className="text-left font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer pt-0.5"
              >
                {text('Tất cả sản phẩm', 'All pieces')}
                <Icon name="north_east" className="text-xs" />
              </button>
            </nav>
          </div>

          {/* Sifit & You Column */}
          <div className="footer-link-column space-y-2">
            <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Icon name="verified_user" className="text-primary text-xs" />
              {text('Sifit & bạn', 'Sifit & you')}
            </h2>
            <nav className="flex flex-col space-y-1.5 text-xs text-gray-600" aria-label={text('Thông tin và tài khoản', 'Information and account')}>
              <button onClick={() => info('about')} className="text-left hover:text-primary transition-colors cursor-pointer">
                {t('aboutSifit')}
              </button>
              <button onClick={() => info('returnPolicy')} className="text-left hover:text-primary transition-colors cursor-pointer">
                {t('returnPolicy')}
              </button>
              <button onClick={() => info('termsUse')} className="text-left hover:text-primary transition-colors cursor-pointer">
                {t('terms')}
              </button>
              <button onClick={() => info('privacy')} className="text-left hover:text-primary transition-colors cursor-pointer">
                {t('privacy')}
              </button>
              <button onClick={() => (user ? setCurrentView('checkout') : openAuth())} className="text-left hover:text-primary transition-colors cursor-pointer">
                {t('account')}
              </button>
            </nav>
          </div>

          {/* Mobile QR & App */}
          <div className="footer-mobile space-y-2">
            <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Icon name="qr_code" className="text-primary text-xs" />
              {text('Mang Sifit theo bạn', 'Take Sifit with you')}
            </h2>
            <p className="text-[11px] text-gray-500">
              {text('Quét mã để tiếp tục khám phá trên điện thoại.', 'Scan to keep exploring on your phone.')}
            </p>
            <div className="flex items-center gap-2.5 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
              <MobileQrCode />
              <div className="text-[11px] text-gray-600 font-medium leading-snug">
                <span>{text('Một tủ đồ mới, ngay trong tầm tay.', 'Your next wardrobe, right at hand.')}</span>
                <span className="text-primary font-bold block mt-0.5 flex items-center gap-0.5">
                  Sifit Mobile <Icon name="north_east" className="text-[10px]" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-refresh-bottom mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-3">
          <p>© {new Date().getFullYear()} Sifit. {text('Bảo lưu mọi quyền.', 'All rights reserved.')}</p>
          <span className="text-gray-500 font-medium">Wear your style. Leave a lighter footprint.</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hover:text-gray-900 transition-colors inline-flex items-center gap-1 cursor-pointer font-semibold text-gray-600"
          >
            {text('Về đầu trang', 'Back to top')}
            <Icon name="north" className="text-xs" />
          </button>
        </div>
      </div>
    </footer>
  );
}

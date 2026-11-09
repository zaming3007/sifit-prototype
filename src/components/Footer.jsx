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
  return <footer className="marketplace-footer footer-refresh"><div className="wide-container">
    <div className="footer-refresh-main">
      <div className="footer-brand"><button aria-label="Sifit — Home" onClick={() => setCurrentView('homepage')}><img src={logo} alt="Sifit" /></button><p>{text('Đồ đẹp. Một hành trình mới.', 'Good clothes. A new chapter.')}</p><p>{text('Kết nối những tủ đồ, tiếp nối những câu chuyện. Mặc theo cách của bạn cùng Sifit.', 'Connecting wardrobes and continuing stories. Wear your style with Sifit.')}</p><span><Icon name="eco" /> PRE-LOVED. RE-LOVED.</span></div>
      <div className="footer-link-column"><h2>{text('Khám phá', 'Explore')}</h2><nav aria-label={text('Khám phá cửa hàng', 'Explore the shop')}>{apiCategories.slice(0, 4).map(category => <button key={category._id || category.id} onClick={() => browse({ category: category._id || category.id })}>{category.name}</button>)}<button onClick={() => browse()}>{text('Tất cả sản phẩm', 'All pieces')} ↗</button></nav></div>
      <div className="footer-link-column"><h2>{text('Sifit & bạn', 'Sifit & you')}</h2><nav aria-label={text('Thông tin và tài khoản', 'Information and account')}><button onClick={() => info('about')}>{t('aboutSifit')}</button><button onClick={() => info('returnPolicy')}>{t('returnPolicy')}</button><button onClick={() => info('termsUse')}>{t('terms')}</button><button onClick={() => info('privacy')}>{t('privacy')}</button><button onClick={() => user ? setCurrentView('checkout') : openAuth()}>{t('account')}</button></nav></div>
      <div className="footer-mobile"><h2>{text('Mang Sifit theo bạn', 'Take Sifit with you')}</h2><p>{text('Quét mã để tiếp tục khám phá trên điện thoại.', 'Scan to keep exploring on your phone.')}</p><div><MobileQrCode /><span>{text('Một tủ đồ mới, ngay trong tầm tay.', 'Your next wardrobe, right at hand.')}<Icon name="north_east" /></span></div></div>
    </div>
    <div className="footer-refresh-bottom"><p>© {new Date().getFullYear()} Sifit. {text('Bảo lưu mọi quyền.', 'All rights reserved.')}</p><span>Wear your style. Leave a lighter footprint.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{text('Về đầu trang', 'Back to top')}<Icon name="north" /></button></div>
  </div></footer>;
}

import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { listProducts } from '../services/productService';
import { getApiErrorMessage } from '../utils/errorHandler';
import CategoryIcon, { resolveCategoryKey } from '../components/CategoryIcon';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import hero from '../image/banner/sifit-editorial-walk.png';
import wardrobe from '../image/banner/banner (1).webp';
import styleEdits from '../image/banner/sifit-style-edits.webp';

const edits = [
  { key: 'everyday', position: 'left', vi: 'Gu đi chơi, gu mỗi ngày.', en: 'Everyday, your way.', subVi: 'Dễ mặc. Dễ phối. Rất là bạn.', subEn: 'Easy pieces. Endless possibilities.', query: 'áo', tag: 'THE EVERYDAY EDIT' },
  { key: 'denim', position: 'center', vi: 'Một chút cá tính.', en: 'A little attitude.', subVi: 'Denim & những bản phối không nhàm chán.', subEn: 'Denim with a personality of its own.', query: 'denim', tag: 'DENIM & BEYOND' },
  { key: 'dress', position: 'right', vi: 'Hẹn một ngày thật xinh.', en: 'Dress for the moment.', subVi: 'Những chiếc đầm cho buổi hẹn tiếp theo.', subEn: 'Find a dress for your next date.', category: 'dam', tag: 'DRESS UP, FEEL GOOD' },
];

export default function Homepage() {
  const { browse, products, apiCategories, publicLoading, dataError, reloadPublicData, setCurrentView } = useApp();
  const { locale } = useLanguage();
  const text = (vi, en) => locale === 'vi' ? vi : en;
  const [tab, setTab] = useState('new');
  const [selection, setSelection] = useState({ items: [], busy: false, error: '' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (tab === 'new') return;
    let live = true;
    setSelection({ items: [], busy: true, error: '' });
    const filters = tab === 'budget' ? { maxPrice: 500000 } : { conditions: JSON.stringify(['NEW_WITH_TAGS', 'LIKE_NEW']) };
    listProducts({ page: 1, limit: 8, sort: 'newest', ...filters })
      .then(result => { if (live) setSelection({ items: result.items, busy: false, error: '' }); })
      .catch(error => { if (live) setSelection({ items: [], busy: false, error: getApiErrorMessage(error) }); });
    return () => { live = false; };
  }, [tab, revision]);

  const busy = tab === 'new' ? publicLoading : selection.busy;
  const error = tab === 'new' ? dataError : selection.error;
  const latest = [...(tab === 'new' ? products : selection.items)]
    .filter(product => product.status === 'active')
    .sort((a, b) => (b.images?.length > 0 ? 1 : 0) - (a.images?.length > 0 ? 1 : 0))
    .slice(0, 8);
  const retry = () => tab === 'new' ? reloadPublicData() : setRevision(value => value + 1);

  const openEdit = edit => {
    const category = apiCategories.find(item => item.slug === edit.category);
    browse(category ? { category: category._id || category.id } : { query: edit.query || text('đầm', 'dress') });
  };

  return (
    <div className="sf-home">
      {/* Modern Fashion Hero */}
      <section className="modern-hero sf-container" aria-labelledby="home-title">
        <div className="modern-hero-copy">
          <p className="sf-eyebrow inline-flex items-center gap-2">
            <span className="sf-live-dot" />
            <Icon name="sparkles" className="text-amber-500 text-xs" />
            PRE-LOVED. RE-LOVED.
          </p>
          <h1 id="home-title">SIFIT</h1>
          <p>
            {text(
              'Những món đồ đã được yêu, sẵn sàng cho câu chuyện tiếp theo. Khám phá tủ đồ cộng đồng và tìm chất riêng của bạn.',
              'Loved pieces, ready for their next chapter. Explore community wardrobes and find your own style.'
            )}
          </p>
          <div className="modern-actions">
            <button className="sf-button inline-flex items-center gap-2" onClick={() => browse()}>
              <Icon name="shopping_bag" className="text-sm" />
              {text('Khám phá tủ đồ', 'Explore the wardrobe')}
              <Icon name="arrow_forward" />
            </button>
            <button className="modern-secondary inline-flex items-center gap-2" onClick={() => setCurrentView('sell')}>
              <Icon name="sell" className="text-sm" />
              {text('Bắt đầu bán', 'Start selling')}
              <Icon name="north_east" />
            </button>
          </div>
          <div className="modern-hero-foot flex items-center gap-2">
            <Icon name="eco" className="text-emerald-600" />
            <span>{text('Mặc đẹp hơn. Dùng lâu hơn.', 'Wear better. Love longer.')}</span>
            <a href="#sf-new-in" className="ml-auto inline-flex items-center gap-1">
              {text('Xem đồ mới về', 'New arrivals')}
              <Icon name="south" className="text-xs" />
            </a>
          </div>
        </div>
        <div className="modern-hero-visual">
          <img src={hero} alt={text('Cảm hứng phối đồ Sifit', 'Sifit outfit inspiration')} fetchPriority="high" />
          <span className="modern-image-tag">
            <Icon name="auto_awesome" />
            THE EVERYDAY EDIT
          </span>
          <div className="modern-image-label">
            <div>
              <small>PRE-LOVED. RE-LOVED.</small>
              <strong>{text('Gu mới mỗi ngày.', 'A fresh perspective.')}</strong>
            </div>
            <button aria-label={text('Khám phá bộ sưu tập', 'Explore collection')} onClick={() => browse()}>
              <Icon name="north_east" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Style Edits */}
      <nav className="pin-collections sf-container" aria-label={text('Bộ sưu tập nổi bật', 'Featured collections')}>
        {edits.map((edit, index) => (
          <button key={edit.key} onClick={() => openEdit(edit)}>
            <div className={`pin-collection-image pin-crop-${index}`}>
              <img src={styleEdits} alt="" loading="lazy" />
            </div>
            <div>
              <h2>{['EVERYDAY', 'DENIM', 'DRESS UP'][index]}</h2>
              <p>{text(edit.subVi, edit.subEn)}</p>
              <span className="inline-flex items-center gap-1">
                {text('Khám phá', 'Explore')}
                <Icon name="arrow_forward" className="text-xs" />
              </span>
            </div>
          </button>
        ))}
      </nav>

      {/* Season Banner */}
      <section className="pin-season sf-container">
        <img src={styleEdits} alt={text('Cảm hứng thời trang thường ngày', 'Everyday fashion inspiration')} loading="lazy" />
        <div>
          <p className="sf-eyebrow inline-flex items-center gap-1.5">
            <Icon name="sparkles" className="text-amber-300 text-xs" />
            THE NEW PERSPECTIVE
          </p>
          <h2>NEW<br />VIBES.</h2>
          <p>{text('Một diện mạo mới. Vẫn là chính bạn.', 'A fresh look. Still you.')}</p>
          <button className="sf-button inline-flex items-center gap-2" onClick={() => browse()}>
            {text('Khám phá bộ sưu tập', 'Explore collection')}
            <Icon name="arrow_forward" />
          </button>
        </div>
      </section>

      {/* Trust Highlights */}
      <div className="modern-trust sf-container">
        {[
          ['forum', text('Kết nối người bán', 'Meet the seller'), text('Trò chuyện và hỏi kỹ thông tin trước khi chọn.', 'Ask before you choose.')],
          ['checkroom', text('Hiểu rõ món đồ', 'Know your piece'), text('Kích thước, độ mới thực tế và chất riêng.', 'Size, condition and character.')],
          ['verified_user', text('An tâm mỗi bước', 'Follow every step'), text('Bảo vệ người mua và kiểm tra đơn rõ ràng.', 'Order tracking and support.')],
        ].map(([icon, title, description]) => (
          <div key={icon}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Icon name={icon} className="text-xl" />
            </div>
            <div>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Shop by Category */}
      <section className="sf-section sf-container sf-categories" id="home-categories" aria-labelledby="sf-categories-title">
        <div className="sf-section-heading">
          <div>
            <p className="sf-eyebrow flex items-center gap-1.5">
              <Icon name="checkroom" className="text-xs text-primary" />
              01 / SHOP BY CATEGORY
            </p>
            <h2 id="sf-categories-title">{text('Hôm nay bạn tìm gì?', 'What’s your next find?')}</h2>
          </div>
          <button className="sf-text-link inline-flex items-center gap-1 cursor-pointer" onClick={() => browse()}>
            {text('Dạo hết cửa hàng', 'Shop everything')}
            <Icon name="north_east" />
          </button>
        </div>
        <div className="sf-category-rail">
          {apiCategories.map((category, index) => (
            <button className={`sf-category sf-category-${index % 4}`} key={category._id || category.id} onClick={() => browse({ category: category._id || category.id })}>
              <span className="sf-category-picture">
                <CategoryIcon category={resolveCategoryKey(category)} />
                <span className="sf-category-arrow">
                  <Icon name="north_east" />
                </span>
              </span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
        {!apiCategories.length && (
          <p className="sf-empty" role="status">
            {publicLoading ? text('Đang mở tủ đồ…', 'Opening the wardrobe…') : text('Khám phá tất cả sản phẩm bằng nút Dạo hết cửa hàng.', 'Explore all pieces with Shop everything.')}
          </p>
        )}
      </section>

      {/* Fresh Arrivals Section */}
      <section className="sf-section sf-container sf-arrivals" id="sf-new-in" aria-labelledby="sf-arrivals-title">
        <div className="sf-section-heading">
          <div>
            <p className="sf-eyebrow inline-flex items-center gap-2">
              <span className="sf-live-dot" />
              <Icon name="sparkles" className="text-amber-500 text-xs" />
              02 / FRESH FINDS
            </p>
            <h2 id="sf-arrivals-title">{text('Vừa lên kệ. Đã thấy mê.', 'Just in. Already loved.')}</h2>
            <p className="sf-section-note">{text('Những món đồ thật từ tủ đồ cộng đồng Sifit.', 'Real pieces from the wardrobes of the Sifit community.')}</p>
          </div>
          <button className="sf-text-link inline-flex items-center gap-1 cursor-pointer" onClick={() => browse({ lastChance: tab === 'budget', premium: tab === 'like-new' })}>
            {text('Xem tất cả', 'View all')}
            <Icon name="north_east" />
          </button>
        </div>

        {/* Tab switcher with icons */}
        <div className="sf-tabs" role="group" aria-label={text('Chọn nhóm sản phẩm', 'Choose a product collection')}>
          {[
            ['new', text('Mới nhất', 'New arrivals'), 'sparkles'],
            ['budget', text('Dưới 500.000₫', 'Under 500,000₫'), 'discount'],
            ['like-new', text('Mới & như mới', 'New & like new'), 'task_alt'],
          ].map(([value, label, icon]) => (
            <button
              key={value}
              aria-pressed={tab === value}
              className={`inline-flex items-center gap-1.5 cursor-pointer ${tab === value ? 'is-active font-bold' : ''}`}
              onClick={() => setTab(value)}
            >
              <Icon name={icon} className="text-xs" />
              {label}
              {value === 'new' && <span>NEW</span>}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="sf-products" aria-busy={busy}>
          {busy
            ? Array.from({ length: 4 }, (_, index) => (
                <div className="sf-product-skeleton" key={index} aria-hidden="true">
                  <div />
                  <span />
                  <span />
                </div>
              ))
            : latest.map(product => <ProductCard key={product._id} product={product} />)}
        </div>

        {busy && <p className="sf-sr-only" role="status">{text('Đang tải sản phẩm…', 'Loading pieces…')}</p>}
        {!busy && (error || !latest.length) && (
          <div className="sf-empty">
            <Icon name={error ? 'refresh' : 'checkroom'} className="text-3xl text-gray-400" />
            <p>
              {error
                ? text('Chưa tải được sản phẩm. Thử lại để xem những món đồ mới nhé.', 'We couldn’t load the pieces. Try again.')
                : text('Tủ đồ này đang chờ những món mới. Khám phá thêm các danh mục khác nhé!', 'This edit is waiting for fresh finds. Explore the rest of the shop!')}
            </p>
            <button className="sf-text-link inline-flex items-center gap-1" onClick={error ? retry : () => browse()}>
              {error ? text('Thử tải lại', 'Try again') : text('Khám phá cửa hàng', 'Explore the shop')}
              <Icon name="arrow_forward" />
            </button>
          </div>
        )}
      </section>

      {/* Mood Edits */}
      <section className="sf-section sf-container" aria-labelledby="sf-edits-title">
        <div className="sf-section-heading">
          <div>
            <p className="sf-eyebrow flex items-center gap-1.5">
              <Icon name="auto_awesome" className="text-xs text-primary" />
              03 / FIND YOUR MOOD
            </p>
            <h2 id="sf-edits-title">{text('Chọn một mood. Lên một gu.', 'Find your mood. Make it yours.')}</h2>
          </div>
          <span className="sf-editorial-note inline-flex items-center gap-1">
            {text('Cảm hứng cho lần lên đồ tiếp theo', 'Inspiration for your next outfit')}
            <Icon name="south" className="text-xs" />
          </span>
        </div>
        <div className="sf-edits">
          {edits.map((edit, index) => (
            <button key={edit.key} className={`sf-edit sf-edit-${edit.position}`} onClick={() => openEdit(edit)}>
              <div className="sf-edit-image">
                <img src={styleEdits} alt={text(edit.vi, edit.en)} loading="lazy" width="2172" height="724" />
                <span>{edit.tag}</span>
                <span className="sf-edit-number">0{index + 1}</span>
              </div>
              <div className="sf-edit-copy">
                <div>
                  <h3>{text(edit.vi, edit.en)}</h3>
                  <p>{text(edit.subVi, edit.subEn)}</p>
                </div>
                <span className="sf-circle-arrow">
                  <Icon name="north_east" />
                </span>
              </div>
            </button>
          ))}
        </div>
        <p className="sf-photo-caption">
          {text('Ảnh phối đồ mang tính cảm hứng. Khám phá sản phẩm đang bán trong từng danh mục.', 'Outfit imagery is for inspiration. Explore available pieces in each edit.')}
        </p>
      </section>

      {/* Budget Spotlight */}
      <section className="sf-budget sf-container">
        <div>
          <p className="sf-eyebrow inline-flex items-center gap-1.5">
            <Icon name="discount" className="text-xs text-emerald-400" />
            SMALL BUDGET. BIG PERSONALITY.
          </p>
          <h2>
            {text('Gu xịn không cần', 'Great style.')}<br />
            <span>{text('ví thật dày.', 'Little price tag.')}</span>
          </h2>
          <p>
            {text(
              'Khám phá những món đồ dưới 500.000₫. Biết đâu món đồ tiếp theo bạn yêu đang ở đây?',
              'Explore pre-loved finds under 500,000₫. Your next favourite might be waiting right here.'
            )}
          </p>
          <button className="sf-button inline-flex items-center gap-2" onClick={() => browse({ lastChance: true })}>
            <Icon name="shopping_bag" className="text-sm" />
            {text('Săn đồ hợp ví', 'Find your budget favourite')}
            <Icon name="north_east" />
          </button>
        </div>
        <div className="sf-budget-art" aria-hidden="true">
          <span className="sf-budget-star">✳</span>
          <span className="sf-price-ticket">
            <small>THE UNDER</small>
            <strong>500<span>K</span></strong>
            <small>VND EDIT ↗</small>
          </span>
          <span className="sf-budget-note">GOOD STYLE<br />GREAT FINDS.</span>
        </div>
      </section>

      {/* Community Section */}
      <section className="sf-section sf-container sf-community" aria-labelledby="sf-community-title">
        <div className="sf-community-image">
          <img
            src={wardrobe}
            alt={text('Tủ đồ với áo khoác, váy và phụ kiện sẵn sàng cho hành trình mới', 'A wardrobe of jackets, dresses and accessories ready for their next chapter')}
            loading="lazy"
            width="1456"
            height="1086"
          />
          <span>PASS IT ON. KEEP THE STORY GOING.</span>
        </div>
        <div className="sf-community-copy">
          <p className="sf-eyebrow inline-flex items-center gap-1.5">
            <Icon name="eco" className="text-xs text-emerald-500" />
            A LITTLE LESS NEW. A LOT MORE YOU.
          </p>
          <h2 id="sf-community-title">
            {text('Tủ đồ của bạn.', 'Your wardrobe.')}<br />
            {text('Kho báu của ai đó.', 'Someone else’s treasure.')}
          </h2>
          <p>
            {text(
              'Có những món đồ vẫn đẹp, chỉ là không còn hợp gu bạn. Đăng bán trên Sifit để chúng tìm được người yêu mới — và dành chỗ cho điều bạn thật sự thích.',
              'Some pieces still have so much to give. Pass them on through Sifit, find them a new home, and make space for what you love now.'
            )}
          </p>
          <button className="sf-button sf-button-light inline-flex items-center gap-2" onClick={() => setCurrentView('sell')}>
            <Icon name="sell" className="text-sm" />
            {text('Bắt đầu bán đồ', 'Start selling')}
            <Icon name="north_east" />
          </button>
          <span className="sf-community-signature">Less waste. More wardrobe love. ♡</span>
        </div>
      </section>

      {/* Benefits summary */}
      <section className="sf-benefits sf-container" aria-label={text('Mua sắm cùng Sifit', 'Shopping with Sifit')}>
        {[
          ['forum', text('Hỏi người bán trước khi mua', 'Ask before you buy'), text('Trò chuyện trực tiếp về món đồ bạn thích.', 'Chat directly about the piece you love.')],
          ['checkroom', text('Biết rõ món đồ bạn chọn', 'Know your next favourite'), text('Xem kích thước, tình trạng và mô tả chi tiết.', 'Check size, condition and all the details.')],
          ['verified_user', text('Theo dõi từng hành trình', 'Follow its next chapter'), text('Quản lý đơn mua và gửi yêu cầu hỗ trợ.', 'Track your orders and request support.')],
        ].map(([icon, title, description]) => (
          <div key={icon}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Icon name={icon} className="text-lg" />
            </div>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

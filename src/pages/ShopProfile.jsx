import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import LocalizedContent from '../components/LocalizedContent';
import ProductCard from '../components/ProductCard';
import ShopFollowButton from '../components/ShopFollowButton';
import Icon from '../components/Icon';
import { Field, Tabs } from '../components/MarketplaceUI';
import { Pager } from '../components/OperationsUI';
import useShopView, { emptyShopFilters } from '../hooks/useShopView';
import useShopPage from '../hooks/useShopPage';
import * as sellerService from '../services/sellerService';
import { getApiErrorMessage } from '../utils/errorHandler';

const conditions = { NEW_WITH_TAGS: 'Mới còn nhãn', LIKE_NEW: 'Gần như mới', GOOD: 'Tốt', FAIR: 'Đã qua sử dụng' };
export default function ShopProfile() {
  const { currentSellerId, browse } = useApp();
  if (!currentSellerId) return <div className="shop-page"><p role="alert">Đường dẫn chưa có cửa hàng. Hãy mở shop từ một sản phẩm bạn thích.</p><button className="member-primary" onClick={() => browse()}>Khám phá sản phẩm</button></div>;
  return <ShopContent key={currentSellerId} sellerId={currentSellerId} />;
}
function ShopContent({ sellerId }) {
  const { browse } = useApp();
  const [view, update] = useShopView(sellerId);
  const [draft, setDraft] = useState(view.filters);
  const [formError, setFormError] = useState('');
  const [profileRevision, setProfileRevision] = useState(0);
  const [profile, setProfile] = useState({ shop: null, busy: true, error: '' });
  const filterSignature = JSON.stringify(view.filters);
  useEffect(() => { setDraft(JSON.parse(filterSignature)); setFormError(''); }, [filterSignature]);
  useEffect(() => {
    const controller = new AbortController(); setProfile({ shop: null, busy: true, error: '' });
    sellerService.getShopBySeller(sellerId, controller.signal).then(shop => {
      if (!controller.signal.aborted) setProfile({ shop, busy: false, error: '' });
    }).catch(error => { if (!controller.signal.aborted) setProfile({ shop: null, busy: false, error: getApiErrorMessage(error) }); });
    return () => controller.abort();
  }, [sellerId, profileRevision]);
  const shop = profile.shop;
  const params = { ...Object.fromEntries(Object.entries(view.filters).filter(([, value]) => value !== '')), page: view.page, limit: 12, sort: view.sort };
  const products = useShopPage(shop?.shopSlug, 'products', params, view.tab === 'products');
  const reviews = useShopPage(shop?.shopSlug, 'reviews', { page: view.reviewPage, limit: 10 }, view.tab === 'reviews');
  const facets = products.facets || { categories: [], brands: [], sizes: [], conditions: [], total: 0 };
  useEffect(() => {
    const resource = view.tab === 'products' ? products : reviews;
    const page = view.tab === 'products' ? view.page : view.reviewPage;
    if (!resource.busy && !resource.error && resource.pagination.pages !== undefined && page > Math.max(1, resource.pagination.pages))
      update({ [view.tab === 'products' ? 'page' : 'reviewPage']: Math.max(1, resource.pagination.pages) }, true);
  }, [products, reviews, view, update]);
  const reset = () => { setDraft(emptyShopFilters); setFormError(''); update({ filters: emptyShopFilters, page: 1, sort: 'newest' }); };
  const change = (name, value) => { setDraft(previous => ({ ...previous, [name]: value })); setFormError(''); };
  const filtered = Object.values(view.filters).some(Boolean);
  return <LocalizedContent><section className="shop-page">
    <nav className="shop-breadcrumb" aria-label="Đường dẫn trang shop"><button onClick={() => browse()}>Mua sắm</button><span>/</span><span>{shop?.shopName || 'Cửa hàng'}</span></nav>
    {profile.busy && <p role="status">Đang mở cửa hàng…</p>}
    {profile.error && <div className="shop-empty" role="alert"><Icon name="storefront" /><h1>Chưa mở được cửa hàng</h1><p>{profile.error}</p><button className="member-primary" onClick={() => setProfileRevision(value => value + 1)}>Thử lại</button></div>}
    {shop && <>
      <header className={`shop-header ${shop.coverImage ? 'has-cover' : ''}`}>
        {shop.coverImage && <img className="shop-cover" src={shop.coverImage} alt="" onError={event => { event.currentTarget.hidden = true; }} />}
        <div className="shop-header-body"><div className="shop-identity"><span className="shop-avatar"><Icon name="storefront" />{shop.avatar && <img src={shop.avatar} alt="" onError={event => { event.currentTarget.hidden = true; }} />}</span><div><p className="shop-eyebrow">SIFIT / TỦ ĐỒ CỦA SHOP</p><h1>{shop.shopName}</h1><p className="shop-verification"><Icon name={shop.verificationStatus === 'VERIFIED' ? 'verified_user' : 'storefront'} />{shop.verificationStatus === 'VERIFIED' ? 'Shop đã xác minh' : 'Shop chưa xác minh'}</p></div></div><p className="shop-description">{shop.description || 'Khám phá những món đồ đang chờ một hành trình mới.'}</p>
          <div className="shop-facts"><span><Icon name="star" /><strong>{shop.ratingAverage || 0}/5</strong> · {shop.ratingCount || 0} đánh giá</span><span><Icon name="shopping_bag" /><strong>{shop.totalSales || 0}</strong> món đã bán</span></div>
          <ShopFollowButton shop={shop} />
        </div>
      </header>
      <div className="shop-tabs"><Tabs value={view.tab} onChange={tab => update({ tab })} items={[[ 'products', 'Sản phẩm đang bán' ], ['reviews', 'Đánh giá shop']]} /></div>
      {view.tab === 'products' && <>
        <form className="shop-filters" aria-label="Tìm và lọc sản phẩm trong shop" onSubmit={event => {
          event.preventDefault();
          if (draft.minPrice !== '' && draft.maxPrice !== '' && Number(draft.minPrice) > Number(draft.maxPrice)) { setFormError('Giá từ không được lớn hơn giá đến.'); return; }
          setFormError(''); update({ filters: { ...draft, search: draft.search.trim(), brand: draft.brand.trim() }, page: 1 });
        }}>
          <div className="shop-search-row"><label className="shop-search"><Icon name="search" /><input type="search" aria-label="Tìm sản phẩm trong shop" maxLength="100" placeholder="Tìm tên món đồ, thương hiệu trong shop…" value={draft.search} onChange={event => change('search', event.target.value)} /></label><button className="member-primary" type="submit">Áp dụng bộ lọc<Icon name="arrow_forward" /></button><button className="member-secondary" type="button" onClick={reset}>Xóa bộ lọc</button></div>
          <div className="shop-filter-fields">
            <Field label="Danh mục"><select value={draft.categoryId} onChange={event => change('categoryId', event.target.value)}><option value="">Tất cả danh mục</option>{facets.categories.map(item => <option key={item._id} value={item._id}>{item.name} ({item.count})</option>)}</select></Field>
            <Field label="Thương hiệu"><select value={draft.brand} onChange={event => change('brand', event.target.value)}><option value="">Tất cả thương hiệu</option>{facets.brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></Field>
            <Field label="Kích cỡ"><select value={draft.size} onChange={event => change('size', event.target.value)}><option value="">Tất cả kích cỡ</option>{facets.sizes.map(size => <option key={size} value={size}>{size === 'FREE_SIZE' ? 'Freesize' : size}</option>)}</select></Field>
            <Field label="Tình trạng"><select value={draft.condition} onChange={event => change('condition', event.target.value)}><option value="">Tất cả tình trạng</option>{facets.conditions.map(condition => <option key={condition} value={condition}>{conditions[condition]}</option>)}</select></Field>
            <Field label="Giá từ (đ)"><input type="number" min="0" max="9007199254740991" step="1" placeholder="Không giới hạn" value={draft.minPrice} onChange={event => change('minPrice', event.target.value)} /></Field>
            <Field label="Giá đến (đ)"><input type="number" min="0" max="9007199254740991" step="1" placeholder="Không giới hạn" value={draft.maxPrice} onChange={event => change('maxPrice', event.target.value)} /></Field>
          </div>{formError && <p className="shop-filter-error" role="alert">{formError}</p>}
        </form>
        <div className="shop-results-toolbar"><p aria-live="polite">{products.busy ? 'Đang tìm món đồ phù hợp…' : <><strong>{products.pagination.total || 0}</strong> sản phẩm{filtered ? ' phù hợp' : ' đang bán'}</>}</p><label>Sắp xếp<select aria-label="Sắp xếp sản phẩm trong shop" value={view.sort} onChange={event => update({ sort: event.target.value, page: 1 })}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="price_asc">Giá thấp đến cao</option><option value="price_desc">Giá cao đến thấp</option></select></label></div>
        <div className="shop-results" aria-busy={products.busy}>
          {products.busy && <p role="status">Đang tải sản phẩm của shop…</p>}
          {products.error && <div className="shop-empty" role="alert"><Icon name="refresh" /><h2>Chưa tải được sản phẩm</h2><p>{products.error}</p><button className="member-primary" onClick={() => setProfileRevision(value => value + 1)}>Thử tải lại sản phẩm</button><button className="member-secondary" onClick={reset}>Xóa bộ lọc</button></div>}
          {!products.busy && !products.error && !products.items.length && <div className="shop-empty"><Icon name="search" /><h2>{facets.total ? 'Chưa tìm thấy món đồ phù hợp' : 'Shop chưa có sản phẩm đang bán'}</h2><p>{facets.total ? 'Thử một từ khóa khác hoặc bớt điều kiện lọc để khám phá thêm.' : 'Bạn có thể theo dõi shop để nhận thông báo khi có món đồ mới được duyệt.'}</p>{filtered && <button className="member-primary" onClick={reset}>Xem toàn bộ sản phẩm</button>}</div>}
          {!products.busy && !products.error && <div className="product-grid">{products.items.map(product => <ProductCard key={product._id} product={product} />)}</div>}
        </div><Pager resource={{ ...products, page: view.page, setPage: page => { update({ page }); document.querySelector('.shop-results-toolbar')?.scrollIntoView({ block: 'start', behavior: 'instant' }); } }} />
      </>}
      {view.tab === 'reviews' && <section className="shop-reviews"><h2>Đánh giá từ người mua</h2>{reviews.busy && <p role="status">Đang tải đánh giá…</p>}{reviews.error && <p role="alert">{reviews.error} <button onClick={reviews.reload}>Thử lại đánh giá</button></p>}{!reviews.busy && !reviews.error && !reviews.items.length && <p className="shop-review-empty">Chưa có đánh giá.</p>}{!reviews.busy && !reviews.error && reviews.items.map(review => <article className="shop-review" key={review._id}><div><strong>{review.reviewer?.name || 'Người mua'}</strong><span><Icon name="star" />{review.rating}/5</span></div><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time><p>{review.comment || 'Người mua chưa để lại nhận xét.'}</p></article>)}<Pager resource={{ ...reviews, page: view.reviewPage, setPage: reviewPage => update({ reviewPage }) }} /></section>}
    </>}
  </section></LocalizedContent>;
}

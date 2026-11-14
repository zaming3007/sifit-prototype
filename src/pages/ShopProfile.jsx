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
  if (!currentSellerId) {
    return (
      <div className="shop-page p-12 text-center space-y-4">
        <Icon name="storefront" className="text-4xl text-gray-300 mx-auto" />
        <p role="alert" className="text-sm text-gray-500">Đường dẫn chưa có cửa hàng. Hãy mở shop từ một sản phẩm bạn thích.</p>
        <button className="btn-primary inline-flex items-center gap-2" onClick={() => browse()}>
          <Icon name="shopping_bag" className="text-sm" />
          Khám phá sản phẩm
        </button>
      </div>
    );
  }
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

  return (
    <LocalizedContent>
      <section className="shop-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 animate-fade-in space-y-6">
        <nav className="shop-breadcrumb flex items-center gap-1.5 text-xs text-gray-500 py-2" aria-label="Đường dẫn trang shop">
          <button onClick={() => browse()} className="hover:text-primary inline-flex items-center gap-1 cursor-pointer">
            <Icon name="storefront" className="text-xs" />
            Mua sắm
          </button>
          <Icon name="chevron_right" className="text-[10px] text-gray-300" />
          <span className="font-bold text-gray-900">{shop?.shopName || 'Cửa hàng'}</span>
        </nav>

        {profile.busy && (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2" role="status">
            <Icon name="refresh" className="animate-spin text-2xl text-primary" />
            <span className="text-xs">Đang mở cửa hàng…</span>
          </div>
        )}

        {profile.error && (
          <div className="shop-empty p-12 bg-white rounded-3xl border border-gray-100 text-center flex flex-col items-center gap-3" role="alert">
            <Icon name="error" className="text-3xl text-red-500" />
            <h1 className="font-heading font-bold text-lg text-gray-900">Chưa mở được cửa hàng</h1>
            <p className="text-xs text-gray-500">{profile.error}</p>
            <button className="btn-primary text-xs py-2 px-4" onClick={() => setProfileRevision(value => value + 1)}>Thử lại</button>
          </div>
        )}

        {shop && (
          <>
            <header className={`shop-header rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-sm ${shop.coverImage ? 'has-cover' : ''}`}>
              {shop.coverImage && (
                <img
                  className="shop-cover w-full h-48 sm:h-64 object-cover"
                  src={shop.coverImage}
                  alt=""
                  onError={event => { event.currentTarget.hidden = true; }}
                />
              )}
              <div className="shop-header-body p-6 sm:p-8">
                <div className="shop-identity flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className="shop-avatar w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center relative overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                      <Icon name="storefront" className="text-3xl" />
                      {shop.avatar && (
                        <img
                          src={shop.avatar}
                          alt=""
                          className="w-full h-full object-cover absolute inset-0"
                          onError={event => { event.currentTarget.hidden = true; }}
                        />
                      )}
                    </span>
                    <div>
                      <p className="shop-eyebrow text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                        SIFIT / TỦ ĐỒ CỦA SHOP
                      </p>
                      <h1 className="font-heading font-bold text-2xl sm:text-3xl text-gray-900">{shop.shopName}</h1>
                      <p className="shop-verification inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 mt-1">
                        <Icon name={shop.verificationStatus === 'VERIFIED' ? 'verified_user' : 'storefront'} className={shop.verificationStatus === 'VERIFIED' ? 'text-primary' : 'text-gray-400'} />
                        {shop.verificationStatus === 'VERIFIED' ? 'Shop đã xác minh uy tín' : 'Shop thành viên'}
                      </p>
                    </div>
                  </div>

                  <ShopFollowButton shop={shop} />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="shop-description text-xs text-gray-600 max-w-2xl leading-relaxed">
                    {shop.description || 'Khám phá những món đồ thời trang second-hand tuyển chọn, sạch sẽ và sẵn sàng cho một hành trình mới.'}
                  </p>
                  <div className="shop-facts flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 text-amber-800 font-bold">
                      <Icon name="star" className="text-amber-400 fill text-sm" />
                      <strong>{shop.ratingAverage || 0}/5</strong> ({shop.ratingCount || 0} đánh giá)
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 text-gray-700 font-bold">
                      <Icon name="shopping_bag" className="text-gray-400 text-sm" />
                      <strong>{shop.totalSales || 0}</strong> đã bán
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <div className="shop-tabs">
              <Tabs
                value={view.tab}
                onChange={tab => update({ tab })}
                items={[
                  ['products', 'Sản phẩm đang bán', 'shopping_bag'],
                  ['reviews', 'Đánh giá từ người mua', 'star'],
                ]}
              />
            </div>

            {view.tab === 'products' && (
              <>
                <form
                  className="shop-filters bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4"
                  aria-label="Tìm và lọc sản phẩm trong shop"
                  onSubmit={event => {
                    event.preventDefault();
                    if (draft.minPrice !== '' && draft.maxPrice !== '' && Number(draft.minPrice) > Number(draft.maxPrice)) {
                      setFormError('Giá từ không được lớn hơn giá đến.');
                      return;
                    }
                    setFormError('');
                    update({ filters: { ...draft, search: draft.search.trim(), brand: draft.brand.trim() }, page: 1 });
                  }}
                >
                  <div className="shop-search-row flex flex-col sm:flex-row gap-3">
                    <label className="shop-search flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
                      <Icon name="search" className="text-gray-400 text-base flex-shrink-0" />
                      <input
                        type="search"
                        aria-label="Tìm sản phẩm trong shop"
                        maxLength="100"
                        className="bg-transparent outline-none text-xs w-full text-gray-800"
                        placeholder="Tìm tên món đồ, thương hiệu trong shop này…"
                        value={draft.search}
                        onChange={event => change('search', event.target.value)}
                      />
                    </label>
                    <button className="btn-primary py-2.5 px-5 text-xs font-bold inline-flex items-center justify-center gap-2" type="submit">
                      <Icon name="tune" className="text-sm" />
                      Áp dụng bộ lọc
                    </button>
                    <button className="btn-outline py-2.5 px-4 text-xs font-bold inline-flex items-center justify-center gap-1.5" type="button" onClick={reset}>
                      <Icon name="close" className="text-xs" />
                      Xóa lọc
                    </button>
                  </div>

                  <div className="shop-filter-fields grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Field label="Danh mục">
                      <select className="input-field text-xs py-2" value={draft.categoryId} onChange={event => change('categoryId', event.target.value)}>
                        <option value="">Tất cả danh mục</option>
                        {facets.categories.map(item => <option key={item._id} value={item._id}>{item.name} ({item.count})</option>)}
                      </select>
                    </Field>
                    <Field label="Thương hiệu">
                      <select className="input-field text-xs py-2" value={draft.brand} onChange={event => change('brand', event.target.value)}>
                        <option value="">Tất cả thương hiệu</option>
                        {facets.brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                      </select>
                    </Field>
                    <Field label="Kích cỡ">
                      <select className="input-field text-xs py-2" value={draft.size} onChange={event => change('size', event.target.value)}>
                        <option value="">Tất cả kích cỡ</option>
                        {facets.sizes.map(size => <option key={size} value={size}>{size === 'FREE_SIZE' ? 'Freesize' : size}</option>)}
                      </select>
                    </Field>
                    <Field label="Tình trạng">
                      <select className="input-field text-xs py-2" value={draft.condition} onChange={event => change('condition', event.target.value)}>
                        <option value="">Tất cả tình trạng</option>
                        {facets.conditions.map(condition => <option key={condition} value={condition}>{conditions[condition]}</option>)}
                      </select>
                    </Field>
                    <Field label="Giá từ (đ)">
                      <input className="input-field text-xs py-2" type="number" min="0" placeholder="Không giới hạn" value={draft.minPrice} onChange={event => change('minPrice', event.target.value)} />
                    </Field>
                    <Field label="Giá đến (đ)">
                      <input className="input-field text-xs py-2" type="number" min="0" placeholder="Không giới hạn" value={draft.maxPrice} onChange={event => change('maxPrice', event.target.value)} />
                    </Field>
                  </div>
                  {formError && <p className="shop-filter-error text-xs text-red-600 bg-red-50 p-2 rounded-xl" role="alert">{formError}</p>}
                </form>

                <div className="shop-results-toolbar flex items-center justify-between text-xs text-gray-500 py-3 border-b border-gray-100">
                  <p aria-live="polite">
                    {products.busy ? 'Đang tìm món đồ phù hợp…' : <><strong>{products.pagination.total || 0}</strong> sản phẩm{filtered ? ' phù hợp' : ' đang bán'}</>}
                  </p>
                  <label className="flex items-center gap-2">
                    <Icon name="sort" className="text-gray-400" />
                    <span>Sắp xếp</span>
                    <select
                      aria-label="Sắp xếp sản phẩm trong shop"
                      value={view.sort}
                      onChange={event => update({ sort: event.target.value, page: 1 })}
                      className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none"
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="oldest">Cũ nhất</option>
                      <option value="price_asc">Giá thấp đến cao</option>
                      <option value="price_desc">Giá cao đến thấp</option>
                    </select>
                  </label>
                </div>

                <div className="shop-results" aria-busy={products.busy}>
                  {products.busy && (
                    <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                      <Icon name="refresh" className="animate-spin text-sm text-primary" />
                      Đang tải sản phẩm của shop…
                    </div>
                  )}

                  {products.error && (
                    <div className="shop-empty p-12 bg-white rounded-3xl border border-gray-100 text-center flex flex-col items-center gap-3" role="alert">
                      <Icon name="refresh" className="text-3xl text-gray-400" />
                      <h2 className="font-heading font-bold text-base text-gray-900">Chưa tải được sản phẩm</h2>
                      <p className="text-xs text-gray-500">{products.error}</p>
                      <div className="flex gap-2">
                        <button className="btn-primary text-xs py-2 px-4" onClick={() => setProfileRevision(value => value + 1)}>Thử lại</button>
                        <button className="btn-outline text-xs py-2 px-4" onClick={reset}>Xóa lọc</button>
                      </div>
                    </div>
                  )}

                  {!products.busy && !products.error && !products.items.length && (
                    <div className="shop-empty p-12 bg-white rounded-3xl border border-gray-100 text-center flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <Icon name="search" className="text-2xl" />
                      </div>
                      <h2 className="font-heading font-bold text-base text-gray-900">
                        {facets.total ? 'Chưa tìm thấy món đồ phù hợp' : 'Shop chưa có sản phẩm đang mở bán'}
                      </h2>
                      <p className="text-xs text-gray-500 max-w-sm">
                        {facets.total
                          ? 'Thử một từ khóa khác hoặc bớt điều kiện lọc để khám phá thêm.'
                          : 'Bạn có thể bấm Theo dõi shop ở trên để nhận thông báo ngay khi có món đồ mới lên kệ.'}
                      </p>
                      {filtered && <button className="btn-primary text-xs py-2 px-4 mt-2" onClick={reset}>Xem toàn bộ sản phẩm</button>}
                    </div>
                  )}

                  {!products.busy && !products.error && (
                    <div className="product-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                      {products.items.map(product => (
                        <ProductCard key={product._id} product={product} />
                      ))}
                    </div>
                  )}
                </div>

                <Pager resource={{ ...products, page: view.page, setPage: page => { update({ page }); document.querySelector('.shop-results-toolbar')?.scrollIntoView({ block: 'start', behavior: 'instant' }); } }} />
              </>
            )}

            {view.tab === 'reviews' && (
              <section className="shop-reviews bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <h2 className="font-heading font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Icon name="star" className="text-amber-400 fill text-xl" />
                  Đánh giá từ người mua ({reviews.items.length})
                </h2>

                {reviews.busy && (
                  <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <Icon name="refresh" className="animate-spin text-sm text-primary" />
                    Đang tải đánh giá…
                  </div>
                )}

                {reviews.error && (
                  <p role="alert" className="text-xs text-red-600 bg-red-50 p-3 rounded-xl flex items-center justify-between">
                    <span>{reviews.error}</span>
                    <button onClick={reviews.reload} className="underline font-bold">Thử lại</button>
                  </p>
                )}

                {!reviews.busy && !reviews.error && !reviews.items.length && (
                  <p className="shop-review-empty text-xs text-gray-400 py-8 text-center">
                    Cửa hàng chưa có đánh giá nào từ người mua.
                  </p>
                )}

                {!reviews.busy && !reviews.error && (
                  <div className="space-y-4 pt-2">
                    {reviews.items.map(review => (
                      <article className="shop-review p-4 rounded-2xl bg-gray-50/70 border border-gray-100" key={review._id}>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <strong className="text-gray-900 font-bold">{review.reviewer?.name || 'Người mua ẩn danh'}</strong>
                          <span className="flex items-center gap-1 text-amber-500 font-bold">
                            <Icon name="star" className="fill text-xs" />
                            {review.rating}/5
                          </span>
                        </div>
                        <time dateTime={review.createdAt} className="text-[10px] text-gray-400 block mt-1 mb-2">
                          {new Date(review.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                        </time>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {review.comment || 'Người mua không để lại nhận xét chi tiết.'}
                        </p>
                      </article>
                    ))}
                  </div>
                )}

                <Pager resource={{ ...reviews, page: view.reviewPage, setPage: reviewPage => update({ reviewPage }) }} />
              </section>
            )}
          </>
        )}
      </section>
    </LocalizedContent>
  );
}

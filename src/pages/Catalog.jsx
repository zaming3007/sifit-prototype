import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import usePagedResource from '../hooks/usePagedResource';
import * as api from '../services/operationsService';
import { normalizeProduct, sizeFromApi, sizeToApi } from '../utils/normalizers';
import { Pager } from '../components/OperationsUI';
import ProductCard from '../components/ProductCard';
import { resolveCategoryKey } from '../components/CategoryIcon';
import Icon from '../components/Icon';
import editorial from '../image/banner/sifit-style-edits.webp';

const aliases = { dresses: ['dam', 'vay'], tops: ['ao'], pants: ['quan'], skirts: ['chan vay', 'vay'], jackets: ['ao khoac'], shoes: ['giay dep', 'giay'], bags: ['tui xach', 'tui'], clothing: ['ao', 'quan', 'vay', 'dam', 'ao khoac'], allClothing: ['ao', 'quan', 'vay', 'dam', 'ao khoac'] };
const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

export default function Catalog() {
  const { apiCategories, searchQuery, setSearchQuery, filters, setFilters, sortOption, setSortOption, browse, setCurrentView } = useApp();
  const { t, locale } = useLanguage();
  const text = (vi, en) => locale === 'vi' ? vi : en;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  useEffect(() => setSearchDraft(searchQuery), [searchQuery]);
  const toggle = (type, value) => setFilters(prev => ({ ...prev, [type]: prev[type].includes(value) ? prev[type].filter(x => x !== value) : [...prev[type], value] }));
  const [facets, setFacets] = useState({ brands: [], sizes: [] });
  const [facetError, setFacetError] = useState('');
  const [facetRevision, setFacetRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.list('/products/facets', {}, controller.signal).then(setFacets).catch(error => {
      if (!controller.signal.aborted) setFacetError(error.response?.data?.message || 'Không tải được bộ lọc.');
    });
    return () => controller.abort();
  }, [facetRevision]);

  const categoryIds = [...new Set(filters.categories.flatMap(value => apiCategories.filter(item => (item._id || item.id) === value || item.name === value || aliases[value]?.includes(normalize(item.name))).map(item => item._id || item.id)))];
  const toggleCategory = id => setFilters(previous => ({ ...previous, categories: categoryIds.includes(id) ? categoryIds.filter(value => value !== id) : [...categoryIds, id] }));
  const keyword = [searchQuery, filters.categories.includes('jeans') ? 'jeans' : '', filters.categories.includes('knitwear') ? 'len' : ''].filter(Boolean).join(' ');
  const params = { ...(keyword ? { search: keyword.slice(0, 100) } : {}), ...(categoryIds.length ? { categoryIds: JSON.stringify(categoryIds) } : {}), ...(filters.brands.length ? { brands: JSON.stringify(filters.brands) } : {}), ...(filters.sizes.length ? { sizes: JSON.stringify(filters.sizes.map(sizeToApi)) } : {}), ...(filters.condition > 0 ? { conditions: JSON.stringify([['NEW_WITH_TAGS', 100], ['LIKE_NEW', 95], ['GOOD', 85], ['FAIR', 65]].filter(([, value]) => value >= filters.condition).map(([value]) => value)) } : {}), ...(filters.material ? { material: filters.material } : {}), maxPrice: filters.priceMax, sort: sortOption === 'Giá: Thấp → Cao' ? 'price_asc' : sortOption === 'Giá: Cao → Thấp' ? 'price_desc' : 'newest' };
  const signature = JSON.stringify(params);
  const [query, setQuery] = useState(() => params);
  useEffect(() => { const timer = setTimeout(() => setQuery(JSON.parse(signature)), 250); return () => clearTimeout(timer); }, [signature]);
  const result = usePagedResource('/products', query);
  const pendingFilters = JSON.stringify(query) !== signature;
  const resource = { ...result, busy: pendingFilters || result.busy,
    items: pendingFilters ? [] : result.items,
    setPage: page => { if (!pendingFilters && !result.busy) result.setPage(page); } };
  const rawFiltered = resource.items.map(normalizeProduct);
  const filtered = [...rawFiltered].sort((a, b) => {
    const aHasImg = a.images?.length > 0 ? 1 : 0;
    const bHasImg = b.images?.length > 0 ? 1 : 0;
    if (sortOption === 'Độ mới: Cao → Thấp') {
      return (b.condition || 0) - (a.condition || 0) || bHasImg - aHasImg;
    }
    if (sortOption === 'Theo danh mục') {
      return (a.category || '').localeCompare(b.category || '', 'vi') || bHasImg - aHasImg;
    }
    if (sortOption === 'Giá: Thấp → Cao') {
      return (a.price || 0) - (b.price || 0);
    }
    if (sortOption === 'Giá: Cao → Thấp') {
      return (b.price || 0) - (a.price || 0);
    }
    // Default ("Hàng Mới Về"): prioritize products with photos first, then newest
    if (bHasImg !== aHasImg) return bHasImg - aHasImg;
    return 0;
  });

  const groupedByCategory = filtered.reduce((acc, item) => {
    const key = item.category || text('Sản phẩm khác', 'Other pieces');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const brands = [...new Set([...facets.brands, ...filters.brands])];
  const sizes = [...new Set([...facets.sizes.map(sizeFromApi), ...filters.sizes])];
  const categoryName = value => apiCategories.find(item => (item._id || item.id) === value)?.name || t(value);
  const activeFilters = [...filters.categories.map(value => [categoryName(value), () => toggle('categories', value)]), ...filters.brands.map(value => [value, () => toggle('brands', value)]), ...filters.sizes.map(value => [value, () => toggle('sizes', value)]),
    ...(filters.material ? [[t(filters.material), () => setFilters(prev => ({ ...prev, material: '' }))]] : []),
    ...(searchQuery ? [[text(`Tìm: ${searchQuery}`, `Search: ${searchQuery}`), () => setSearchQuery('')]] : []),
    ...(filters.condition > 0 ? [[text(`Độ mới từ ${filters.condition}%`, `Condition ${filters.condition}%+`), () => setFilters(prev => ({ ...prev, condition: 0 }))]] : []),
    ...(filters.priceMax < 10000000 ? [[text(`Đến ${filters.priceMax.toLocaleString('vi-VN')}₫`, `Up to ${filters.priceMax.toLocaleString('en-US')}₫`), () => setFilters(prev => ({ ...prev, priceMax: 10000000 }))]] : [])];
  const reset = () => browse();
  const search = event => { event.preventDefault(); setSearchQuery(searchDraft.trim().slice(0, 100)); };

  return (
    <section className="catalog-page catalog-store wide-container">
      {/* Breadcrumb */}
      <nav className="catalog-breadcrumb flex items-center gap-2 text-xs font-semibold text-gray-400 py-3" aria-label={text('Đường dẫn trang', 'Breadcrumb')}>
        <button onClick={() => setCurrentView('homepage')} className="hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1">
          <Icon name="storefront" className="text-xs" />
          {text('Trang chủ', 'Home')}
        </button>
        <Icon name="chevron_right" className="text-[10px] text-gray-300" />
        <span className="text-gray-800 font-bold">{text('Mua sắm', 'Shop')}</span>
      </nav>

      {/* Catalog Hero Banner */}
      <div className="catalog-hero">
        <div className="catalog-hero-copy">
          <p className="catalog-eyebrow inline-flex items-center gap-1.5">
            <Icon name="sparkles" className="text-amber-500 text-xs" />
            THE SIFIT WARDROBE / PRE-LOVED, RE-LOVED
          </p>
          <h1>{text('Tìm đúng gu.', 'Find your style.')}<br /><span>{text('Yêu thêm lần nữa.', 'Love it all over again.')}</span></h1>
          <p className="catalog-intro">{text('Từ món đồ hằng ngày đến một chút khác biệt. Tủ đồ tiếp theo của bạn bắt đầu ở đây.', 'From everyday favourites to something a little different. Your next wardrobe starts here.')}</p>
          <button
            className="catalog-budget-cta inline-flex items-center gap-2"
            aria-pressed={filters.priceMax === 500000}
            onClick={() => setFilters(prev => ({ ...prev, priceMax: prev.priceMax === 500000 ? 10000000 : 500000 }))}
          >
            <Icon name="discount" className="text-sm" />
            {text('Khám phá đồ dưới 500k', 'Explore finds under 500k')}
            <Icon name="north_east" className="text-xs" />
          </button>
        </div>
        <div className="catalog-hero-photo">
          <img src={editorial} alt={text('Cảm hứng thời trang second-hand: sơ mi, denim và váy', 'Pre-loved style inspiration: shirts, denim and dresses')} width="2172" height="724" fetchPriority="high" />
          <span>GOOD FINDS. GREAT STYLE.</span>
        </div>
      </div>

      {/* Quick Category Pills Bar */}
      {apiCategories.length > 0 && (
        <div className="catalog-category-pills" role="navigation" aria-label={text('Chọn nhanh danh mục', 'Quick categories')}>
          <button
            type="button"
            className={`catalog-category-pill ${categoryIds.length === 0 ? 'is-active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
          >
            <Icon name="grid_view" className="text-xs" />
            <span>{text('Tất cả mặt hàng', 'All items')}</span>
          </button>
          {apiCategories.map(category => {
            const id = category._id || category.id;
            const active = categoryIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`catalog-category-pill ${active ? 'is-active' : ''}`}
                onClick={() => toggleCategory(id)}
              >
                <Icon name={resolveCategoryKey(category)} className="text-xs" />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="catalog-toolbar">
        <div className="catalog-toolbar-left">
          <button
            className="catalog-filter-toggle inline-flex items-center gap-2 cursor-pointer"
            aria-label={text('Bộ lọc', 'Filters')}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filter-panel"
            onClick={() => setFiltersOpen(value => !value)}
          >
            <Icon name="tune" className="text-base text-primary" />
            {text('Bộ lọc', 'Filters')}
            {activeFilters.length > 0 && <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilters.length}</span>}
            <Icon name={filtersOpen ? 'expand_less' : 'expand_more'} className="text-xs" />
          </button>
          <p aria-live="polite" className="text-xs text-gray-500">
            {resource.busy ? text('Đang tìm sản phẩm…', 'Finding your pieces…') : <><strong>{resource.pagination.total || 0}</strong> {t('results')}</>}
          </p>
        </div>
        <div className="catalog-toolbar-right flex flex-wrap items-center gap-3">
          <div className="catalog-view-switcher" role="group" aria-label={text('Chế độ sắp xếp hiển thị', 'Display layout')}>
            <button
              type="button"
              className={viewMode === 'grid' ? 'is-active' : ''}
              onClick={() => setViewMode('grid')}
              title={text('Xem dạng lưới chuẩn', 'Standard grid view')}
            >
              <Icon name="grid_view" className="text-xs" />
              <span>{text('Lưới đều', 'Grid')}</span>
            </button>
            <button
              type="button"
              className={viewMode === 'grouped' ? 'is-active' : ''}
              onClick={() => setViewMode('grouped')}
              title={text('Nhóm theo từng loại mặt hàng', 'Group by category')}
            >
              <Icon name="checkroom" className="text-xs" />
              <span>{text('Theo loại đồ', 'By category')}</span>
            </button>
          </div>
          <div className="catalog-sort flex items-center gap-2">
            <Icon name="sort" className="text-xs text-gray-400" />
            <label htmlFor="catalog-sort" className="text-xs text-gray-500 font-medium">{text('Sắp xếp', 'Sort by')}</label>
            <select id="catalog-sort" aria-label={t('newest')} value={sortOption} onChange={e => setSortOption(e.target.value)}>
              <option value="Hàng Mới Về">{t('newest')}</option>
              <option value="Độ mới: Cao → Thấp">{text('Độ mới: Cao → Thấp', 'Condition: High → Low')}</option>
              <option value="Theo danh mục">{text('Theo danh mục (A → Z)', 'By Category (A → Z)')}</option>
              <option value="Giá: Thấp → Cao">{t('priceLow')}</option>
              <option value="Giá: Cao → Thấp">{t('priceHigh')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="catalog-layout">
        {/* Filter Sidebar */}
        <aside id="catalog-filter-panel" className={`catalog-filters ${filtersOpen ? 'is-open' : ''}`} aria-label={text('Bộ lọc sản phẩm', 'Product filters')}>
          <div className="catalog-filter-title">
            <span className="flex items-center gap-2">
              <Icon name="tune" className="text-primary text-base" />
              {text('Lọc theo gu', 'Find your fit')}
            </span>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-primary cursor-pointer">{t('clear')}</button>
          </div>

          <form className="catalog-search-form" role="search" onSubmit={search}>
            <label htmlFor="catalog-search" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <Icon name="search" className="text-xs text-gray-400" />
              {text('Bạn đang tìm gì?', 'What are you looking for?')}
            </label>
            <div>
              <input
                id="catalog-search"
                type="search"
                maxLength={100}
                value={searchDraft}
                placeholder={text('Tên món đồ, thương hiệu…', 'Piece, brand…')}
                onChange={event => setSearchDraft(event.target.value)}
              />
              <button type="submit" aria-label={text('Tìm trong cửa hàng', 'Search the shop')}>
                <Icon name="search" />
              </button>
            </div>
          </form>

          {/* Categories */}
          <div className="filter-heading flex items-center gap-2">
            <Icon name="checkroom" className="text-xs text-primary" />
            <h2>{t('categories')}</h2>
          </div>
          <div className="category-filters">
            {apiCategories.map(category => {
              const id = category._id || category.id;
              return (
                <label key={id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={categoryIds.includes(id)} onChange={() => toggleCategory(id)} />
                  <Icon name={resolveCategoryKey(category)} className="text-sm text-primary flex-shrink-0" />
                  <span>{category.name}</span>
                </label>
              );
            })}
          </div>

          {facetError && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
              {facetError}{' '}
              <button onClick={() => { setFacetError(''); setFacetRevision(value => value + 1); }} className="underline font-bold">
                {text('Thử lại', 'Retry')}
              </button>
            </p>
          )}

          {/* Brands */}
          <details open>
            <summary className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider text-gray-700">
              <Icon name="sell" className="text-xs text-gray-400" />
              {t('brands')}
            </summary>
            <div className="brand-filters mt-2">
              {brands.map(brand => (
                <label key={brand} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" checked={filters.brands.includes(brand)} onChange={() => toggle('brands', brand)} />
                  {brand}
                </label>
              ))}
              {!brands.length && <p className="catalog-facet-note text-xs text-gray-400">{text('Chưa có thương hiệu để lọc.', 'No brands available yet.')}</p>}
            </div>
          </details>

          {/* Sizes */}
          <details open>
            <summary className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider text-gray-700">
              <Icon name="tune" className="text-xs text-gray-400" />
              {t('sizes')}
            </summary>
            <div className="size-filters mt-2 flex flex-wrap gap-1.5">
              {sizes.map(size => (
                <button
                  key={size}
                  aria-pressed={filters.sizes.includes(size)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-all cursor-pointer ${
                    filters.sizes.includes(size) ? 'bg-primary text-white border-primary shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggle('sizes', size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </details>

          {/* Condition range */}
          <div className="range-filter">
            <label htmlFor="condition-filter" className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">
                <Icon name="sparkles" className="text-xs text-amber-500" />
                {t('condition')}
              </span>
              <span className="text-primary font-extrabold">{filters.condition}%+</span>
            </label>
            <input id="condition-filter" type="range" min="0" max="100" step="5" value={filters.condition} onChange={e => setFilters(prev => ({ ...prev, condition: Number(e.target.value) }))} />
            <p className="text-[11px] text-gray-400 mt-1">{text('Dựa trên tình trạng người bán mô tả.', 'Based on condition described by the seller.')}</p>
          </div>

          {/* Price range */}
          <div className="range-filter">
            <label htmlFor="price-filter" className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">
                <Icon name="payments" className="text-xs text-emerald-600" />
                {t('price')}
              </span>
              <span className="text-primary font-extrabold">{filters.priceMax.toLocaleString('vi-VN')} ₫</span>
            </label>
            <input id="price-filter" type="range" min="0" max="10000000" step="100000" value={filters.priceMax} onChange={e => setFilters(prev => ({ ...prev, priceMax: Number(e.target.value) }))} />
            <div className="catalog-price-presets flex gap-1.5 mt-2">
              {[200000, 500000, 1000000].map(price => (
                <button
                  key={price}
                  aria-pressed={filters.priceMax === price}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                    filters.priceMax === price ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
                  }`}
                  onClick={() => setFilters(prev => ({ ...prev, priceMax: price }))}
                >
                  {price / 1000}k
                </button>
              ))}
            </div>
          </div>

          <button
            className="catalog-apply-mobile inline-flex items-center justify-center gap-2"
            onClick={() => {
              setFiltersOpen(false);
              requestAnimationFrame(() => document.querySelector('.catalog-toolbar')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
            }}
          >
            {text('Xem sản phẩm', 'See the pieces')}
            <Icon name="arrow_forward" className="text-sm" />
          </button>
        </aside>

        {/* Results grid */}
        <div className="catalog-results" aria-busy={resource.busy}>
          {activeFilters.length > 0 && (
            <div className="active-filters flex flex-wrap items-center gap-2 mb-4" aria-label={text('Bộ lọc đang áp dụng', 'Applied filters')}>
              {activeFilters.map(([label, remove], index) => (
                <button
                  key={`${label}-${index}`}
                  aria-label={text(`Bỏ bộ lọc: ${label}`, `Remove filter: ${label}`)}
                  onClick={remove}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:border-red-300 hover:text-red-600 transition-colors cursor-pointer shadow-xs"
                >
                  {label}
                  <Icon name="close" className="text-xs" />
                </button>
              ))}
              <button className="catalog-clear-all text-xs font-bold text-primary hover:underline ml-1 cursor-pointer" onClick={reset}>
                {t('clear')}
              </button>
            </div>
          )}

          {resource.busy && (
            <>
              <p role="status" className="catalog-loading-label flex items-center gap-2 text-xs text-gray-500 mb-4">
                <Icon name="refresh" className="animate-spin text-sm text-primary" />
                {text('Đang tìm những món đồ hợp gu…', 'Finding pieces for your style…')}
              </p>
              <div className="product-grid catalog-skeleton-grid" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <div className="catalog-skeleton" key={index}><div /><span /><span /></div>
                ))}
              </div>
            </>
          )}

          {resource.error && (
            <div className="catalog-empty-state text-center py-16" role="alert">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
                <Icon name="refresh" className="text-2xl" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{text('Chưa mở được tủ đồ.', 'The wardrobe couldn’t load.')}</h2>
              <p className="text-xs text-gray-500 mt-1 mb-4">{resource.error}</p>
              <button className="sf-button inline-flex items-center gap-2" onClick={resource.reload}>
                {text('Thử tải lại sản phẩm', 'Try again')}
                <Icon name="arrow_forward" className="text-sm" />
              </button>
            </div>
          )}

          {!resource.busy && !resource.error && !filtered.length && (
            <div className="catalog-empty-state text-center py-16">
              <div className="w-14 h-14 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <Icon name="search" className="text-2xl" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{text('Chưa tìm thấy món đồ phù hợp.', 'No matching pieces just yet.')}</h2>
              <p className="text-xs text-gray-500 mt-1 mb-4 max-w-md mx-auto leading-relaxed">
                {text('Thử bớt bộ lọc hoặc một từ khóa khác. Biết đâu món đồ bạn thích đang chờ ở danh mục bên cạnh.', 'Try fewer filters or a different keyword. Your next favourite could be one category away.')}
              </p>
              <button className="sf-button inline-flex items-center gap-2" onClick={reset}>
                {text('Khám phá lại tủ đồ', 'Explore all pieces')}
                <Icon name="arrow_forward" className="text-sm" />
              </button>
            </div>
          )}

          {!resource.busy && !resource.error && filtered.length > 0 && (
            viewMode === 'grouped' ? (
              <div className="catalog-grouped-sections space-y-8">
                {Object.entries(groupedByCategory).map(([catLabel, items]) => (
                  <section key={catLabel} className="catalog-group-block">
                    <header className="catalog-group-header">
                      <div className="inline-flex items-center gap-2">
                        <span className="catalog-group-icon">
                          <Icon name={resolveCategoryKey(catLabel)} className="text-sm" />
                        </span>
                        <h3 className="font-heading font-bold text-base">{catLabel}</h3>
                      </div>
                      <span className="catalog-group-count">
                        {items.length} {text('mặt hàng', 'items')}
                      </span>
                    </header>
                    <div className="product-grid">
                      {items.map(product => (
                        <ProductCard key={product._id} product={product} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="product-grid">
                {filtered.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )
          )}

          <Pager resource={resource} />

          <div className="catalog-bottom-note flex items-center gap-2 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-800 mt-8">
            <Icon name="eco" className="text-emerald-600 text-base flex-shrink-0" />
            <span>{text('Mỗi món đồ là một câu chuyện. Xem kỹ tình trạng và trò chuyện với người bán trước khi mua.', 'Every piece has a story. Check its condition and chat with the seller before buying.')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

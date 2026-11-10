import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import usePagedResource from '../hooks/usePagedResource';
import * as api from '../services/operationsService';
import { normalizeProduct, sizeFromApi, sizeToApi } from '../utils/normalizers';
import { Pager } from '../components/OperationsUI';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import editorial from '../image/banner/sifit-style-edits.webp';

const aliases = { dresses: ['dam', 'vay'], tops: ['ao'], pants: ['quan'], skirts: ['chan vay', 'vay'], jackets: ['ao khoac'], shoes: ['giay dep', 'giay'], bags: ['tui xach', 'tui'], clothing: ['ao', 'quan', 'vay', 'dam', 'ao khoac'], allClothing: ['ao', 'quan', 'vay', 'dam', 'ao khoac'] };
const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

export default function Catalog() {
  const { apiCategories, searchQuery, setSearchQuery, filters, setFilters, sortOption, setSortOption, browse, setCurrentView } = useApp();
  const { t, locale } = useLanguage();
  const text = (vi, en) => locale === 'vi' ? vi : en;
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const filtered = resource.items.map(normalizeProduct);
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

  return <section className="catalog-page catalog-store wide-container">
    <nav className="catalog-breadcrumb" aria-label={text('Đường dẫn trang', 'Breadcrumb')}><button onClick={() => setCurrentView('homepage')}>{text('Trang chủ', 'Home')}</button><span aria-hidden="true">/</span><span>{text('Mua sắm', 'Shop')}</span></nav>
    <div className="catalog-hero"><div className="catalog-hero-copy"><p className="catalog-eyebrow">THE SIFIT WARDROBE / PRE-LOVED, RE-LOVED</p><h1>{text('Tìm đúng gu.', 'Find your style.')}<br /><span>{text('Yêu thêm lần nữa.', 'Love it all over again.')}</span></h1><p className="catalog-intro">{text('Từ món đồ hằng ngày đến một chút khác biệt. Tủ đồ tiếp theo của bạn bắt đầu ở đây.', 'From everyday favourites to something a little different. Your next wardrobe starts here.')}</p><button className="catalog-budget-cta" aria-pressed={filters.priceMax === 500000} onClick={() => setFilters(prev => ({ ...prev, priceMax: prev.priceMax === 500000 ? 10000000 : 500000 }))}>{text('Khám phá đồ dưới 500k', 'Explore finds under 500k')}<Icon name="north_east" /></button></div><div className="catalog-hero-photo"><img src={editorial} alt={text('Cảm hứng thời trang second-hand: sơ mi, denim và váy', 'Pre-loved style inspiration: shirts, denim and dresses')} width="2172" height="724" fetchPriority="high" /><span>GOOD FINDS. GREAT STYLE.</span></div></div>
    <div className="catalog-toolbar"><div className="catalog-toolbar-left"><button className="catalog-filter-toggle" aria-label={text('Bộ lọc', 'Filters')} aria-expanded={filtersOpen} aria-controls="catalog-filter-panel" onClick={() => setFiltersOpen(value => !value)}><Icon name="settings" />{text('Bộ lọc', 'Filters')}{activeFilters.length > 0 && <span>{activeFilters.length}</span>}<Icon name="expand_more" /></button><p aria-live="polite">{resource.busy ? text('Đang tìm sản phẩm…', 'Finding your pieces…') : <><strong>{resource.pagination.total || 0}</strong> {t('results')}</>}</p></div><div className="catalog-sort"><label htmlFor="catalog-sort">{text('Sắp xếp', 'Sort by')}</label><select id="catalog-sort" aria-label={t('newest')} value={sortOption} onChange={e => setSortOption(e.target.value)}><option value="Hàng Mới Về">{t('newest')}</option><option value="Giá: Thấp → Cao">{t('priceLow')}</option><option value="Giá: Cao → Thấp">{t('priceHigh')}</option></select></div></div>
    <div className="catalog-layout"><aside id="catalog-filter-panel" className={`catalog-filters ${filtersOpen ? 'is-open' : ''}`} aria-label={text('Bộ lọc sản phẩm', 'Product filters')}>
      <div className="catalog-filter-title"><span><Icon name="settings" />{text('Lọc theo gu', 'Find your fit')}</span><button onClick={reset}>{t('clear')}</button></div>
      <form className="catalog-search-form" role="search" onSubmit={search}><label htmlFor="catalog-search">{text('Bạn đang tìm gì?', 'What are you looking for?')}</label><div><input id="catalog-search" type="search" maxLength={100} value={searchDraft} placeholder={text('Tên món đồ, thương hiệu…', 'Piece, brand…')} onChange={event => setSearchDraft(event.target.value)} /><button type="submit" aria-label={text('Tìm trong cửa hàng', 'Search the shop')}><Icon name="search" /></button></div></form>
      <div className="filter-heading"><h2>{t('categories')}</h2></div><div className="category-filters">{apiCategories.map(category => { const id = category._id || category.id; return <label key={id}><input type="checkbox" checked={categoryIds.includes(id)} onChange={() => toggleCategory(id)} />{category.name}</label>; })}</div>
      {facetError && <p role="alert">{facetError} <button onClick={() => { setFacetError(''); setFacetRevision(value => value + 1); }}>{text('Thử lại bộ lọc', 'Retry filters')}</button></p>}
      <details open><summary>{t('brands')}</summary><div className="brand-filters">{brands.map(brand => <label key={brand}><input type="checkbox" checked={filters.brands.includes(brand)} onChange={() => toggle('brands', brand)} />{brand}</label>)}{!brands.length && <p className="catalog-facet-note">{text('Chưa có thương hiệu để lọc.', 'No brands available yet.')}</p>}</div></details>
      <details open><summary>{t('sizes')}</summary><div className="size-filters">{sizes.map(size => <button key={size} aria-pressed={filters.sizes.includes(size)} className={filters.sizes.includes(size) ? 'selected' : ''} onClick={() => toggle('sizes', size)}>{size}</button>)}</div></details>
      <div className="range-filter"><label htmlFor="condition-filter">{t('condition')}<span>{filters.condition}%+</span></label><input id="condition-filter" type="range" min="0" max="100" step="5" value={filters.condition} onChange={e => setFilters(prev => ({ ...prev, condition: Number(e.target.value) }))} /><p>{text('Dựa trên tình trạng người bán mô tả.', 'Based on the condition described by the seller.')}</p></div>
      <div className="range-filter"><label htmlFor="price-filter">{t('price')}<span>{filters.priceMax.toLocaleString('vi-VN')} ₫</span></label><input id="price-filter" type="range" min="0" max="10000000" step="100000" value={filters.priceMax} onChange={e => setFilters(prev => ({ ...prev, priceMax: Number(e.target.value) }))} /><div className="catalog-price-presets">{[200000, 500000, 1000000].map(price => <button key={price} aria-pressed={filters.priceMax === price} onClick={() => setFilters(prev => ({ ...prev, priceMax: price }))}>{price / 1000}k</button>)}</div></div>
      <button className="catalog-apply-mobile" onClick={() => { setFiltersOpen(false); requestAnimationFrame(() => document.querySelector('.catalog-toolbar')?.scrollIntoView({ block: 'start', behavior: 'instant' })); }}>{text('Xem sản phẩm', 'See the pieces')}<Icon name="arrow_forward" /></button>
    </aside><div className="catalog-results" aria-busy={resource.busy}>
      {activeFilters.length > 0 && <div className="active-filters" aria-label={text('Bộ lọc đang áp dụng', 'Applied filters')}>{activeFilters.map(([label, remove], index) => <button key={`${label}-${index}`} aria-label={text(`Bỏ bộ lọc: ${label}`, `Remove filter: ${label}`)} onClick={remove}>{label}<Icon name="close" /></button>)}<button className="catalog-clear-all" onClick={reset}>{t('clear')}</button></div>}
      {resource.busy && <><p role="status" className="catalog-loading-label">{text('Đang tìm những món đồ hợp gu…', 'Finding pieces for your style…')}</p><div className="product-grid catalog-skeleton-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className="catalog-skeleton" key={index}><div /><span /><span /></div>)}</div></>}
      {resource.error && <div className="catalog-empty-state" role="alert"><Icon name="refresh" /><h2>{text('Chưa mở được tủ đồ.', 'The wardrobe couldn’t load.')}</h2><p>{resource.error}</p><button className="sf-button" onClick={resource.reload}>{text('Thử tải lại sản phẩm', 'Try again')}<Icon name="arrow_forward" /></button></div>}
      {!resource.busy && !resource.error && !filtered.length && <div className="catalog-empty-state"><Icon name="search" /><h2>{text('Chưa tìm thấy món đồ phù hợp.', 'No matching pieces just yet.')}</h2><p>{text('Thử bớt bộ lọc hoặc một từ khóa khác. Biết đâu món đồ bạn thích đang chờ ở danh mục bên cạnh.', 'Try fewer filters or a different keyword. Your next favourite could be one category away.')}</p><button className="sf-button" onClick={reset}>{text('Khám phá lại tủ đồ', 'Explore all pieces')}<Icon name="arrow_forward" /></button></div>}
      {!resource.busy && !resource.error && <div className="product-grid">{filtered.map(product => <ProductCard key={product._id} product={product} />)}</div>}
      <Pager resource={resource} /><div className="catalog-bottom-note"><Icon name="eco" /><span>{text('Mỗi món đồ là một câu chuyện. Xem kỹ tình trạng và trò chuyện với người bán trước khi mua.', 'Every piece has a story. Check its condition and chat with the seller before buying.')}</span></div>
    </div></div>
  </section>;
}

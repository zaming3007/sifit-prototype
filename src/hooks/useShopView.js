import { useCallback, useEffect, useState } from 'react';

const fields = { search: 'shopSearch', categoryId: 'shopCategory', brand: 'shopBrand', size: 'shopSize', condition: 'shopCondition', minPrice: 'shopMin', maxPrice: 'shopMax' };
export const emptyShopFilters = { search: '', categoryId: '', brand: '', size: '', condition: '', minPrice: '', maxPrice: '' };
const pageOf = value => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 100000 ? Number(value) : 1;
const read = () => {
  const query = new URLSearchParams(window.location.search);
  return { filters: Object.fromEntries(Object.entries(fields).map(([key, param]) => [key, query.get(param) || ''])),
    page: pageOf(query.get('shopPage')), reviewPage: pageOf(query.get('shopReviewPage')),
    sort: ['newest', 'oldest', 'price_asc', 'price_desc'].includes(query.get('shopSort')) ? query.get('shopSort') : 'newest',
    tab: query.get('shopTab') === 'reviews' ? 'reviews' : 'products' };
};
export default function useShopView(sellerId) {
  const [view, setView] = useState(read);
  useEffect(() => {
    const pop = () => { const query = new URLSearchParams(window.location.search); if (query.get('view') === 'shop' && query.get('sellerId') === sellerId) setView(read()); };
    window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop);
  }, [sellerId]);
  const update = useCallback((patch, replace = false) => {
    const next = { ...view, ...patch }; setView(next);
    const url = new URL(window.location.href); url.searchParams.set('view', 'shop'); url.searchParams.set('sellerId', sellerId);
    const values = { ...Object.fromEntries(Object.entries(fields).map(([key, param]) => [param, next.filters[key]])),
      shopPage: next.page > 1 ? next.page : '', shopReviewPage: next.reviewPage > 1 ? next.reviewPage : '',
      shopSort: next.sort === 'newest' ? '' : next.sort, shopTab: next.tab === 'reviews' ? 'reviews' : '' };
    for (const [param, value] of Object.entries(values)) { if (value !== '') url.searchParams.set(param, value); else url.searchParams.delete(param); }
    window.history[replace ? 'replaceState' : 'pushState']({ view: 'shop' }, '', url);
  }, [sellerId, view]);
  return [view, update];
}

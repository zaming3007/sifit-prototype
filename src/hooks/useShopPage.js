import { useCallback, useEffect, useState } from 'react';
import * as sellers from '../services/sellerService';
import * as reviews from '../services/reviewService';
import { getApiErrorMessage } from '../utils/errorHandler';
export default function useShopPage(slug, kind, params, enabled) {
  const signature = JSON.stringify(params); const key = `${slug}:${kind}:${signature}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: '', items: [], facets: null, pagination: {}, busy: true, error: '' });
  useEffect(() => {
    if (!slug || !enabled) return;
    const controller = new AbortController(); setState(previous => ({ ...previous, busy: true, error: '' }));
    const request = kind === 'products' ? sellers.getShop : reviews.listShopRatings;
    request(slug, JSON.parse(signature), controller.signal).then(result => {
      if (!controller.signal.aborted) setState({ ...result, key, items: result.products || result.items || [], busy: false, error: '' });
    }).catch(error => { if (!controller.signal.aborted) setState(previous => ({ ...previous, key, items: [], pagination: {}, busy: false, error: getApiErrorMessage(error) })); });
    return () => controller.abort();
  }, [slug, kind, key, signature, enabled, revision]);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const stale = state.key !== key;
  return { ...state, items: stale ? [] : state.items, pagination: stale ? {} : state.pagination,
    busy: Boolean(slug && enabled && (stale || state.busy)), reload };
}

import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../services/shopFollowService';
import { useAction } from '../hooks/useAction';
import { getApiErrorMessage } from '../utils/errorHandler';
import Icon from './Icon';
import ShopNotificationToggle from './ShopNotificationToggle';

export default function ShopFollowButton({ shop }) {
  const { user, openAuth } = useApp();
  const [state, setState] = useState({ following: false, notifyNewProducts: true, followerCount: 0 });
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(''); const [revision, setRevision] = useState(0); const [notice, setNotice] = useState('');
  const { busy, error, run } = useAction();
  const id = shop.id || shop._id;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError(''); setNotice('');
    const request = user?.role === 'buyer' ? api.getState(id, controller.signal) : api.count(id, controller.signal);
    request.then(result => { if (!controller.signal.aborted) setState({ following: false, notifyNewProducts: true, ...result }); }).catch(cause => { if (!controller.signal.aborted) setLoadError(getApiErrorMessage(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, user?._id, user?.role, revision]);
  return <div className="shop-follow-controls"><span className="shop-follower-count">{loading ? 'Đang tải lượt theo dõi…' : `${state.followerCount} người theo dõi`}</span>
    {(!user || user.role === 'buyer') && <><button className={`shop-follow-button ${state.following ? 'is-following' : ''}`} disabled={busy || loading || !!loadError} aria-pressed={state.following} onClick={() => {
      if (!user) { openAuth(); return; }
      run(async () => { const next = await (state.following ? api.unfollow(id) : api.follow(id)); setState(next); setNotice(next.following ? 'Đã theo dõi cửa hàng.' : 'Đã bỏ theo dõi cửa hàng.'); });
    }}><Icon name={state.following ? 'task_alt' : 'add'} />{state.following ? 'Đang theo dõi' : 'Theo dõi shop'}</button>
      {state.following && <ShopNotificationToggle shopId={id} enabled={state.notifyNewProducts} disabled={busy || loading} label="Thông báo sản phẩm mới của shop" onSaved={next => { setState(next); setNotice(next.notifyNewProducts ? 'Đã bật thông báo cho shop.' : 'Đã tắt thông báo cho shop.'); }} />}
    </>}
    {(error || loadError) && <p role="alert">{error || loadError}</p>}{loadError && <button onClick={() => setRevision(value => value + 1)}>Thử tải lại theo dõi</button>}{notice && <p className="shop-follow-notice" role="status">{notice}</p>}
  </div>;
}

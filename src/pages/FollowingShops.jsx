import { useState } from 'react';
import { useApp } from '../context/AppContext';
import usePagedResource from '../hooks/usePagedResource';
import { useAction } from '../hooks/useAction';
import BuyerHeading from '../components/BuyerHeading';
import { Feedback, Tabs } from '../components/MarketplaceUI';
import { Pager } from '../components/OperationsUI';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import ShopNotificationToggle from '../components/ShopNotificationToggle';
import { normalizeProduct } from '../utils/normalizers';
import { idOf } from '../utils/marketplace';
import * as api from '../services/shopFollowService';

export default function FollowingShops() {
  const { viewShopProfile, browse } = useApp();
  const [tab, setTab] = useState('products'); const [notice, setNotice] = useState(''); const { busy, error, run } = useAction();
  const shops = usePagedResource(tab === 'shops' ? '/shop-follows/my' : null);
  const products = usePagedResource(tab === 'products' ? '/shop-follows/products' : null);
  const resource = tab === 'shops' ? shops : products;
  return <div className="member-page following-page"><BuyerHeading title="Shop đang theo dõi" description="Những cửa hàng hợp gu, những món đồ mới dành cho bạn."><button className="member-secondary" disabled={busy || resource.busy} onClick={resource.reload}><Icon name="refresh" />Làm mới</button></BuyerHeading>
    <Tabs disabled={busy} value={tab} onChange={setTab} items={[[ 'products', 'Sản phẩm từ shop đã theo dõi' ], ['shops', 'Danh sách shop' ]]} />
    <Feedback busy={busy || resource.busy} error={error || resource.error} />{notice && <p className="following-notice" role="status">{notice}</p>}
    {!resource.busy && !resource.error && !resource.items.length && <div className="following-empty"><Icon name="storefront" /><h2>{tab === 'shops' ? 'Theo dõi shop đầu tiên của bạn' : 'Chưa có món đồ mới từ các shop bạn theo dõi'}</h2><p>Mở trang shop từ một sản phẩm bạn thích và chọn Theo dõi shop. Sản phẩm đang bán sẽ xuất hiện tại đây.</p><button className="member-primary" onClick={() => browse()}>Khám phá sản phẩm</button></div>}
    {tab === 'products' ? <div className="product-grid">{products.items.map(item => <div className="following-product" key={item._id}><ProductCard product={normalizeProduct(item)} /><button className="following-shop-link" onClick={() => viewShopProfile(idOf(item.shop.userId))}>{item.shop.shopName}<Icon name="arrow_forward" /></button></div>)}</div>
      : <div className="following-shop-grid">{shops.items.map(item => <article className="following-shop-card" key={item.id}><div className="following-shop-card-top">{item.shop?.avatar ? <img src={item.shop.avatar} alt="" /> : <span className="following-shop-avatar"><Icon name="storefront" /></span>}<div><h2>{item.shop?.shopName || 'Cửa hàng không còn khả dụng'}</h2><p>{item.available ? item.shop?.verificationStatus === 'VERIFIED' ? 'Shop đã xác minh' : 'Đang hoạt động' : 'Cửa hàng tạm ngưng hoặc không còn khả dụng'}</p></div></div><p className="following-shop-description">{item.shop?.description || 'Khám phá những món đồ được cửa hàng chọn lọc.'}</p>
        <ShopNotificationToggle shopId={idOf(item.shopId)} enabled={item.notifyNewProducts} disabled={busy} onSaved={next => { setNotice(next.notifyNewProducts ? 'Đã bật thông báo của cửa hàng.' : 'Đã tắt thông báo của cửa hàng.'); shops.reload(); }} />
        <div className="following-shop-actions"><button className="member-primary" disabled={!item.available || busy} onClick={() => viewShopProfile(idOf(item.shop.userId))}>Xem shop <Icon name="arrow_forward" /></button><button className="member-secondary" disabled={busy} onClick={() => run(async () => { await api.unfollow(idOf(item.shopId)); setNotice('Đã bỏ theo dõi cửa hàng.'); shops.reload(); })}>Bỏ theo dõi</button></div>
      </article>)}</div>}
    <Pager resource={resource} />
  </div>;
}

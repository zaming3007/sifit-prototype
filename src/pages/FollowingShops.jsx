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
  const [tab, setTab] = useState('products');
  const [notice, setNotice] = useState('');
  const { busy, error, run } = useAction();
  const shops = usePagedResource(tab === 'shops' ? '/shop-follows/my' : null);
  const products = usePagedResource(tab === 'products' ? '/shop-follows/products' : null);
  const resource = tab === 'shops' ? shops : products;

  return (
    <div className="member-page following-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 animate-fade-in space-y-6">
      <BuyerHeading
        title="Shop đang theo dõi"
        description="Những tủ đồ bạn quan tâm, cập nhật sản phẩm mới ngay khi người bán lên kệ."
      >
        <button className="member-secondary inline-flex items-center gap-1.5" disabled={busy || resource.busy} onClick={resource.reload}>
          <Icon name="refresh" className={`text-xs ${busy || resource.busy ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </BuyerHeading>

      <Tabs
        disabled={busy}
        value={tab}
        onChange={setTab}
        items={[
          ['products', 'Món đồ mới từ shop đã theo dõi'],
          ['shops', 'Danh sách các shop đã theo dõi'],
        ]}
      />

      <Feedback busy={busy || resource.busy} error={error || resource.error} />
      {notice && (
        <p className="following-notice p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-100" role="status">
          <Icon name="task_alt" className="text-emerald-600 text-sm" />
          {notice}
        </p>
      )}

      {!resource.busy && !resource.error && !resource.items.length && (
        <div className="following-empty flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Icon name="storefront" className="text-3xl" />
          </div>
          <h2 className="font-heading font-bold text-lg text-gray-900">
            {tab === 'shops' ? 'Theo dõi cửa hàng đầu tiên của bạn' : 'Chưa có món đồ mới từ các shop bạn theo dõi'}
          </h2>
          <p className="text-xs text-gray-500 max-w-sm">
            Mở trang chi tiết sản phẩm và chọn Theo dõi shop để không bỏ lỡ những món đồ 2hand tuyển chọn hợp gu.
          </p>
          <button className="btn-primary mt-2 inline-flex items-center gap-2" onClick={() => browse()}>
            <Icon name="shopping_bag" className="text-sm" />
            Khám phá sản phẩm
          </button>
        </div>
      )}

      {tab === 'products' ? (
        <div className="product-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.items.map(item => (
            <div className="following-product flex flex-col gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs" key={item._id}>
              <ProductCard product={normalizeProduct(item)} />
              <button
                className="following-shop-link text-xs font-bold text-gray-700 hover:text-primary pt-2 border-t border-gray-100 flex items-center justify-between cursor-pointer"
                onClick={() => viewShopProfile(idOf(item.shop.userId))}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Icon name="storefront" className="text-xs text-gray-400" />
                  {item.shop.shopName}
                </span>
                <Icon name="arrow_forward" className="text-xs text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="following-shop-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.items.map(item => (
            <article className="following-shop-card bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between gap-4" key={item.id}>
              <div>
                <div className="following-shop-card-top flex items-center gap-3.5 mb-3">
                  {item.shop?.avatar ? (
                    <img src={item.shop.avatar} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-xs" />
                  ) : (
                    <span className="following-shop-avatar w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Icon name="storefront" className="text-xl" />
                    </span>
                  )}
                  <div>
                    <h2 className="font-heading font-bold text-base text-gray-900 flex items-center gap-1.5">
                      {item.shop?.shopName || 'Cửa hàng không còn khả dụng'}
                      {item.shop?.verificationStatus === 'VERIFIED' && <Icon name="verified_user" className="text-primary text-xs" />}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {item.available
                        ? item.shop?.verificationStatus === 'VERIFIED'
                          ? 'Shop đã xác minh uy tín'
                          : 'Đang hoạt động'
                        : 'Tạm ngưng hoạt động'}
                    </p>
                  </div>
                </div>
                <p className="following-shop-description text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {item.shop?.description || 'Khám phá những món đồ thời trang tuyển chọn được bảo quản kỹ lưỡng.'}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-3">
                <ShopNotificationToggle
                  shopId={idOf(item.shopId)}
                  enabled={item.notifyNewProducts}
                  disabled={busy}
                  onSaved={next => {
                    setNotice(next.notifyNewProducts ? 'Đã bật thông báo khi shop có đồ mới.' : 'Đã tắt thông báo của cửa hàng.');
                    shops.reload();
                  }}
                />
                <div className="following-shop-actions flex gap-2">
                  <button
                    className="btn-primary flex-1 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    disabled={!item.available || busy}
                    onClick={() => viewShopProfile(idOf(item.shop.userId))}
                  >
                    Xem shop <Icon name="arrow_forward" className="text-xs" />
                  </button>
                  <button
                    className="btn-outline py-2 px-3 text-xs font-bold inline-flex items-center justify-center gap-1 text-gray-600"
                    disabled={busy}
                    onClick={() => run(async () => {
                      await api.unfollow(idOf(item.shopId));
                      setNotice('Đã bỏ theo dõi cửa hàng.');
                      shops.reload();
                    })}
                  >
                    Bỏ theo dõi
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pager resource={resource} />
    </div>
  );
}

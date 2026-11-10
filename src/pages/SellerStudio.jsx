import { OverdueOrders, RecoveryPanel } from './AdminOperations';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import LocalizedContent from '../components/LocalizedContent';
import AddressBook from '../components/AddressBook';
import OrderCard from '../components/OrderCard';
import { Panel, Field, Feedback } from '../components/MarketplaceUI';
import Icon from '../components/Icon';
import SellerOperations from './SellerOperations';
import OffersPage from './OffersPage';
import { useAction } from '../hooks/useAction';
import { money, idOf } from '../utils/marketplace';

import * as productService from '../services/productService';
import * as sellerService from '../services/sellerService';
import * as addressService from '../services/addressService';
import SellerVerificationPanel from '../components/SellerVerificationPanel';
import { verificationLabels } from '../utils/sellerVerification';
import { collectPages } from '../services/pagination';

const empty = { title: '', description: '', price: '', categoryId: '', size: 'M', brand: '', condition: 85, color: '' };
const sections = {
  overview: ['Kênh người bán', 'Theo dõi hoạt động cửa hàng và những việc cần làm, ở cùng một nơi.'],
  listings: ['Quản lý sản phẩm', 'Quản lý những món đồ trong shop, cập nhật bản nháp và gửi duyệt.'],
  add: ['Đăng sản phẩm', 'Chia sẻ hình ảnh và thông tin để món đồ tìm được chủ nhân tiếp theo.'],
  orders: ['Quản lý đơn bán', 'Theo dõi đơn hàng, chuẩn bị đóng gói và quản lý giao hàng.'],
  offers: ['Đề nghị giá', 'Xem giá người mua đề xuất và phản hồi từng đề nghị.'],
  profile: ['Hồ sơ shop', 'Giới thiệu cửa hàng của bạn và cập nhật thông tin liên hệ.'],
  addresses: ['Địa chỉ lấy hàng', 'Quản lý địa chỉ để việc giao hàng thuận tiện hơn.'],
  shipments: ['Vận chuyển', 'Theo dõi các vận đơn của cửa hàng.'],
  disputes: ['Khiếu nại', 'Theo dõi tiến độ và kết quả xử lý khiếu nại.'],
  reviews: ['Đánh giá', 'Lắng nghe khách hàng và phản hồi đánh giá sản phẩm.'],
  payouts: ['Chi trả', 'Xem chi tiết các đợt chi trả cho cửa hàng.'],
};
const productStatuses = { active: 'Đang bán', pending: 'Chờ duyệt', draft: 'Bản nháp', rejected: 'Bị từ chối', reserved: 'Đang giữ chỗ', sold: 'Đã bán', archived: 'Đã lưu trữ' };
const orderStatuses = { PENDING_PAYMENT: 'Chờ thanh toán', PAID: 'Đã thanh toán', PROCESSING: 'Đang chuẩn bị', SHIPPED: 'Đang giao', DELIVERED: 'Đã giao', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền', REFUND_PENDING: 'Chờ hoàn tiền' };
import SellerBankAccount from '../components/SellerBankAccount';
export default function SellerStudio({ tab = 'overview', setTab }) {
  const { apiCategories, fetchListings } = useApp();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ shopName: '', description: '', contactPhone: '', avatar: '' });
  const [earnings, setEarnings] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [savedProduct, setSavedProduct] = useState(null);
  const { busy, error, run } = useAction();
  const [notice, setNotice] = useState('');
  const refreshProducts = useCallback(async () => setProducts((await collectPages(productService.listMyProducts)).items), []);
  const refreshOrders = useCallback(async () => setOrders((await collectPages(sellerService.listSellerOrders)).items), []);
  const loadProfile = useCallback(async () => {
    try {
      const data = await sellerService.getSellerProfile(); setProfile(data);
      setProfileForm({ shopName: data.shopName, description: data.description || '', contactPhone: data.contactPhone || '', avatar: data.avatar || '' });
    } catch (error) { if (error.response?.status !== 404) throw error; }
  }, []);
  const reload = useCallback(async () => {
    const results = await Promise.allSettled([refreshProducts(), refreshOrders(), loadProfile(),
      sellerService.getEarnings().then(setEarnings), collectPages(sellerService.listPayouts).then(data => setPayouts(data.items)),
      addressService.listAddresses().then(setAddresses)]);
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  }, [loadProfile, refreshProducts, refreshOrders]);
  useEffect(() => { run(reload); }, [run, reload]);
  const newDraft = () => {
    setEditing(null); setForm(empty); setFiles([]); setSavedProduct(null); setNotice(''); setTab('add');
  };
  const edit = product => {
    setEditing(product._id); setSavedProduct(product); setFiles([]);
    setForm({ title: product.title, description: product.description, price: product.price, categoryId: product.categoryId,
      size: product.size, brand: product.brand, condition: product.condition, color: product.color });
    setNotice(''); setTab('add');
  };
  const save = event => {
    event.preventDefault(); setNotice('');
    run(async () => {
      let product = editing ? await productService.updateProduct(editing, form) : await productService.createProduct(form);
      // Keep the created id if uploading fails, so retry updates this draft.
      setEditing(product._id); setSavedProduct(product);
      if (files.length) {
        product = await productService.uploadImages(product._id, files);
        setSavedProduct(product); setFiles([]);
      }
      await refreshProducts(); setNotice('Đã lưu bản nháp. Chọn Gửi duyệt khi sản phẩm đã có ảnh.');
    });
  };
  const submit = product => run(async () => { await productService.submitProduct(product._id); await refreshProducts(); setNotice('Đã gửi sản phẩm để kiểm duyệt.'); setTab('listings'); });
  return <LocalizedContent><div className="seller-studio" data-section={tab}>
    <div className="seller-page-heading"><div><p className="seller-eyebrow">SIFIT / SELLER STUDIO</p><h1>{sections[tab][0]}</h1><p>{sections[tab][1]}</p></div><div className="seller-page-heading-actions">{tab === 'overview' && <><button className="seller-secondary-button" disabled={busy} onClick={() => run(reload)}><Icon name="refresh" />Làm mới</button><button className="seller-primary-button" disabled={busy} onClick={newDraft}><Icon name="add_box" />Tạo sản phẩm mới</button></>}</div></div>
    <Feedback busy={busy} error={error} />{notice && <p role="status" className="p-3 bg-green-50 rounded-xl">{notice}</p>}
    {tab === 'payouts' && <><SellerBankAccount /><RecoveryPanel /></>}
    {tab === 'offers' && <OffersPage embedded />}
    {['shipments', 'disputes', 'reviews', 'payouts'].includes(tab) && <SellerOperations key={tab} section={tab} />}
    {tab === 'overview' && <>
      <div className="seller-section-caption"><h2>Hiệu quả kinh doanh</h2><span>Toàn bộ thời gian</span></div>
      <div className="seller-stat-grid">{[
        ['Doanh số đã thanh toán', 'totalCompletedSales', 'payments', 'Tổng tiền hàng đã được thanh toán'],
        ['Tiền đơn chưa hoàn thành', 'pendingProceeds', 'schedule', 'Các đơn đang trong quá trình xử lý'],
        ['Tiền đơn đã hoàn thành', 'eligibleProceeds', 'task_alt', 'Chưa phải số dư có thể rút'],
        ['Đã chi trả', 'paidProceeds', 'account_balance_wallet', 'Số tiền đã chi trả cho cửa hàng'],
      ].map(([label, key, icon, hint], index) => <section className={`seller-stat-card ${index === 0 ? 'seller-stat-featured' : ''}`} key={key}><div><span>{label}</span><span className="seller-stat-icon"><Icon name={icon} /></span></div><strong>{earnings ? money(earnings[key]) : '—'}</strong><p>{hint}</p></section>)}</div>
      <div className="seller-dashboard-columns"><section className="seller-dashboard-panel"><div className="seller-panel-heading"><div><h2>Tủ đồ của shop</h2><p>Tình trạng sản phẩm hiện tại</p></div><span className="seller-count-badge">{products.length} sản phẩm</span></div><div className="seller-inventory-status">{['active', 'pending', 'draft', 'sold'].map(status => { const count = products.filter(product => product.status === status).length; return <div key={status}><div><span><i className={`seller-status-dot status-${status}`} />{productStatuses[status]}</span><strong>{count}</strong></div><progress value={count} max={Math.max(products.length, 1)} aria-label={productStatuses[status]} /></div>; })}</div><button className="seller-panel-link" onClick={() => setTab('listings')}>Quản lý tủ đồ<Icon name="arrow_forward" /></button></section>
        <section className="seller-dashboard-panel"><div className="seller-panel-heading"><div><h2>Đối soát & chi trả</h2><p>Minh bạch từng khoản thu</p></div><span className="seller-panel-icon"><Icon name="account_balance_wallet" /></span></div><dl className="seller-finance-summary"><div><dt>Hoa hồng</dt><dd>{earnings ? money(earnings.totalCommissions) : '—'}</dd></div><div><dt>Hoa hồng hoàn/đảo</dt><dd>{earnings ? money(earnings.refundedOrReversedAmounts) : '—'}</dd></div><div><dt>Đợt chi trả</dt><dd>{payouts.length}</dd></div></dl><p className="seller-finance-note"><Icon name="verified_user" />Chi trả phụ thuộc xác minh shop, thời hạn bảo vệ người mua và thời gian giữ tiền.</p><button className="seller-panel-link" onClick={() => setTab('profile')}>Kiểm tra hồ sơ shop<Icon name="arrow_forward" /></button></section></div>
      <section className="seller-dashboard-panel seller-recent-orders"><div className="seller-panel-heading"><div><h2>Đơn bán gần đây</h2><p>Cập nhật từ hoạt động thực tế của cửa hàng</p></div><button className="seller-panel-link" onClick={() => setTab('orders')}>Xem đơn bán<Icon name="arrow_forward" /></button></div>{!orders.length ? <div className="seller-empty-state"><span><Icon name="receipt_long" /></span><h3>Chưa có đơn bán</h3><p>Đơn hàng mới sẽ xuất hiện tại đây khi có người đặt mua.</p></div> : <div className="seller-table-wrap"><table><thead><tr><th>Đơn hàng</th><th>Người mua</th><th>Ngày đặt</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead><tbody>{orders.slice(0, 5).map(order => <tr key={order._id}><td>#{order._id.slice(-8)}</td><td>{order.buyer?.name || 'Người mua'}</td><td>{new Date(order.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td>{money(order.totalAmount)}</td><td><span className="seller-status-badge">{orderStatuses[order.orderStatus] || order.orderStatus}</span></td></tr>)}</tbody></table></div>}</section>
      <section className="seller-dashboard-panel"><div className="seller-panel-heading"><div><h2>Lịch sử chi trả</h2><p>Theo dõi các khoản chi trả cho shop</p></div></div>{!payouts.length && <p className="seller-muted-copy">Chưa có đợt chi trả. Các khoản chi trả sẽ được hiển thị tại đây.</p>}{payouts.map(item => <div className="seller-payout-row" key={idOf(item)}><strong>{money(item.amount)}</strong><span className="seller-status-badge">{item.status}</span><span>{item.provider}</span></div>)}</section>
    </>}
    {tab === 'listings' && <Panel title={`Sản phẩm của tôi (${products.length})`}><div className="seller-listing-actions"><button className="seller-secondary-button" disabled={busy} onClick={() => run(refreshProducts)}><Icon name="refresh" />Làm mới</button><button className="seller-primary-button" disabled={busy} onClick={newDraft}><Icon name="add_box" />Đăng món đồ mới</button></div>{!products.length && <div className="seller-empty-state"><span><Icon name="inventory_2" /></span><h3>Tủ đồ của bạn đang trống</h3><p>Bắt đầu bằng cách đăng món đồ đầu tiên.</p></div>}{products.map(product => <div key={product._id} className="seller-product-row">
      <div className="seller-product-thumbnail"><Icon name="image" />{product.images[0] && <img src={product.images[0]} alt="" onError={event => { event.currentTarget.hidden = true; }} />}</div><div className="seller-product-description"><p className="font-bold">{product.title}</p><p className="seller-product-price">{money(product.price)} <span className={`seller-status-badge status-${product.status}`}>{productStatuses[product.status] || product.status}</span></p>{product.rejectionReason && <p className="text-red-600">{product.rejectionReason}</p>}</div>
      {['draft', 'rejected'].includes(product.status) && <><button disabled={busy} onClick={() => edit(product)}>Sửa / quản lý ảnh</button><button disabled={busy} onClick={() => submit(product)}>Gửi duyệt</button></>}
      {!['reserved', 'sold'].includes(product.status) && <button disabled={busy} onClick={() => run(async () => { await productService.deleteProduct(product._id); await refreshProducts(); await fetchListings(); })}>Xóa</button>}
    </div>)}</Panel>}
    {tab === 'add' && <Panel title={editing ? 'Chỉnh sửa bản nháp' : 'Tạo sản phẩm'}>
      <button className="seller-secondary-button" disabled={busy} onClick={newDraft}>Tạo bản nháp khác</button>
      <form onSubmit={save} className="space-y-4 max-w-2xl">
        <Field label="Tên sản phẩm"><input className="input-field" required minLength="5" maxLength="150" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="Mô tả, chất liệu và lỗi sản phẩm"><textarea className="input-field" required maxLength="5000" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></Field>
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Giá bán (VND)"><input className="input-field" type="number" required min="1" step="1" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} /></Field>
        <Field label="Danh mục"><select className="input-field" required value={form.categoryId || ''} onChange={event => setForm({ ...form, categoryId: event.target.value })}><option value="">Chọn danh mục</option>{apiCategories.map(item => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></Field>
        <Field label="Kích thước"><select className="input-field" value={form.size} onChange={event => setForm({ ...form, size: event.target.value })}>{['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Freesize'].map(value => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Tình trạng"><select className="input-field" value={form.condition} onChange={event => setForm({ ...form, condition: Number(event.target.value) })}>{[[100, 'Mới có nhãn'], [95, 'Như mới'], [85, 'Tốt'], [65, 'Đã qua sử dụng nhiều']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        {['brand', 'color'].map(key => <Field key={key} label={key === 'brand' ? 'Thương hiệu' : 'Màu sắc'}><input className="input-field" value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></Field>)}</div>
        <Field label="Ảnh JPEG, PNG hoặc WebP (tối đa 8 ảnh, 5 MB mỗi ảnh)"><input key={`${editing}-${savedProduct?.images.length || 0}`} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => setFiles([...event.target.files])} /></Field>
        <button disabled={busy} className="btn-primary">Lưu bản nháp và tải ảnh</button>
      </form>
      {savedProduct && <div className="space-y-3"><div className="flex flex-wrap gap-3">{savedProduct.imageAssets.map(asset => <div key={asset.publicId}><img src={asset.url} alt="" className="w-24 h-24 object-cover rounded-xl" /><button disabled={busy} onClick={() => run(async () => { setSavedProduct(await productService.deleteImage(savedProduct._id, asset.publicId)); await refreshProducts(); })}>Xóa ảnh</button></div>)}</div><button disabled={busy || !savedProduct.images.length} onClick={() => submit(savedProduct)}>Gửi bản đã lưu để duyệt</button></div>}
    </Panel>}
    {tab === 'orders' && <OverdueOrders />}
    {tab === 'orders' && <div className="seller-orders-list space-y-4"><div className="seller-orders-toolbar"><span><strong>{orders.length}</strong> đơn bán</span><button className="seller-secondary-button" disabled={busy} onClick={() => run(refreshOrders)}><Icon name="refresh" />Làm mới đơn bán</button></div>{!orders.length && <div className="seller-empty-state"><span><Icon name="receipt_long" /></span><h3>Chưa có đơn bán.</h3><p>Đơn hàng của khách sẽ xuất hiện tại đây.</p></div>}{orders.map(order => <OrderCard key={order._id} order={order} seller addresses={addresses} onChange={refreshOrders} />)}</div>}
    {tab === 'addresses' && <AddressBook onChange={setAddresses} />}
    {tab === 'profile' && <Panel title="Hồ sơ shop"><p>Trạng thái xác minh: {verificationLabels[profile?.verificationStatus] || 'Chưa tạo shop'}</p><form className="space-y-3 max-w-xl" onSubmit={event => { event.preventDefault(); run(async () => {
      const payload = { shopName: profileForm.shopName, description: profileForm.description, ...(profileForm.contactPhone ? { contactPhone: profileForm.contactPhone } : {}), ...(profileForm.avatar ? { avatar: profileForm.avatar } : {}) };
      if (profile) await sellerService.updateSellerProfile(payload); else await sellerService.createSellerProfile(payload);
      await loadProfile(); setNotice('Đã lưu hồ sơ shop.');
    }); }}>{[['Tên shop', 'shopName'], ['Mô tả', 'description'], ['Điện thoại liên hệ', 'contactPhone'], ['URL ảnh đại diện', 'avatar']].map(([label, key]) => <Field key={key} label={label}><input className="input-field" required={key === 'shopName'} minLength={key === 'shopName' ? 3 : undefined} type={key === 'avatar' ? 'url' : 'text'} value={profileForm[key]} onChange={event => setProfileForm({ ...profileForm, [key]: event.target.value })} /></Field>)}<button disabled={busy} className="btn-primary">Lưu hồ sơ shop</button></form>
      {profile && <SellerVerificationPanel onChange={loadProfile} />}
    </Panel>}
  </div></LocalizedContent>;
}

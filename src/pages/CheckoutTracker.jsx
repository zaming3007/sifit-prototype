import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import LocalizedContent from '../components/LocalizedContent';
import AddressBook from '../components/AddressBook';
import OrderCard from '../components/OrderCard';
import Icon from '../components/Icon';
import BuyerHeading from '../components/BuyerHeading';
import '../checkout.css';
import { Panel, Tabs, Feedback, Field } from '../components/MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { money, idOf } from '../utils/marketplace';

import * as addressService from '../services/addressService';
import * as disputeService from '../services/disputeService';
import * as authService from '../services/authService';
import * as paymentService from '../services/paymentService';
import PaymentPanel from '../components/PaymentPanel';
import { getApiErrorMessage } from '../utils/errorHandler';
import { collectPages } from '../services/pagination';
import * as offerService from '../services/offerService';

const emptyAddress = { recipientName: '', phone: '', addressLine: '', ward: '', city: '' };
export default function CheckoutTracker({ historyOnly = false }) {
  const { user, cart, removeFromCart, orders, createOrder, fetchOrders, checkoutProduct, setCheckoutProduct, logoutUser, browse, openResource } = useApp();
  const [tab, setTab] = useState(!historyOnly && (checkoutProduct || cart.length) ? 'checkout' : 'orders');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const deliveryAddresses = addresses.filter(item => item.addressType !== 'PICKUP');
  const selectedAddress = deliveryAddresses.find(item => idOf(item) === selectedAddressId)
    || deliveryAddresses.find(item => item.isDefault) || deliveryAddresses[0];
  const shipping = selectedAddress ? { ...selectedAddress, city: selectedAddress.province } : emptyAddress;
  const [disputes, setDisputes] = useState([]);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const { busy, error, run } = useAction();
  const attempt = useRef(null);
  const [created, setCreated] = useState(null);
  const [checkoutPayment, setCheckoutPayment] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [acceptedOffers, setAcceptedOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState('');
  const [offerRevision, setOfferRevision] = useState(0);
  const [ignoredOffers, setIgnoredOffers] = useState([]);
  const [offerNow, setOfferNow] = useState(Date.now());
  const cartSignature = cart.map(item => item._id).sort().join(',');
  useEffect(() => {
    if (user.role !== 'buyer' || !cartSignature) { setAcceptedOffers([]); setOffersLoading(false); return; }
    let live = true; setOffersLoading(true); setOffersError('');
    collectPages(params => offerService.listMyOffers({ ...params, status: 'ACCEPTED' })).then(result => {
      if (live) { setAcceptedOffers(result.items); setOffersLoading(false); }
    }).catch(cause => { if (live) { setOffersError(getApiErrorMessage(cause)); setOffersLoading(false); } });
    return () => { live = false; };
  }, [cartSignature, user.role, offerRevision]);
  useEffect(() => {
    const timer = setInterval(() => setOfferNow(Date.now()), 15000);
    const refresh = () => setOfferRevision(value => value + 1);
    window.addEventListener('sifit:notifications', refresh);
    return () => { clearInterval(timer); window.removeEventListener('sifit:notifications', refresh); };
  }, []);
  const offerFor = item => acceptedOffers.find(offer => idOf(offer.productId) === item._id);
  const applies = offer => offer && !ignoredOffers.includes(idOf(offer));
  const selectedOffers = cart.map(offerFor).filter(applies);
  const invalidOffer = selectedOffers.some(offer => !offer.actionable || new Date(offer.expiresAt).getTime() <= offerNow);
  const priceFor = item => applies(offerFor(item)) ? offerFor(item).amount : item.price;
  const subtotal = cart.reduce((sum, item) => sum + priceFor(item), 0);
  useEffect(() => { run(async () => {
    const data = await addressService.listAddresses(); setAddresses(data);
  }); }, [run]);
  useEffect(() => {
    if (tab === 'disputes') run(async () => setDisputes((await collectPages(disputeService.listMyDisputes)).items));
  }, [tab, run]);
  const placeOrder = event => {
    event.preventDefault();
    run(async () => {
      if (!selectedAddress) throw new Error('Vui lòng thêm địa chỉ nhận hàng trước khi đặt hàng.');
      if (offersLoading || offersError || invalidOffer) throw new Error('Vui lòng kiểm tra lại đề nghị giá trước khi đặt hàng.');
      const address = Object.fromEntries(Object.keys(emptyAddress).map(key => [key, shipping[key]]));
      const offerIds = selectedOffers.map(idOf).sort();
      const fingerprint = JSON.stringify({ products: cart.map(item => item._id).sort(), address, offerIds });
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
      const result = await createOrder({ shippingAddress: address, idempotencyKey: attempt.current.key, offerIds });
      if (!result.success) throw new Error(result.message);
      setCreated(result.data); setCheckoutProduct(null); setTab('orders');
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        setPaymentError('Đơn thử nghiệm đã được lưu. Bản giới thiệu chưa mở thanh toán; không cần chuyển tiền.');
        return;
      }
      try { setCheckoutPayment(await paymentService.createPayment({ checkoutGroupId: idOf(result.data), idempotencyKey: crypto.randomUUID() })); setPaymentError(''); }
      catch (cause) { setPaymentError(getApiErrorMessage(cause)); }
    });
  };
  return <LocalizedContent><div className={tab === 'checkout' ? 'checkout-page' : !historyOnly ? 'member-page member-orders' : 'max-w-5xl mx-auto px-4 py-8 space-y-5'}>
    {historyOnly && <h1 className="font-heading text-3xl font-bold">Đơn mua trước đây</h1>}
    <Tabs disabled={busy} value={tab} onChange={setTab} items={historyOnly ? [['orders', 'Đơn mua'], ['disputes', 'Khiếu nại']] : [[ 'checkout', `Giỏ hàng (${cart.length})` ], ['orders', 'Đơn mua'], ['disputes', 'Khiếu nại']]} />
    <Feedback error={error} busy={busy} />
    {tab === 'checkout' && <>
      <div className="checkout-heading"><div><p className="checkout-eyebrow">SIFIT / MUA SẮM</p><h1>Giỏ hàng của bạn</h1></div><span className="checkout-count">{cart.length} sản phẩm</span></div>
      {offersLoading && cart.length > 0 && <p role="status" className="checkout-offer-feedback">Đang kiểm tra giá đã thống nhất…</p>}
      {offersError && <p role="alert" className="checkout-offer-feedback">Chưa kiểm tra được đề nghị giá. {offersError}<button onClick={() => setOfferRevision(value => value + 1)}>Thử lại giá đề nghị</button></p>}
      {invalidOffer && <p role="alert" className="offer-warning">Đề nghị đã hết hạn hoặc sản phẩm thay đổi. Hãy kiểm tra lại; bạn có thể bỏ chọn giá đề nghị nếu muốn mua theo giá niêm yết.</p>}
      {cart.length === 0 ? <section className="checkout-empty"><span className="checkout-empty-icon"><Icon name="shopping_bag" /></span><h2>Giỏ hàng trống.</h2><p>Khám phá tủ đồ và chọn món đồ bạn yêu thích.</p><button type="button" onClick={() => browse()}>Khám phá sản phẩm <Icon name="arrow_forward" /></button></section> : <form onSubmit={placeOrder} className="checkout-grid">
        <div className="checkout-main">
          <section className="checkout-card" aria-labelledby="cart-products-title"><div className="checkout-card-heading"><h2 id="cart-products-title">Sản phẩm đã chọn</h2><Icon name="shopping_bag" /></div>
            <div className="checkout-products">{cart.map(item => <div key={item._id} className="checkout-product">
              <div className="checkout-product-image">{item.images[0] ? <img src={item.images[0]} alt={item.title} /> : <Icon name="image" />}</div>
              <div className="checkout-product-info"><p className="checkout-product-title">{item.title}</p><p className="checkout-product-price">{applies(offerFor(item)) && <span className="checkout-offer-original">{money(item.price)}</span>}{money(priceFor(item))}</p>{offerFor(item) && <label className="checkout-offer-choice"><input type="checkbox" disabled={busy || offersLoading} checked={Boolean(applies(offerFor(item)))} onChange={event => { const id = idOf(offerFor(item)); setIgnoredOffers(previous => event.target.checked ? previous.filter(value => value !== id) : [...previous, id]); }} /><span>Áp dụng giá đã thống nhất: {money(offerFor(item).amount)} · Bắt đầu đặt trước {new Date(offerFor(item).expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span></label>}{!item.available && <p className="checkout-unavailable">Sản phẩm không còn khả dụng</p>}</div>
              <button type="button" className="checkout-remove" disabled={busy} onClick={() => removeFromCart(item._id)}><Icon name="close" />Xóa</button>
            </div>)}</div>
          </section>
          <section className="checkout-card checkout-delivery" aria-labelledby="cart-delivery-title"><div className="checkout-card-heading"><h2 id="cart-delivery-title">Địa chỉ nhận hàng</h2><Icon name="location_on" /></div>
            {deliveryAddresses.length ? <><Field label="Chọn địa chỉ đã lưu"><select className="input-field" value={idOf(selectedAddress)} onChange={event => setSelectedAddressId(event.target.value)}>{deliveryAddresses.map(item => <option key={idOf(item)} value={idOf(item)}>{item.label}</option>)}</select></Field>
              <div className="checkout-address"><span className="checkout-address-marker"><Icon name="location_on" /></span><div><p className="checkout-recipient">{shipping.recipientName} · {shipping.phone}</p><p className="checkout-address-line">{shipping.addressLine}, {shipping.ward}, {shipping.city}</p></div></div></> : <p className="checkout-address-missing">Chưa có địa chỉ nhận hàng. Hãy thêm địa chỉ trước khi đặt hàng.</p>}
            <button type="button" className="checkout-address-link" disabled={busy} onClick={() => setTab('addresses')}>Thêm / quản lý địa chỉ <Icon name="arrow_forward" /></button>
          </section>
        </div>
        <aside className="checkout-summary checkout-card" aria-labelledby="cart-summary-title"><div className="checkout-card-heading"><h2 id="cart-summary-title">Tóm tắt đơn hàng</h2><Icon name="receipt_long" /></div>
          <dl className="checkout-totals"><div><dt>Số lượng</dt><dd>{cart.length} sản phẩm</dd></div><div><dt>Tiền hàng</dt><dd>{money(subtotal)}</dd></div><div><dt>Phí giao hàng</dt><dd className="checkout-fee-note">Xác nhận khi tạo đơn</dd></div></dl>
          <div className="checkout-total"><span>Tiền hàng dự kiến</span><strong>{money(subtotal)}</strong></div>
          <p className="checkout-summary-note">QR thu tiền hàng. Người bán đặt ship và thanh toán phí trực tiếp với đơn vị vận chuyển.</p>
          <button className="checkout-place-order" disabled={busy || offersLoading || Boolean(offersError) || invalidOffer || !selectedAddress || cart.some(item => !item.available)}>Đặt hàng ({cart.length} sản phẩm)<Icon name="arrow_forward" /></button>
          <p className="checkout-payment-note"><Icon name="receipt_long" /><span>Tạo đơn để nhận QR thanh toán. Người bán đặt và thanh toán phí vận chuyển trực tiếp.</span></p>
        </aside>
      </form>}
    </>}
    {tab === 'orders' && <div className="member-order-list space-y-4">
      {!historyOnly && <BuyerHeading title="Đơn mua" description="Theo dõi và quản lý những món đồ bạn đã đặt."><button disabled={busy} className="member-secondary" onClick={() => run(fetchOrders)}><Icon name="refresh" />Làm mới đơn mua</button></BuyerHeading>}
      {created && <p role="status" className="p-3 bg-green-50 rounded-xl">Đã tạo đơn hàng. Tổng thanh toán: {money(created.buyerTotal)}. Theo dõi kết quả thanh toán bên dưới.</p>}
      {paymentError && <p role="alert">Đơn đã được lưu. {paymentError} Bạn có thể bấm Thanh toán bên dưới để thử lại.</p>}
      {checkoutPayment && <PaymentPanel payment={checkoutPayment} onUpdate={setCheckoutPayment} onConfirmed={fetchOrders} />}
      {historyOnly && <button disabled={busy} onClick={() => run(fetchOrders)}>Làm mới đơn mua</button>}
      {!orders.length && <div className="member-empty"><Icon name="receipt_long" /><p>Chưa có đơn mua.</p></div>}
      {orders.map(order => <OrderCard key={order._id} order={order} onChange={fetchOrders} />)}
    </div>}
    {tab === 'addresses' && <AddressBook onChange={setAddresses} />}
    {tab === 'disputes' && <Panel title="Khiếu nại của tôi">{!disputes.length && <p>Chưa có khiếu nại.</p>}{disputes.map(item => <div key={idOf(item)} className="border-b py-3"><p>Đơn {idOf(item.orderId)} · {item.status}</p><p>{item.reason}: {item.description}</p>{item.resolution && <p>{item.resolution}</p>}<button onClick={() => openResource('DISPUTE', idOf(item))}>Bằng chứng, phản hồi và trả hàng</button></div>)}</Panel>}
    {tab === 'profile' && <Panel title="Thông tin tài khoản"><p>{user.name} · {user.email}</p><p>Thông tin tài khoản hiện chỉ có thể xem. Bạn có thể quản lý địa chỉ nhận hàng và hồ sơ shop riêng.</p><form className="space-y-3 max-w-lg" onSubmit={event => { event.preventDefault(); run(async () => { await authService.changePassword(passwords); await logoutUser(); }); }}><h3>Đổi mật khẩu</h3><Field label="Mật khẩu hiện tại"><input className="input-field" type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={event => setPasswords({ ...passwords, currentPassword: event.target.value })} /></Field><Field label="Mật khẩu mới (ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt)"><input className="input-field" type="password" autoComplete="new-password" required minLength="8" value={passwords.newPassword} onChange={event => setPasswords({ ...passwords, newPassword: event.target.value })} /></Field><button className="btn-primary" disabled={busy}>Đổi mật khẩu và đăng xuất</button></form></Panel>}
  </div></LocalizedContent>;
}

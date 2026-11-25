import { useCallback, useEffect, useRef, useState } from 'react';
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
import { forgetCheckoutPayment, readCheckoutPayment, rememberCheckoutPayment } from '../utils/paymentSession';

import * as addressService from '../services/addressService';
import * as authService from '../services/authService';
import * as paymentService from '../services/paymentService';
import PaymentPanel from '../components/PaymentPanel';
import { getApiErrorMessage } from '../utils/errorHandler';
import { collectPages } from '../services/pagination';
import * as offerService from '../services/offerService';

const emptyAddress = { recipientName: '', phone: '', addressLine: '', ward: '', city: '' };
const resumablePaymentStatuses = ['INITIATED', 'PENDING', 'SUCCEEDED'];

export default function CheckoutTracker({ historyOnly = false }) {
  const { user, cart, removeFromCart, orders, createOrder, fetchOrders, checkoutProduct, setCheckoutProduct, logoutUser, browse } = useApp();
  const userId = idOf(user);
  const [tab, setTab] = useState(() =>
    !historyOnly && !readCheckoutPayment(userId) && (checkoutProduct || cart.length) ? 'checkout' : 'orders',
  );
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const deliveryAddresses = addresses.filter(item => item.addressType !== 'PICKUP');
  const selectedAddress = deliveryAddresses.find(item => idOf(item) === selectedAddressId)
    || deliveryAddresses.find(item => item.isDefault) || deliveryAddresses[0];
  const shipping = selectedAddress ? { ...selectedAddress, city: selectedAddress.province } : emptyAddress;
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const { busy, error, run } = useAction();
  const attempt = useRef(null);
  const [checkoutPayment, setCheckoutPayment] = useState(null);
  const paymentSection = useRef(null);
  const paymentKeys = useRef(new Map());
  const paymentRequest = useRef(0);
  const paymentOpening = useRef(false);
  const [paymentError, setPaymentError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [acceptedOffers, setAcceptedOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState('');
  const [offerRevision, setOfferRevision] = useState(0);
  const [ignoredOffers, setIgnoredOffers] = useState([]);
  const [offerNow, setOfferNow] = useState(Date.now());
  const cartSignature = cart.map(item => item._id).sort().join(',');

  useEffect(() => {
    if (!['buyer', 'seller'].includes(user.role) || !cartSignature) { setAcceptedOffers([]); setOffersLoading(false); return; }
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

  useEffect(() => {
    run(async () => {
      const data = await addressService.listAddresses();
      setAddresses(data);
    });
  }, [run]);

  const openPayment = useCallback(async groupId => {
    const request = ++paymentRequest.current;
    paymentOpening.current = true;
    if (!paymentKeys.current.has(groupId)) paymentKeys.current.set(groupId, crypto.randomUUID());
    try {
      const payment = await paymentService.createPayment({ checkoutGroupId: groupId, idempotencyKey: paymentKeys.current.get(groupId) });
      if (request !== paymentRequest.current) return;
      if (payment.provider === 'payos' && resumablePaymentStatuses.includes(payment.status)) {
        rememberCheckoutPayment(userId, idOf(payment));
      }
      setCheckoutPayment(payment);
      setPaymentError('');
      setRestoreError('');
    } finally {
      if (request === paymentRequest.current) paymentOpening.current = false;
    }
  }, [userId]);
  const updateCheckoutPayment = useCallback(next => {
    if (['FAILED', 'EXPIRED'].includes(next.status)) paymentKeys.current.delete(idOf(next.checkoutGroupId));
    if (!resumablePaymentStatuses.includes(next.status)) forgetCheckoutPayment(userId, idOf(next));
    setCheckoutPayment(current => idOf(current) === idOf(next) ? next : current);
  }, [userId]);
  const viewPayment = useCallback(() => {
    const section = paymentSection.current;
    if (!section) return;
    const { top, bottom } = section.getBoundingClientRect();
    if (top < 170 || bottom > window.innerHeight) section.scrollIntoView({ block: 'start' });
  }, []);
  const paymentId = idOf(checkoutPayment);
  useEffect(() => {
    if (tab !== 'orders' || paymentId || paymentOpening.current || import.meta.env.VITE_DEMO_MODE === 'true') return;
    const id = readCheckoutPayment(userId);
    if (!id) return;
    const request = paymentRequest.current;
    const controller = new AbortController();
    setRestoreError('');
    paymentService.getPayment(id, { signal: controller.signal }).then(payment => {
      if (controller.signal.aborted || request !== paymentRequest.current) return;
      if (!resumablePaymentStatuses.includes(payment.status)) forgetCheckoutPayment(userId, id);
      setCheckoutPayment(payment);
      if (!['INITIATED', 'PENDING'].includes(payment.status)) fetchOrders().catch(() => {});
    }).catch(cause => {
      if (controller.signal.aborted || request !== paymentRequest.current) return;
      if ([403, 404].includes(cause.response?.status)) forgetCheckoutPayment(userId, id);
      else setRestoreError(getApiErrorMessage(cause));
    });
    return () => controller.abort();
  }, [tab, paymentId, userId, restoreAttempt, fetchOrders]);
  useEffect(() => {
    if (paymentId && tab === 'orders') viewPayment();
  }, [paymentId, tab, viewPayment]);

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
      setCheckoutProduct(null); setTab('orders');
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        setPaymentError('Đơn thử nghiệm đã được lưu. Bản giới thiệu chưa mở thanh toán; không cần chuyển tiền.');
        return;
      }
      try {
        await openPayment(idOf(result.data));
      } catch (cause) {
        setPaymentError(getApiErrorMessage(cause));
      }
    });
  };

  return (
    <LocalizedContent>
      <div className={tab === 'checkout' ? 'checkout-page' : !historyOnly ? 'member-page member-orders' : 'max-w-5xl mx-auto px-4 py-8 space-y-6'}>
        {historyOnly && (
          <div className="flex items-center gap-3">
            <Icon name="history" className="text-3xl text-primary" />
            <h1 className="font-heading text-3xl font-bold">Lịch Sử Mua Hàng</h1>
          </div>
        )}

        <Tabs
          disabled={busy}
          value={tab}
          onChange={setTab}
          items={
            historyOnly
              ? [
                  ['orders', 'Đơn mua', 'receipt_long'],
                ]
              : [
                  ['checkout', `Giỏ hàng (${cart.length})`, 'shopping_bag'],
                  ['orders', 'Đơn mua', 'receipt_long'],
                ]
          }
        />

        <Feedback error={error} busy={busy} />

        {tab === 'checkout' && (
          <>
            <div className="checkout-heading flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div>
                <p className="checkout-eyebrow text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Icon name="shopping_bag" className="text-xs" />
                  SIFIT / GIỎ HÀNG
                </p>
                <h1 className="font-heading font-black text-2xl sm:text-3xl text-gray-900 mt-1">Giỏ Hàng Của Bạn</h1>
              </div>
              <span className="checkout-count bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                {cart.length} món đồ
              </span>
            </div>

            {offersLoading && cart.length > 0 && (
              <p role="status" className="checkout-offer-feedback flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium">
                <Icon name="refresh" className="animate-spin text-sm" />
                Đang kiểm tra mức giá đã thống nhất cùng người bán…
              </p>
            )}

            {offersError && (
              <p role="alert" className="checkout-offer-feedback flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium">
                <Icon name="error" className="text-sm text-red-500" />
                Chưa kiểm tra được đề nghị giá. {offersError}
                <button onClick={() => setOfferRevision(value => value + 1)} className="underline font-bold ml-2">Thử lại</button>
              </p>
            )}

            {invalidOffer && (
              <p role="alert" className="offer-warning flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-xl text-xs font-medium border border-amber-200">
                <Icon name="warning" className="text-sm text-amber-600 flex-shrink-0" />
                Đề nghị đã hết hạn hoặc sản phẩm thay đổi. Hãy kiểm tra lại; bạn có thể bỏ chọn giá đề nghị nếu muốn mua theo giá niêm yết.
              </p>
            )}

            {cart.length === 0 ? (
              <section className="checkout-empty text-center py-16 bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center gap-3">
                <span className="checkout-empty-icon w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-1">
                  <Icon name="shopping_bag" className="text-3xl" />
                </span>
                <h2 className="font-heading font-bold text-lg text-gray-900">Giỏ hàng đang trống</h2>
                <p className="text-xs text-gray-400 max-w-sm">
                  Khám phá tủ đồ cộng đồng Sifit và chọn cho mình những món đồ ưng ý nhất.
                </p>
                <button type="button" className="btn-primary mt-2 inline-flex items-center gap-2" onClick={() => browse()}>
                  Khám phá sản phẩm
                  <Icon name="arrow_forward" className="text-sm" />
                </button>
              </section>
            ) : (
              <form onSubmit={placeOrder} className="checkout-grid">
                <div className="checkout-main space-y-6">
                  {/* Cart Items List */}
                  <section className="checkout-card" aria-labelledby="cart-products-title">
                    <div className="checkout-card-heading flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                      <h2 id="cart-products-title" className="font-heading font-bold text-base text-gray-900 flex items-center gap-2">
                        <Icon name="shopping_bag" className="text-primary" />
                        Sản phẩm đã chọn ({cart.length})
                      </h2>
                    </div>

                    <div className="checkout-products space-y-3">
                      {cart.map(item => (
                        <div key={item._id} className="checkout-product p-3.5 rounded-2xl bg-gray-50/60 border border-gray-100 flex gap-4 items-center">
                          <div className="checkout-product-image w-20 h-20 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-100 relative flex items-center justify-center">
                            {item.images[0] ? (
                              <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <Icon name="image" className="text-gray-400 text-xl" />
                            )}
                          </div>
                          <div className="checkout-product-info flex-1 min-w-0">
                            <p className="checkout-product-title font-bold text-sm text-gray-900 truncate">{item.title}</p>
                            <p className="checkout-product-price text-sm font-extrabold text-primary mt-1">
                              {applies(offerFor(item)) && (
                                <span className="checkout-offer-original text-xs text-gray-400 line-through mr-2 font-normal">
                                  {money(item.price)}
                                </span>
                              )}
                              {money(priceFor(item))}
                            </p>
                            {offerFor(item) && (
                              <label className="checkout-offer-choice inline-flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={busy || offersLoading}
                                  checked={Boolean(applies(offerFor(item)))}
                                  onChange={event => {
                                    const id = idOf(offerFor(item));
                                    setIgnoredOffers(previous =>
                                      event.target.checked ? previous.filter(value => value !== id) : [...previous, id]
                                    );
                                  }}
                                  className="rounded text-primary focus:ring-primary"
                                />
                                <span>
                                  Áp dụng giá đã thống nhất: <strong>{money(offerFor(item).amount)}</strong>
                                </span>
                              </label>
                            )}
                            {!item.available && (
                              <p className="checkout-unavailable text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                                <Icon name="error" className="text-xs" />
                                Sản phẩm không còn khả dụng
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="checkout-remove p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-white transition-colors cursor-pointer"
                            disabled={busy}
                            title="Xóa món đồ khỏi giỏ hàng"
                            onClick={() => removeFromCart(item._id)}
                          >
                            <Icon name="delete" className="text-lg" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Delivery Address */}
                  <section className="checkout-card checkout-delivery" aria-labelledby="cart-delivery-title">
                    <div className="checkout-card-heading flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                      <h2 id="cart-delivery-title" className="font-heading font-bold text-base text-gray-900 flex items-center gap-2">
                        <Icon name="location_on" className="text-primary" />
                        Địa chỉ nhận hàng
                      </h2>
                    </div>

                    {deliveryAddresses.length ? (
                      <>
                        <Field label="Chọn địa chỉ đã lưu">
                          <select
                            className="input-field"
                            value={idOf(selectedAddress)}
                            onChange={event => setSelectedAddressId(event.target.value)}
                          >
                            {deliveryAddresses.map(item => (
                              <option key={idOf(item)} value={idOf(item)}>
                                {item.label || item.recipientName}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <div className="checkout-address p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3 mt-3">
                          <span className="checkout-address-marker w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon name="location_on" className="text-base" />
                          </span>
                          <div className="text-xs space-y-1">
                            <p className="checkout-recipient font-bold text-sm text-gray-900">
                              {shipping.recipientName} <span className="font-normal text-gray-500">· {shipping.phone}</span>
                            </p>
                            <p className="checkout-address-line text-gray-600 leading-relaxed">
                              {shipping.addressLine}, {shipping.ward}, {shipping.city}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="checkout-address-missing p-4 rounded-2xl bg-amber-50 text-amber-800 text-xs border border-amber-200 flex items-center gap-2">
                        <Icon name="warning" className="text-base text-amber-600 flex-shrink-0" />
                        <span>Chưa có địa chỉ nhận hàng. Hãy thêm địa chỉ trước khi đặt hàng.</span>
                      </div>
                    )}

                    <button
                      type="button"
                      className="checkout-address-link text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5 mt-3 cursor-pointer"
                      disabled={busy}
                      onClick={() => setTab('addresses')}
                    >
                      <Icon name="add" className="text-xs" />
                      Thêm / quản lý địa chỉ <Icon name="arrow_forward" className="text-xs" />
                    </button>
                  </section>
                </div>

                {/* Summary Aside */}
                <aside className="checkout-summary checkout-card space-y-4" aria-labelledby="cart-summary-title">
                  <div className="checkout-card-heading flex items-center justify-between pb-3 border-b border-gray-100">
                    <h2 id="cart-summary-title" className="font-heading font-bold text-base text-gray-900 flex items-center gap-2">
                      <Icon name="receipt_long" className="text-primary" />
                      Tóm tắt đơn hàng
                    </h2>
                  </div>

                  <dl className="checkout-totals space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <dt>Số lượng món đồ</dt>
                      <dd className="font-bold text-gray-900">{cart.length}</dd>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <dt>Tiền hàng</dt>
                      <dd className="font-bold text-gray-900">{money(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <dt>Phí giao hàng</dt>
                      <dd className="checkout-fee-note text-gray-500">Xác nhận khi người bán giao</dd>
                    </div>
                  </dl>

                  <div className="checkout-total pt-3 border-t border-gray-100 flex justify-between items-baseline">
                    <span className="font-bold text-sm text-gray-900">Tổng tiền hàng</span>
                    <strong className="text-xl font-heading font-black text-primary">{money(subtotal)}</strong>
                  </div>

                  <p className="checkout-summary-note text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed">
                    Sifit giữ tiền qua QR thanh toán bảo đảm. Người bán tạo vận đơn và giao hàng tận nơi.
                  </p>

                  <button
                    type="submit"
                    className="checkout-place-order btn-primary w-full py-4 text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    disabled={busy || offersLoading || Boolean(offersError) || invalidOffer || !selectedAddress || cart.some(item => !item.available)}
                  >
                    <span>Đặt hàng ({cart.length} sản phẩm)</span>
                    <Icon name="arrow_forward" className="text-sm" />
                  </button>

                  <p className="checkout-payment-note text-[11px] text-gray-400 flex items-center gap-1.5 justify-center">
                    <Icon name="verified_user" className="text-xs text-primary" />
                    <span>Bảo vệ quyền lợi người mua 100%</span>
                  </p>
                </aside>
              </form>
            )}
          </>
        )}

        {tab === 'orders' && (
          <div className="member-order-list space-y-4">
            {!historyOnly && (
              <BuyerHeading title="Đơn mua của bạn" description="Theo dõi đơn hàng và thanh toán.">
                <button disabled={busy} className="member-secondary inline-flex items-center gap-1.5" onClick={() => run(fetchOrders)}>
                  <Icon name="refresh" className={`text-xs ${busy ? 'animate-spin' : ''}`} />
                  Làm mới đơn mua
                </button>
              </BuyerHeading>
            )}
            {paymentError && (
              <p role="alert" className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <Icon name="info" className="text-amber-600 text-lg flex-shrink-0" />
                Đơn đã được lưu. {paymentError} Bạn có thể bấm Thanh toán bên dưới để thử lại.
              </p>
            )}
            {restoreError && <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p role="alert">Chưa khôi phục được thanh toán. {restoreError}</p>
              <button className="member-secondary mt-2" onClick={() => setRestoreAttempt(value => value + 1)}>Thử khôi phục thanh toán</button>
            </div>}
            {checkoutPayment && <div className="buyer-payment-section" ref={paymentSection}>
              <PaymentPanel key={paymentId} payment={checkoutPayment} onUpdate={updateCheckoutPayment} onConfirmed={fetchOrders} onRetry={() => openPayment(idOf(checkoutPayment.checkoutGroupId))} />
            </div>}
            {historyOnly && (
              <button disabled={busy} onClick={() => run(fetchOrders)} className="member-secondary inline-flex items-center gap-1.5">
                <Icon name="refresh" className="text-xs" />
                Làm mới danh sách
              </button>
            )}
            {!orders.length && (
              <div className="member-empty p-12 bg-white rounded-3xl border border-gray-100 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-1">
                  <Icon name="receipt_long" className="text-2xl" />
                </div>
                <h3 className="font-heading font-bold text-sm text-gray-800">Chưa có đơn mua nào</h3>
                <p className="text-xs text-gray-400">Các món đồ bạn đã đặt sẽ hiển thị đầy đủ thông tin tại đây.</p>
              </div>
            )}
            {orders.map(order => (
              <OrderCard key={order._id} order={order} onChange={fetchOrders} onPay={openPayment} activePayment={checkoutPayment} onViewPayment={viewPayment} />
            ))}
          </div>
        )}

        {tab === 'addresses' && <AddressBook onChange={setAddresses} />}

        {tab === 'profile' && (
          <Panel title="Thông tin tài khoản" icon="person">
            <p className="text-xs text-gray-600 font-medium">{user.name} · {user.email}</p>
            <p className="text-xs text-gray-400">Bạn có thể quản lý địa chỉ nhận hàng và hồ sơ tài khoản riêng.</p>
            <form
              className="space-y-3 max-w-lg pt-4 border-t border-gray-100"
              onSubmit={event => {
                event.preventDefault();
                run(async () => {
                  await authService.changePassword(passwords);
                  await logoutUser();
                });
              }}
            >
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <Icon name="lock" className="text-primary text-xs" />
                Đổi mật khẩu
              </h3>
              <Field label="Mật khẩu hiện tại" icon="lock">
                <input
                  className="input-field"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={passwords.currentPassword}
                  onChange={event => setPasswords({ ...passwords, currentPassword: event.target.value })}
                />
              </Field>
              <Field label="Mật khẩu mới (ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt)" icon="lock">
                <input
                  className="input-field"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength="8"
                  value={passwords.newPassword}
                  onChange={event => setPasswords({ ...passwords, newPassword: event.target.value })}
                />
              </Field>
              <button className="btn-primary text-xs py-2.5 inline-flex items-center gap-2" disabled={busy}>
                <Icon name="task_alt" className="text-sm" />
                Đổi mật khẩu và đăng xuất
              </button>
            </form>
          </Panel>
        )}
      </div>
    </LocalizedContent>
  );
}

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
  const [createDisputeOpen, setCreateDisputeOpen] = useState(false);
  const [newDispute, setNewDispute] = useState({
    orderId: '',
    reason: 'ITEM_NOT_AS_DESCRIBED',
    description: '',
  });
  const disputeReasonLabels = {
    ITEM_NOT_RECEIVED: 'Chưa nhận hàng',
    ITEM_NOT_AS_DESCRIBED: 'Không đúng mô tả',
    DAMAGED_ITEM: 'Hàng hỏng',
    WRONG_ITEM: 'Sai sản phẩm',
    OTHER: 'Khác',
  };
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

  useEffect(() => {
    run(async () => {
      const data = await addressService.listAddresses();
      setAddresses(data);
    });
  }, [run]);

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
      try {
        setCheckoutPayment(await paymentService.createPayment({ checkoutGroupId: idOf(result.data), idempotencyKey: crypto.randomUUID() }));
        setPaymentError('');
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
                  ['disputes', 'Khiếu nại', 'shield'],
                ]
              : [
                  ['checkout', `Giỏ hàng (${cart.length})`, 'shopping_bag'],
                  ['orders', 'Đơn mua', 'receipt_long'],
                  ['disputes', 'Khiếu nại', 'shield'],
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
              <BuyerHeading title="Đơn mua của bạn" description="Theo dõi trạng thái giao hàng, kiểm tra QR thanh toán và gửi đánh giá.">
                <button disabled={busy} className="member-secondary inline-flex items-center gap-1.5" onClick={() => run(fetchOrders)}>
                  <Icon name="refresh" className={`text-xs ${busy ? 'animate-spin' : ''}`} />
                  Làm mới đơn mua
                </button>
              </BuyerHeading>
            )}
            {created && (
              <p role="status" className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <Icon name="task_alt" className="text-emerald-600 text-lg flex-shrink-0" />
                Đã tạo đơn hàng thành công. Tổng thanh toán: {money(created.buyerTotal)}. Quét mã QR bên dưới để thanh toán.
              </p>
            )}
            {paymentError && (
              <p role="alert" className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <Icon name="info" className="text-amber-600 text-lg flex-shrink-0" />
                Đơn đã được lưu. {paymentError} Bạn có thể bấm Thanh toán bên dưới để thử lại.
              </p>
            )}
            {checkoutPayment && <PaymentPanel payment={checkoutPayment} onUpdate={setCheckoutPayment} onConfirmed={fetchOrders} />}
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
              <OrderCard key={order._id} order={order} onChange={fetchOrders} />
            ))}
          </div>
        )}

        {tab === 'addresses' && <AddressBook onChange={setAddresses} />}

        {tab === 'disputes' && (
          <Panel title="Khiếu nại của tôi" icon="shield">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <p className="text-xs text-gray-500">
                Gửi yêu cầu bảo vệ người mua nếu đơn hàng chậm giao, sai mô tả hoặc phát sinh sự cố.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => setDisputes((await collectPages(disputeService.listMyDisputes)).items))
                  }
                  className="btn-outline text-xs py-2 px-3 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="refresh" className="text-xs" />
                  Làm mới
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const defaultOrder =
                      orders.find(o => o.disputeEligibility?.eligible && !o.activeDispute) || orders[0];
                    setNewDispute({
                      orderId: defaultOrder?._id || '',
                      reason:
                        defaultOrder?.disputeEligibility?.allowedReasons?.[0] || 'ITEM_NOT_AS_DESCRIBED',
                      description: '',
                    });
                    setCreateDisputeOpen(prev => !prev);
                  }}
                  className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name={createDisputeOpen ? 'close' : 'add'} className="text-sm" />
                  {createDisputeOpen ? 'Đóng biểu mẫu' : 'Tạo khiếu nại'}
                </button>
              </div>
            </div>

            {createDisputeOpen && (
              <form
                className="p-4 sm:p-5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3.5 my-3 animate-fade-in"
                onSubmit={event => {
                  event.preventDefault();
                  if (!newDispute.orderId) return;
                  run(async () => {
                    await disputeService.createDispute(newDispute.orderId, {
                      reason: newDispute.reason,
                      description: newDispute.description.trim(),
                    });
                    setCreateDisputeOpen(false);
                    setNewDispute({ orderId: '', reason: 'ITEM_NOT_AS_DESCRIBED', description: '' });
                    await Promise.all([
                      fetchOrders(),
                      collectPages(disputeService.listMyDisputes).then(res => setDisputes(res.items)),
                    ]);
                  });
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                    <Icon name="shield" className="text-primary text-base" />
                    Tạo khiếu nại đơn hàng mới
                  </h3>
                </div>

                {!orders.length ? (
                  <div className="p-3 bg-white rounded-xl border border-gray-100 text-xs text-gray-600 flex items-center justify-between gap-3">
                    <span>Bạn chưa có đơn mua nào để tạo khiếu nại.</span>
                    <button
                      type="button"
                      onClick={() => browse()}
                      className="text-primary font-bold hover:underline"
                    >
                      Khám phá sản phẩm
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Chọn đơn hàng cần khiếu nại" icon="receipt_long">
                        <select
                          required
                          className="input-field"
                          value={newDispute.orderId}
                          onChange={event => {
                            const ord = orders.find(o => o._id === event.target.value);
                            setNewDispute(prev => ({
                              ...prev,
                              orderId: event.target.value,
                              reason:
                                ord?.disputeEligibility?.allowedReasons?.[0] || prev.reason,
                            }));
                          }}
                        >
                          <option value="">-- Chọn đơn hàng --</option>
                          {orders.map(ord => (
                            <option key={ord._id} value={ord._id}>
                              Đơn #{ord._id.slice(-8)} · {ord.items?.[0]?.title || 'Sản phẩm'} ({money(ord.totalAmount)})
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Lý do khiếu nại" icon="flag">
                        <select
                          required
                          className="input-field"
                          value={newDispute.reason}
                          onChange={event =>
                            setNewDispute(prev => ({ ...prev, reason: event.target.value }))
                          }
                        >
                          {Object.entries(disputeReasonLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field label="Mô tả chi tiết vấn đề" icon="edit">
                      <textarea
                        required
                        rows={3}
                        maxLength={2000}
                        className="input-field"
                        value={newDispute.description}
                        onChange={event =>
                          setNewDispute(prev => ({ ...prev, description: event.target.value }))
                        }
                        placeholder="Mô tả rõ tình trạng sản phẩm hoặc sự cố giao nhận để đội ngũ SiFit hỗ trợ nhanh nhất..."
                      />
                    </Field>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={busy || !newDispute.orderId || !newDispute.description.trim()}
                        className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Icon name="send" className="text-xs" />
                        Gửi khiếu nại
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setCreateDisputeOpen(false)}
                        className="btn-outline text-xs py-2.5 px-4 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {!disputes.length && !createDisputeOpen && (
              <div className="text-center py-8 text-gray-400 text-xs">
                <Icon name="verified_user" className="text-3xl text-gray-300 mx-auto mb-2" />
                Chưa có khiếu nại nào. Các giao dịch trên Sifit đều được bảo vệ.
              </div>
            )}
            {disputes.map(item => (
              <div key={idOf(item)} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                    <Icon name="receipt_long" className="text-xs text-gray-400" />
                    Đơn hàng #{idOf(item.orderId)?.slice(-8)}
                  </p>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-gray-700">
                  <strong className="text-gray-900">{item.reason}:</strong> {item.description}
                </p>
                {item.resolution && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                    Kết quả xử lý: {item.resolution}
                  </p>
                )}
                <button
                  onClick={() => openResource('DISPUTE', idOf(item))}
                  className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 mt-2"
                >
                  <Icon name="arrow_forward" className="text-xs" />
                  Xem bằng chứng & trả hàng
                </button>
              </div>
            ))}
          </Panel>
        )}

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

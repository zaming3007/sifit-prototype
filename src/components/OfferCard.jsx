import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAction } from '../hooks/useAction';
import { Feedback } from './MarketplaceUI';
import Icon from './Icon';
import { idOf, money } from '../utils/marketplace';
import { normalizeProduct } from '../utils/normalizers';
import * as api from '../services/offerService';

import { offerStatusLabels } from '../constants/offers';
const date = value => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export default function OfferCard({ offer, onChange, showHistory = false }) {
  const { user, handleInstantBuy } = useApp();
  const { busy, error, run } = useAction();
  const [note, setNote] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const expired = offer.open && new Date(offer.expiresAt).getTime() <= now;
  const status = expired ? 'EXPIRED' : offer.effectiveStatus;
  const actionable = offer.actionable && !expired;
  const seller = user.role === 'seller';
  return <article className="offer-card" data-offer-id={idOf(offer)}>
    <div className="offer-card-top"><div className="offer-image"><Icon name="image" />{offer.productSnapshot.image && <img src={offer.productSnapshot.image} alt="" onError={event => { event.currentTarget.hidden = true; }} />}</div><div className="offer-card-info"><span className="offer-eyebrow">{seller ? `Từ ${offer.buyerId?.fullName || 'Người mua'}` : `Gửi ${offer.sellerId?.fullName || 'Người bán'}`}</span><h2>{offer.productSnapshot.title}</h2><span className={`offer-status offer-status-${status.toLowerCase()}`}>{offerStatusLabels[status]}</span></div></div>
    <div className="offer-price-row"><div><span>Giá đề nghị</span><strong>{money(offer.amount)}</strong></div><div><span>Giá niêm yết khi gửi</span><span className="offer-listed-price">{money(offer.listingPrice)}</span></div></div>
    {offer.message && <p className="offer-message">“{offer.message}”</p>}
    {offer.responseNote && <p className="offer-response"><strong>Phản hồi của shop:</strong> {offer.responseNote}</p>}
    <p className="offer-deadline">{status === 'ACCEPTED' ? 'Bắt đầu đặt hàng trước' : 'Thời hạn phản hồi'}: <time dateTime={offer.expiresAt}>{date(offer.expiresAt)}</time></p>
    {offer.open && !offer.available && !expired && <p className="offer-warning">Sản phẩm đang được giữ chỗ, đã thay đổi hoặc cửa hàng/tài khoản không còn khả dụng.</p>}
    {status === 'ACCEPTED' && <p className="offer-hint">Hàng vẫn được mở bán. Sản phẩm chỉ được giữ khi tạo đơn thành công; thời hạn thanh toán hiển thị trong đơn.</p>}
    <Feedback busy={busy} error={error} />
    {seller && actionable && status === 'PENDING' && <label className="offer-note-label">Ghi chú phản hồi<textarea maxLength="500" value={note} onChange={event => setNote(event.target.value)} placeholder="Lời nhắn dành cho người mua (không bắt buộc)" /></label>}
    <div className="offer-actions">
      {seller && actionable && status === 'PENDING' && <><button className="member-primary" disabled={busy} onClick={() => run(async () => { await api.respond(idOf(offer), 'ACCEPT', note); onChange?.(); })}>Chấp nhận giá</button><button className="member-secondary" disabled={busy} onClick={() => run(async () => { await api.respond(idOf(offer), 'REJECT', note); onChange?.(); })}>Từ chối</button></>}
      {!seller && actionable && status === 'ACCEPTED' && <button className="member-primary" disabled={busy} onClick={() => run(() => handleInstantBuy(normalizeProduct({ ...offer.productId, sellerId: offer.sellerId })))}>Đặt hàng với giá này<Icon name="arrow_forward" /></button>}
      {!seller && offer.open && !expired && <button className="member-secondary" disabled={busy} onClick={() => run(async () => { await api.withdraw(idOf(offer)); onChange?.(); })}>Rút đề nghị</button>}
    </div>
    {showHistory && <details className="offer-history"><summary>Lịch sử đề nghị</summary>{offer.history.map((entry, index) => <p key={index}>{date(entry.at)} · {({ CREATED: 'Đã gửi đề nghị', ...offerStatusLabels })[entry.action] || entry.action}{entry.note ? ` · ${entry.note}` : ''}</p>)}</details>}
  </article>;
}

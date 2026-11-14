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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const expired = offer.open && new Date(offer.expiresAt).getTime() <= now;
  const status = expired ? 'EXPIRED' : offer.effectiveStatus;
  const actionable = offer.actionable && !expired;
  const seller = user.role === 'seller';

  return (
    <article className="offer-card bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4" data-offer-id={idOf(offer)}>
      <div className="offer-card-top flex gap-3.5 items-start">
        <div className="offer-image w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden relative border border-gray-100 flex-shrink-0 flex items-center justify-center">
          <Icon name="image" className="text-gray-300 text-xl" />
          {offer.productSnapshot.image && (
            <img
              src={offer.productSnapshot.image}
              alt=""
              className="w-full h-full object-cover absolute inset-0"
              onError={event => { event.currentTarget.hidden = true; }}
            />
          )}
        </div>
        <div className="offer-card-info flex-1 min-w-0">
          <span className="offer-eyebrow text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
            {seller ? `Từ ${offer.buyerId?.fullName || 'Người mua'}` : `Gửi đến ${offer.sellerId?.fullName || 'Người bán'}`}
          </span>
          <h2 className="font-heading font-bold text-sm text-gray-900 line-clamp-1">{offer.productSnapshot.title}</h2>
          <span className={`offer-status offer-status-${status.toLowerCase()} inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full`}>
            <Icon name={status === 'ACCEPTED' ? 'task_alt' : status === 'REJECTED' ? 'close' : 'schedule'} className="text-xs" />
            {offerStatusLabels[status]}
          </span>
        </div>
      </div>

      <div className="offer-price-row grid grid-cols-2 gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
        <div>
          <span className="text-[10px] uppercase text-gray-400 font-bold block">Giá đề nghị</span>
          <strong className="text-base font-extrabold text-primary">{money(offer.amount)}</strong>
        </div>
        <div>
          <span className="text-[10px] uppercase text-gray-400 font-bold block">Giá niêm yết</span>
          <span className="offer-listed-price text-sm text-gray-500 line-through">{money(offer.listingPrice)}</span>
        </div>
      </div>

      {offer.message && (
        <p className="offer-message text-xs text-gray-600 italic bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
          “{offer.message}”
        </p>
      )}

      {offer.responseNote && (
        <p className="offer-response text-xs text-gray-700 bg-gray-50 p-3 rounded-xl">
          <strong className="text-gray-900 block mb-0.5">Phản hồi của shop:</strong>
          {offer.responseNote}
        </p>
      )}

      <p className="offer-deadline text-[11px] text-gray-500 flex items-center gap-1.5">
        <Icon name="schedule" className="text-xs text-gray-400" />
        <span>{status === 'ACCEPTED' ? 'Bắt đầu đặt hàng trước' : 'Thời hạn phản hồi'}: </span>
        <time dateTime={offer.expiresAt} className="font-medium text-gray-700">{date(offer.expiresAt)}</time>
      </p>

      {offer.open && !offer.available && !expired && (
        <p className="offer-warning text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
          <Icon name="warning" className="text-sm text-amber-600 flex-shrink-0" />
          Sản phẩm đang được giữ chỗ, đã thay đổi hoặc cửa hàng tạm ngưng.
        </p>
      )}

      {status === 'ACCEPTED' && (
        <p className="offer-hint text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
          <Icon name="sparkles" className="text-sm text-emerald-600 flex-shrink-0" />
          Hàng vẫn mở bán. Hãy hoàn tất đặt hàng sớm để giữ món đồ bạn đã chốt giá.
        </p>
      )}

      <Feedback busy={busy} error={error} />

      {seller && actionable && status === 'PENDING' && (
        <label className="offer-note-label block text-xs font-semibold text-gray-700">
          Ghi chú phản hồi cho khách
          <textarea
            maxLength="500"
            className="input-field mt-1 text-xs"
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="Lời nhắn dành cho người mua (không bắt buộc)"
          />
        </label>
      )}

      <div className="offer-actions flex items-center gap-2 pt-1">
        {seller && actionable && status === 'PENDING' && (
          <>
            <button
              className="btn-primary flex-1 py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5"
              disabled={busy}
              onClick={() => run(async () => { await api.respond(idOf(offer), 'ACCEPT', note); onChange?.(); })}
            >
              <Icon name="task_alt" className="text-sm" />
              Chấp nhận giá
            </button>
            <button
              className="btn-outline flex-1 py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5"
              disabled={busy}
              onClick={() => run(async () => { await api.respond(idOf(offer), 'REJECT', note); onChange?.(); })}
            >
              <Icon name="close" className="text-sm" />
              Từ chối
            </button>
          </>
        )}

        {!seller && actionable && status === 'ACCEPTED' && (
          <button
            className="btn-primary w-full py-3 text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2"
            disabled={busy}
            onClick={() => run(() => handleInstantBuy(normalizeProduct({ ...offer.productId, sellerId: offer.sellerId })))}
          >
            <Icon name="shopping_bag" className="text-sm" />
            Đặt hàng với giá này ({money(offer.amount)})
          </button>
        )}

        {!seller && offer.open && !expired && (
          <button
            className="btn-outline w-full py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 text-gray-600"
            disabled={busy}
            onClick={() => run(async () => { await api.withdraw(idOf(offer)); onChange?.(); })}
          >
            <Icon name="remove" className="text-sm" />
            Rút lại đề nghị giá
          </button>
        )}
      </div>

      {showHistory && (
        <details className="offer-history text-xs text-gray-500 pt-2 border-t border-gray-100">
          <summary className="font-semibold cursor-pointer py-1">Lịch sử thương lượng</summary>
          <div className="space-y-1.5 mt-2 pl-2 border-l border-gray-200">
            {offer.history.map((entry, index) => (
              <p key={index} className="text-[11px] text-gray-600">
                {date(entry.at)} · {({ CREATED: 'Đã gửi đề nghị', ...offerStatusLabels })[entry.action] || entry.action}
                {entry.note ? ` · ${entry.note}` : ''}
              </p>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}

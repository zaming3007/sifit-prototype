import { useRef, useState } from 'react';
import { Dialog } from './OperationsUI';
import { Feedback, Field } from './MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { useApp } from '../context/AppContext';
import { money } from '../utils/marketplace';
import { createOffer } from '../services/offerService';
export default function OfferDialog({ product, onClose }) {
  const { setCurrentView } = useApp();
  const [amount, setAmount] = useState(String(Math.max(1, Math.floor(product.price * 0.8))));
  const [message, setMessage] = useState(''); const [sent, setSent] = useState(false);
  const attempt = useRef(null); const { busy, error, run } = useAction();
  return <Dialog title="Gửi đề nghị giá" onClose={onClose} busy={busy}><div className="offer-dialog"><h3>{product.title}</h3><p>Giá niêm yết: <strong>{money(product.price)}</strong></p>
    {sent ? <><p role="status" className="offer-success">Đã gửi đề nghị. Bạn sẽ nhận thông báo khi người bán phản hồi.</p><button className="member-primary" onClick={() => { onClose(); setCurrentView('offers'); }}>Xem đề nghị của tôi</button></> : <form onSubmit={event => {
      event.preventDefault(); run(async () => {
        const body = { amount: Number(amount), message: message.trim() }; const fingerprint = JSON.stringify(body);
        if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
        await createOffer(product._id, { ...body, idempotencyKey: attempt.current.key }); setSent(true);
      });
    }}><Field label="Giá bạn đề nghị (đ)"><input autoFocus className="input-field" type="number" min="1" max={product.price - 1} step="1" required value={amount} onChange={event => setAmount(event.target.value)} /></Field><Field label="Lời nhắn cho shop"><textarea className="input-field" maxLength="500" value={message} onChange={event => setMessage(event.target.value)} placeholder="Bạn muốn trao đổi thêm điều gì?" /></Field><p className="offer-hint">Shop có 24 giờ để phản hồi. Nếu chấp nhận, bạn có 24 giờ để bắt đầu đặt hàng. Gửi đề nghị chưa giữ sản phẩm.</p><Feedback busy={busy} error={error} /><div className="offer-actions"><button className="member-primary" disabled={busy}>Gửi đề nghị</button><button type="button" className="member-secondary" disabled={busy} onClick={() => { onClose(); setCurrentView('offers'); }}>Các đề nghị đã gửi</button></div></form>}
  </div></Dialog>;
}

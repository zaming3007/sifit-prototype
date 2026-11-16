import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import * as service from '../services/aiStylistService';
import { money } from '../utils/marketplace';
import '../stylist-production.css';

const ongoing = job => job && ['queued', 'running', 'attention'].includes(job.status);
const message = error => error.response?.data?.message || error.message || 'Chưa kết nối được. Vui lòng thử lại.';
const engineCost = (product, engine) => engine === 'max' || /shoe|footwear|accessor|giày|giay|dép|dep|túi|phụ kiện/i.test(product.category || '') ? 2 : 1;

export default function AiStylist() {
  const { user, openAuth, products, cart, browse, tryOnProduct } = useApp();
  const candidates = tryOnProduct && !products.some(p => p._id === tryOnProduct._id) ? [tryOnProduct, ...products] : products;
  const [state, setState] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [selection, setSelection] = useState(() => tryOnProduct ? [tryOnProduct._id] : []);
  const [engine, setEngine] = useState('v1.6');
  const [consent, setConsent] = useState(false);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [source, setSource] = useState('catalog');
  const [search, setSearch] = useState('');
  const requestId = useRef(null);
  const submitting = useRef(false);
  const loadedResult = useRef(null);
  const userId = user?._id;
  const running = ongoing(job);
  const terminalId = job && !running ? job.id : null;
  const maxItems = engine === 'outfit' ? 4 : 3;
  const cost = engine === 'outfit' ? (selection.length ? 2 : 0) : candidates.filter(p => selection.includes(p._id)).reduce((total, p) => total + engineCost(p, engine), 0);
  const cartIds = new Set(cart.map(p => p._id));
  const available = candidates.filter(p => p.status === 'active' && p.images?.length && (source !== 'cart' || cartIds.has(p._id)) && p.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    service.getState().then(next => {
      if (mounted) { setState(next); setJob(next.jobs.find(ongoing) || next.jobs.find(j => j.status === 'completed') || null); }
    }).catch(e => { if (mounted) setError(message(e)); });
    return () => { mounted = false; };
  }, [userId]);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { if (loadedResult.current) URL.revokeObjectURL(loadedResult.current); }, []);
  useEffect(() => {
    if (!running || !job?.id) return;
    let cancelled = false, timer, failures = 0;
    const poll = async () => {
      try {
        const next = await service.getJob(job.id);
        if (cancelled) return;
        failures = 0; setConnection(''); setJob(next);
        if (!ongoing(next)) return;
      } catch (e) {
        if (cancelled) return;
        failures++;
        if ([401, 403, 404].includes(e.response?.status)) { setError(message(e)); return; }
        setConnection('Kết nối đang chậm. Đang kiểm tra lượt hiện có, không tạo lượt mới.');
      }
      if (!cancelled) timer = setTimeout(poll, Math.min(15000, 3000 * (failures + 1)));
    };
    timer = setTimeout(poll, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [job?.id, running]);
  useEffect(() => {
    if (!terminalId) return;
    let mounted = true;
    service.getState().then(next => { if (mounted) setState(next); }).catch(() => {});
    return () => { mounted = false; };
  }, [terminalId]);
  useEffect(() => {
    if (job?.status !== 'completed') return;
    let cancelled = false;
    setResult('');
    service.getImage(job.id).then(url => {
      if (cancelled) { URL.revokeObjectURL(url); return; }
      if (loadedResult.current) URL.revokeObjectURL(loadedResult.current);
      loadedResult.current = url; setResult(url);
    }).catch(e => { if (!cancelled) setError(message(e)); });
    return () => { cancelled = true; };
  }, [job?.id, job?.status]);
  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 1000)));
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [running, job?.createdAt]);

  const toggle = id => {
    if (running || busy) return;
    requestId.current = null;
    setSelection(current => current.includes(id) ? current.filter(x => x !== id) : current.length < maxItems ? [...current, id] : current);
  };
  const submit = async () => {
    if (submitting.current || running) return;
    submitting.current = true; setBusy(true); setError('');
    requestId.current ||= crypto.randomUUID();
    try {
      setJob(await service.tryOn({ photo: file, products: selection, engine, requestId: requestId.current }));
      setState(await service.getState());
    } catch (e) {
      setError(message(e));
      // Recover a lost response without submitting a second paid generation.
      try { const next = await service.getState(); setState(next); const active = next.jobs.find(ongoing); if (active) setJob(active); } catch { /* Retry keeps the same requestId. */ }
    } finally { submitting.current = false; setBusy(false); }
  };
  const remove = async id => {
    setBusy(true); setError('');
    try { await service.removeJob(id); setState(await service.getState()); if (job?.id === id) { setJob(null); setResult(''); } }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  };

  if (!user) return <section className="tryon-page tryon-signin"><span className="tryon-kicker">SIFIT FITTING ROOM</span><h1>Thử phong cách mới.<br />Vẫn là chính bạn.</h1><p>Đăng nhập để thử trang phục trên ảnh của bạn và lưu những bản phối yêu thích.</p><button className="tryon-primary" onClick={() => openAuth()}>Đăng nhập để bắt đầu <Icon name="arrow_forward" /></button><p className="tryon-note">Ảnh và kết quả chỉ hiển thị trong tài khoản của bạn.</p></section>;
  return <div className="tryon-page">
    <header className="tryon-heading"><div><span className="tryon-kicker">SIFIT FITTING ROOM / POWERED BY FASHN</span><h1>Ướm thử. Tìm đúng gu.</h1><p>Chọn món đồ bạn thích và xem cách chúng lên hình trên chính bạn.</p></div><div className="tryon-allowance"><Icon name="auto_awesome" /><div><strong>{state ? `${state.quota.remaining} credit còn lại` : 'Đang kiểm tra lượt dùng…'}</strong><span>Tối đa 5/ngày · 10/tháng</span></div></div></header>
    {error && <div role="alert" className="tryon-error">{error}<button aria-label="Đóng thông báo" onClick={() => setError('')}>×</button></div>}
    {state && !state.enabled && <div role="status" className="tryon-notice">Phòng thử đồ đang được chuẩn bị. Bạn có thể khám phá trang phục và quay lại sau.</div>}
    <div className="tryon-layout">
      <section className="tryon-controls" aria-label="Chuẩn bị lượt thử">
        <div className="tryon-section-title"><span>01</span><h2>Ảnh của bạn</h2></div>
        <label className={`tryon-upload ${preview ? 'has-photo' : ''}`}>
          {preview ? <img src={preview} alt="Ảnh bạn đã chọn để thử đồ" /> : <><Icon name="add_a_photo" /><strong>Chọn ảnh toàn thân</strong><span>Đứng thẳng, ánh sáng rõ, thấy đủ tay chân</span><small>JPEG, PNG, WebP · tối đa 8 MB</small></>}
          <input aria-label="Chọn ảnh toàn thân" type="file" accept="image/jpeg,image/png,image/webp" disabled={running || busy} onChange={e => {
            const next = e.target.files?.[0]; if (!next) return;
            if (next.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) { setError('Chọn ảnh JPEG, PNG hoặc WebP, tối đa 8 MB.'); e.target.value = ''; return; }
            setFile(next); requestId.current = null; setError('');
          }} />
          {preview && <span className="tryon-change">Chọn ảnh khác</span>}
        </label>
        <div className="tryon-section-title"><span>02</span><h2>Chất lượng hình ảnh</h2></div>
        <div className="tryon-engines">{[['v1.6', 'Tiêu chuẩn', '1 credit / món quần áo'], ['max', 'Chi tiết cao', '2 credit / món']].map(([value, label, detail]) => <button key={value} aria-pressed={engine === value} disabled={running || busy} className={engine === value ? 'selected' : ''} onClick={() => { setEngine(value); setSelection(current => current.slice(0, value === 'outfit' ? 4 : 3)); requestId.current = null; }}><strong>{label}</strong><span>{detail}</span></button>)}</div>
        <p className="tryon-note">Giày và phụ kiện dùng chế độ chi tiết cao, 2 credit/món.</p>
        <label className="tryon-consent"><input type="checkbox" checked={consent} disabled={running || busy} onChange={e => setConsent(e.target.checked)} /><span>Tôi có quyền sử dụng ảnh này và đồng ý gửi ảnh đến FASHN để thử đồ. Ảnh thử được lưu riêng trong 7 ngày và có thể xóa sớm.</span></label>
        <button className="tryon-primary" disabled={!state?.enabled || !file || !selection.length || !consent || busy || running || cost > (state?.quota.remaining || 0)} onClick={submit}><Icon name="auto_awesome" />{busy ? 'Đang gửi yêu cầu…' : running ? 'Đang xử lý lượt thử' : `Thử ${selection.length || ''} món · ${cost} credit`}</button>
        <p className="tryon-note">Kết quả AI mang tính tham khảo về phong cách, không thay thế số đo và thông tin tình trạng sản phẩm.</p>
      </section>
      <div className="tryon-main">
        <section className="tryon-result" aria-label="Kết quả thử đồ" aria-busy={!!running}>
          <div className="tryon-result-header"><h2>Bản phối của bạn</h2>{job?.status === 'completed' && result && <a href={result} download="sifit-fitting-room.jpg"><Icon name="download" /> Tải ảnh</a>}</div>
          {running ? <div className="tryon-processing"><div className="tryon-orbit"><Icon name="auto_awesome" /></div><h3>{job.phase === 'attention' ? 'Đang xác minh lượt thử' : job.phase === 'submitting' ? 'Đang gửi ảnh đến phòng thử' : 'Đang tạo bản phối cho bạn'}</h3><p>{job.phase === 'attention' ? job.error : `Đã hoàn tất ${job.step}/${job.totalSteps} món. AI đang giữ lại kiểu dáng và chi tiết trang phục.`}</p><div role="progressbar" aria-label={`Hoàn tất ${job.step} trên ${job.totalSteps} món`} aria-valuemin={0} aria-valuemax={job.totalSteps} aria-valuenow={job.step} className="tryon-progress"><span style={{ width: `${100 * job.step / job.totalSteps}%` }} /><i /></div><ol className="tryon-stages"><li className="done">Đã nhận ảnh</li><li className="current">Phối trang phục</li><li>Hoàn thiện ảnh</li></ol><span className="tryon-elapsed">Đã chờ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span><p className="tryon-note">{elapsed > 90 ? 'Lượt này đang lâu hơn thường lệ. Bạn có thể quay lại sau, lượt đang xử lý vẫn được giữ trong tài khoản.' : 'Bạn có thể rời trang và quay lại. Chúng tôi sẽ khôi phục lượt đang xử lý.'}</p>{connection && <p role="status">{connection}</p>}</div>
          : job?.status === 'failed' ? <div className="tryon-empty"><Icon name="info" /><h3>Chưa tạo được bản phối</h3><p>{job.error}</p><button onClick={() => { setJob(null); requestId.current = null; }}>Chuẩn bị lượt mới</button></div>
          : job?.status === 'completed' ? <div className="tryon-completed">{result ? <img src={result} alt="Trang phục được thử bằng AI" /> : <p role="status">Đang mở ảnh kết quả…</p>}<p className="tryon-note">Ảnh tạo bởi AI · Chỉ bạn có quyền xem</p></div>
          : <div className="tryon-empty"><div className="tryon-empty-figure"><Icon name="checkroom" /></div><h3>Một góc nhìn mới cho tủ đồ của bạn</h3><p>Thêm ảnh, chọn trang phục bên dưới và bắt đầu lượt thử đầu tiên.</p><span>01 Ảnh của bạn → 02 Trang phục → 03 Bản phối</span></div>}
        </section>
        <section className="tryon-wardrobe"><div className="tryon-wardrobe-heading"><div><span className="tryon-kicker">CHỌN TỪ TỦ ĐỒ SIFIT</span><h2>Thêm món đồ bạn muốn thử</h2></div><span>{selection.length}/3 món</span></div><p className="tryon-note">Chọn tối đa một món trong mỗi nhóm: áo, quần/váy, áo khoác, giày hoặc phụ kiện.</p><div className="tryon-filters"><div>{[['catalog', 'Khám phá'], ['cart', 'Trong giỏ']].map(([value, label]) => <button key={value} className={source === value ? 'active' : ''} onClick={() => setSource(value)}>{label}</button>)}</div><input aria-label="Tìm trang phục để thử" placeholder="Tìm tên trang phục…" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="tryon-products">{available.slice(0, 24).map(p => <button key={p._id} disabled={running || busy || (!selection.includes(p._id) && selection.length >= maxItems)} className={`tryon-product ${selection.includes(p._id) ? 'selected' : ''}`} aria-pressed={selection.includes(p._id)} onClick={() => toggle(p._id)}><div><img src={p.images[0]} alt={p.title} loading="lazy" /><span>{selection.includes(p._id) ? '✓' : '+'}</span></div><strong>{p.title}</strong><span>{money(p.price)}</span></button>)}</div>{!available.length && <div className="tryon-no-products"><p>Chưa có trang phục trong danh sách này.</p><button onClick={() => browse()}>Khám phá cửa hàng <Icon name="arrow_forward" /></button></div>}</section>
      </div>
    </div>
    {!!state?.jobs.filter(j => j.status === 'completed').length && <section className="tryon-history"><div className="tryon-section-title"><span>↗</span><h2>Những bản phối gần đây</h2></div><p className="tryon-note">Lưu riêng trong 7 ngày. Tải ảnh nếu bạn muốn giữ lâu hơn.</p>{state.jobs.filter(j => j.status === 'completed').map(item => <div className="tryon-history-row" key={item.id}><div><strong>{item.products.map(p => p.title).join(' + ')}</strong><span>{new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · {item.cost} credit</span></div><button disabled={running || busy} onClick={() => setJob(item)}>Xem ảnh</button><button disabled={running || busy} onClick={() => remove(item.id)}>Xóa ảnh</button></div>)}</section>}
  </div>;
}

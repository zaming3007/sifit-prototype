import { getApiErrorMessage } from '../utils/errorHandler';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import * as service from '../services/aiStylistService';
import StylistClassicView from '../components/StylistClassicView';
import { stylistBackgrounds } from '../data/stylistBackgrounds';
import { prepareStylistPhoto, savePortrait, readPortrait, deletePortrait } from '../services/stylistPhoto';
import '../stylist.css';
import '../stylist-production.css';

const ongoing = job => job && ['queued', 'running', 'attention'].includes(job.status);
const message = error => getApiErrorMessage(error) || 'Chưa kết nối được. Vui lòng thử lại.';

export default function AiStylist() {
  const { user, openAuth, products, cart, browse, tryOnProduct } = useApp();
  const candidates = [...new Map([...cart, ...products, tryOnProduct].filter(Boolean).map(product => [product._id, product])).values()];
  const [state, setState] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [prepared, setPrepared] = useState(null);
  const [photoMode, setPhotoMode] = useState('original');
  const [backgroundId, setBackgroundId] = useState('white');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [comparison, setComparison] = useState('original');
  const [zoom, setZoom] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [measurements, setMeasurements] = useState({});
  const [measurementsSaved, setMeasurementsSaved] = useState(false);
  const fileInput = useRef(null);
  const zoomDialog = useRef(null);
  const [selection, setSelection] = useState(() => tryOnProduct ? [tryOnProduct._id] : []);
  const engine = 'outfit';
  const [consent, setConsent] = useState(false);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [source, setSource] = useState(tryOnProduct ? 'catalog' : 'cart');
  const [search, setSearch] = useState('');
  const requestId = useRef(null);
  const submitting = useRef(false);
  const loadedResult = useRef(null);
  const userId = user?._id;
  const running = ongoing(job);
  const terminalId = job && !running ? job.id : null;
  const maxItems = 4;
  const cost = selection.length;
  const cartIds = new Set(cart.map(p => p._id));
  const available = candidates.filter(p => p.status === 'active' && p.images?.length && (source !== 'cart' || cartIds.has(p._id)) && p.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    service.getState().then(next => {
      if (mounted) { setState(next); setJob(next.jobs.find(ongoing) || next.jobs.find(j => j.status === 'completed') || null); if (next.jobs.some(j => j.status === 'completed')) setComparison('result'); }
    }).catch(e => { if (mounted) setError(message(e)); });
    return () => { mounted = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    readPortrait(userId).then(value => {
      if (!mounted || !value) return;
      setFile(value.file); setPhotoMode(value.photoMode || 'original');
      setBackgroundId(value.backgroundId || 'white'); setPhotoSaved(true);
      setMeasurements(value.measurements || {}); setMeasurementsSaved(!!value.measurements);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [userId]);
  useEffect(() => {
    if (!file) { setPrepared(null); setPreview(''); setPhotoBusy(false); return; }
    let cancelled = false, url;
    setPhotoBusy(true); setPrepared(null); setError(''); requestId.current = null;
    prepareStylistPhoto(file, photoMode, stylistBackgrounds.find(b => b.id === backgroundId) || stylistBackgrounds[0]).then(value => {
      if (cancelled) return;
      setPrepared(value); url = URL.createObjectURL(value); setPreview(url);
    }).catch(error => { console.warn('Background preview failed:', error.message); if (!cancelled) setError('Chưa xử lý được phông nền. Hãy thử lại hoặc chọn giữ ảnh gốc.'); })
      .finally(() => { if (!cancelled) setPhotoBusy(false); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [file, photoMode, backgroundId]);
  useEffect(() => { if (zoom) zoomDialog.current?.showModal(); else zoomDialog.current?.close(); }, [zoom]);
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
    setComparison('result');
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
    submitting.current = true; setBusy(true); setError(''); setComparison('result');
    requestId.current ||= crypto.randomUUID();
    try {
      setJob(await service.tryOn({ photo: prepared, products: selection, engine, requestId: requestId.current }));
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

  const locked = busy || running;
  const displayResult = comparison === 'result' && job?.status === 'completed';
  const imageUrl = displayResult ? result : preview;
  const persistPhoto = async () => {
    try { await savePortrait(userId, { file, photoMode, backgroundId, measurements }); setPhotoSaved(true); }
    catch { setError('Không lưu được ảnh trên thiết bị. Bạn vẫn có thể thử đồ với ảnh đã chọn.'); }
  };
  const chooseFile = event => {
    const next = event.target.files?.[0]; if (!next) return;
    if (next.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) { setError('Chọn ảnh JPEG, PNG hoặc WebP, tối đa 8 MB.'); event.target.value = ''; return; }
    setFile(next); setPhotoSaved(false); setComparison('original'); setConsent(false); setError('');
  };
  const clearPhoto = async () => {
    try { await deletePortrait(userId); setFile(null); setPrepared(null); setPreview(''); setPhotoSaved(false); setComparison('original'); if (fileInput.current) fileInput.current.value = ''; }
    catch { setError('Chưa xóa được ảnh lưu trên thiết bị. Vui lòng thử lại.'); }
  };
  const saveMeasurements = async () => {
    if (!(Number(measurements.height) >= 80 && Number(measurements.height) <= 250 && Number(measurements.weight) >= 20 && Number(measurements.weight) <= 300)) { setError('Nhập chiều cao từ 80–250 cm và cân nặng từ 20–300 kg.'); return; }
    if (file) await savePortrait(userId, { file, photoMode, backgroundId, measurements }).then(() => setMeasurementsSaved(true)).catch(() => setError('Chưa lưu được số đo trên thiết bị.'));
    else setError('Chọn ảnh trước khi lưu hồ sơ số đo.');
  };
  return <StylistClassicView {...{ user, openAuth, state, file, preview, prepared, photoMode, setPhotoMode, backgroundId, setBackgroundId, photoBusy, photoSaved, setPhotoSaved, comparison, setComparison, zoom, setZoom, helpOpen, setHelpOpen, measurements, setMeasurements, measurementsSaved, setMeasurementsSaved, fileInput, zoomDialog, consent, setConsent, job, setJob, result, busy, error, setError, connection, elapsed, source, setSource, search, setSearch, running, locked, displayResult, imageUrl, available, selection, setSelection, maxItems, cost, requestId, toggle, submit, remove, persistPhoto, chooseFile, clearPhoto, saveMeasurements, browse }} />;
}

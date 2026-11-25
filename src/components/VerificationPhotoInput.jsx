import { useEffect, useId, useState } from 'react';
import Icon from './Icon';
import { Dialog } from './OperationsUI';
import { documentBlob } from '../services/verificationDocumentService';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxSize = 5 * 1024 * 1024;

export default function VerificationPhotoInput({ verificationId, kind, label, hint, saved, file, busy, onSelect, onSave, onRemove }) {
  const inputId = useId();
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState('');
  const [open, setOpen] = useState(false);
  const savedVersion = saved && (saved.updatedAt || saved._id || 'saved');

  useEffect(() => {
    const controller = new AbortController();
    let url;
    const show = blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setPreview({ url, file, savedVersion });
    };
    if (file) show(file);
    else if (savedVersion) {
      documentBlob(verificationId, kind, { signal: controller.signal }).then(show).catch(() => {
        if (!controller.signal.aborted) setPreview({ error: true, file, savedVersion });
      });
    }
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, savedVersion, verificationId, kind]);

  const current = preview?.file === file && preview?.savedVersion === savedVersion ? preview : null;
  const choose = event => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    if (!imageTypes.includes(selected.type)) {
      setFileError('Chọn ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (!selected.size || selected.size > maxSize) {
      setFileError('Chọn ảnh có dung lượng từ 1 byte đến 5 MB.');
      return;
    }
    setFileError('');
    setOpen(false);
    onSelect(selected);
  };

  return <div className="verification-photo">
    <div className="verification-photo-heading">
      <h4>{label}</h4>
      <span className="verification-photo-status" data-saved={!!saved && !file}>{file ? 'Chưa lưu' : saved ? 'Đã lưu' : 'Chưa có ảnh'}</span>
    </div>
    <p>{hint}</p>
    {current?.url ? (
      <button type="button" className="verification-photo-preview" aria-label={`Xem lớn ${label.toLowerCase()}`} onClick={() => setOpen(true)}>
        <img src={current.url} alt={label} />
        <span><Icon name="visibility" /> Xem lớn</span>
      </button>
    ) : (
      <div className="verification-photo-placeholder"><Icon name="image" />{current?.error ? 'Chưa tải được ảnh xem trước' : saved || file ? 'Đang tải ảnh…' : 'Chưa chọn ảnh'}</div>
    )}
    {fileError && <p role="alert" className="verification-photo-error">{fileError}</p>}
    <form className="verification-photo-actions" onSubmit={event => { event.preventDefault(); if (file) onSave(); }}>
      <input id={inputId} className="sr-only verification-photo-input" type="file" aria-label={label} accept={imageTypes.join(',')} disabled={busy} onChange={choose} />
      <label htmlFor={inputId} className="seller-secondary-button" aria-disabled={busy}>{file || saved ? 'Đổi ảnh' : 'Chọn ảnh'}</label>
      {file && <>
        <button className="seller-primary-button" disabled={busy} type="submit" aria-label={`Lưu ${label.toLowerCase()}`}>Lưu ảnh</button>
        <button className="seller-secondary-button" disabled={busy} type="button" onClick={() => { setOpen(false); setFileError(''); onSelect(undefined); }}>Bỏ ảnh đã chọn</button>
      </>}
      {saved && !file && <button className="seller-secondary-button" disabled={busy} type="button" aria-label={`Xóa ${label.toLowerCase()}`} onClick={onRemove}>Xóa ảnh</button>}
    </form>
    {open && current?.url && <div className="verification-photo-viewer">
      <Dialog title={label} onClose={() => setOpen(false)}>
        <img src={current.url} alt={label} />
      </Dialog>
    </div>}
  </div>;
}

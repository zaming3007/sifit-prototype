import { useEffect, useState } from 'react';
import apiClient, { clearAccessToken } from '../services/apiClient';
import { getCurrentUser } from '../services/authService';
import { useApp } from '../context/AppContext';
import { Feedback, Field, Panel } from './MarketplaceUI';
import { getApiErrorMessage } from '../utils/errorHandler';

export function EmailRequest({ verification = false }) {
  const { user } = useApp();
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  if (verification && user?.emailVerified) return null;
  return <form className="space-y-3" onSubmit={async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage('');
    try { const response = await apiClient.post(verification ? '/auth/email-verification' : '/auth/forgot-password', verification ? {} : { email: email.trim() }); setMessage(response.data.message); }
    catch (cause) { setError(getApiErrorMessage(cause)); } finally { setBusy(false); }
  }}>
    {!verification && <><p>Nhập email để nhận liên kết đặt lại mật khẩu có hiệu lực 30 phút.</p><Field label="Email khôi phục"><input className="input-field" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></Field></>}
    <button className="btn-primary" disabled={busy || !!message}>{verification ? 'Gửi email xác minh' : 'Gửi liên kết đặt lại mật khẩu'}</button>
    <Feedback busy={busy} error={error} />{message && <p role="status">{message}</p>}
  </form>;
}

export default function EmailActionPage() {
  const { openAuth, user, syncUserProfile } = useApp();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [purpose] = useState(() => new URLSearchParams(window.location.search).get('action'));
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`); }, []);
  const reset = purpose === 'reset'; const valid = ['reset', 'verify'].includes(purpose) && /^[a-f0-9]{64}$/.test(token);
  return <div className="member-page max-w-xl mx-auto p-6"><Panel title={reset ? 'Đặt lại mật khẩu' : 'Xác minh email'}>
    {!valid ? <p role="alert">Liên kết không đầy đủ. Hãy mở liên kết mới nhất trong email.</p> : message ? <p role="status">{message}</p> : <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setError('');
      if (reset && password !== confirm) { setError('Hai mật khẩu chưa khớp.'); return; } setBusy(true);
      try {
        const response = await apiClient.post(reset ? '/auth/reset-password' : '/auth/verify-email', { token, ...(reset ? { newPassword: password } : {}) });
        setMessage(response.data.message); setPassword(''); setConfirm('');
        if (reset) { clearAccessToken(); window.dispatchEvent(new Event('sifit:session-expired')); }
        else if (user) { try { syncUserProfile(await getCurrentUser()); } catch { /* Verification succeeded independently of this browser session. */ } }
      } catch (cause) { setError(getApiErrorMessage(cause)); } finally { setBusy(false); }
    }}>
      {reset && <><p>Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p><Field label="Mật khẩu mới"><input className="input-field" type="password" autoComplete="new-password" required minLength={8} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}" value={password} onChange={event => setPassword(event.target.value)} /></Field><Field label="Nhập lại mật khẩu mới"><input className="input-field" type="password" autoComplete="new-password" required value={confirm} onChange={event => setConfirm(event.target.value)} /></Field></>}
      <button className="btn-primary" disabled={busy}>{reset ? 'Lưu mật khẩu mới' : 'Xác nhận email của tôi'}</button><Feedback busy={busy} error={error} />
    </form>}
    <button onClick={() => openAuth()}>Về đăng nhập</button>
  </Panel></div>;
}

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getGoogleConfiguration, loadGoogleIdentity } from '../services/googleIdentity';

export default function GoogleSignIn({ onCredential, disabled, revision = 0 }) {
  const { locale } = useLanguage();
  const host = useRef(null);
  const callback = useRef(onCredential);
  const locked = useRef(disabled);
  callback.current = onCredential;
  locked.current = disabled;
  const [status, setStatus] = useState('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    let observer;
    let renewal;
    setStatus('loading');
    host.current?.replaceChildren();
    getGoogleConfiguration().then(async config => {
      if (!live) return;
      if (!config.enabled) { setStatus('unconfigured'); return; }
      const identity = await loadGoogleIdentity();
      if (!live || !host.current) return;
      identity.initialize({
        client_id: config.clientId, nonce: config.nonce, ux_mode: 'popup', auto_select: false,
        callback: response => { if (live && !locked.current && response.credential) callback.current(response.credential); },
      });
      const render = () => {
        if (!live || !host.current) return;
        host.current.replaceChildren();
        identity.renderButton(host.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
          shape: 'rectangular', width: Math.min(400, Math.floor(host.current.clientWidth)), locale });
      };
      render();
      let lastWidth = host.current.clientWidth;
      observer = new ResizeObserver(() => {
        if (host.current?.clientWidth !== lastWidth) { lastWidth = host.current?.clientWidth; render(); }
      });
      observer.observe(host.current);
      renewal = setTimeout(() => setRetry(value => value + 1), 8 * 60 * 1000);
      setStatus('ready');
    }).catch(() => { if (live) setStatus('failed'); });
    return () => { live = false; observer?.disconnect(); clearTimeout(renewal); };
  }, [locale, retry, revision]);
  const text = (vi, en) => locale === 'vi' ? vi : en;
  return <div className="google-signin" aria-busy={status === 'loading' || disabled}>
    <div ref={host} className={`google-signin-host ${disabled ? 'is-disabled' : ''}`} inert={disabled || status !== 'ready' ? true : undefined} hidden={status === 'unconfigured' || status === 'failed'} />
    {status === 'loading' && <p role="status">{text('Đang chuẩn bị đăng nhập Google…', 'Preparing Google sign-in…')}</p>}
    {status === 'unconfigured' && <p>{text('Đăng nhập Google sẽ sớm khả dụng. Bạn có thể tiếp tục bằng email.', 'Google sign-in will be available soon. Please continue with email.')}</p>}
    {status === 'failed' && <p role="alert">{text('Chưa kết nối được Google.', 'Could not connect to Google.')} <button disabled={disabled} onClick={() => setRetry(value => value + 1)}>{text('Thử lại', 'Try again')}</button></p>}
  </div>;
}

import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitch from '../components/LanguageSwitch';
import GoogleSignIn from '../components/GoogleSignIn';
import Icon from '../components/Icon';
import logo from '../image/logo-favicon/sifit-mark.png';
import hero from '../image/banner/banner-log.jpg';
import { EmailRequest } from '../components/EmailAccountActions';

export default function AuthPage() {
  const { loginUser, loginGoogleUser, registerUser, authMode, authRole, openAuth, setCurrentView, setInfoPage, authLoading } = useApp();
  const { t, locale } = useLanguage();
  const text = (vi, en) => locale === 'vi' ? vi : en;
  const isLogin = authMode === 'login';
  const [emailForm, setEmailForm] = useState(isLogin);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: authRole });
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  const [pendingGoogle, setPendingGoogle] = useState(null);
  const [googlePassword, setGooglePassword] = useState('');
  const [googleRevision, setGoogleRevision] = useState(0);
  const googleBusy = useRef(false);
  const changeMode = () => { if (authLoading) return; openAuth(isLogin ? 'signup' : 'login'); setEmailForm(!isLogin); setError(''); setPendingGoogle(null); setGooglePassword(''); };
  const googleSignIn = async (credential, currentPassword) => {
    if (googleBusy.current) return;
    googleBusy.current = true; setError('');
    try {
      const result = await loginGoogleUser({ credential, role: form.role, currentPassword });
      if (result.success) { setPendingGoogle(null); setGooglePassword(''); return; }
      if (result.linkRequired) { setPendingGoogle(credential); return; }
      const messages = {
        'Invalid current password': text('Mật khẩu Sifit hiện tại chưa đúng.', 'Your current Sifit password is incorrect.'),
        'Account is suspended': text('Tài khoản đã bị tạm khóa. Vui lòng liên hệ hỗ trợ.', 'This account is suspended. Please contact support.'),
        'Invalid or expired Google sign-in. Please try again.': text('Phiên đăng nhập Google đã hết hạn hoặc không hợp lệ. Vui lòng chọn Google lại.', 'Google sign-in expired or is invalid. Please choose Google again.'),
      };
      setError(messages[result.message] || result.message);
      if (!currentPassword || result.message !== 'Invalid current password') {
        setPendingGoogle(null); setGooglePassword(''); setGoogleRevision(value => value + 1);
      }
    } finally { googleBusy.current = false; }
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    const result = isLogin
      ? await loginUser(form.email.trim(), form.password)
      : await registerUser(form.name.trim(), form.email.trim(), form.password, form.role);
    if (!result.success) setError(result.message || (isLogin ? 'authError' : 'registerError'));
  };
  const showLegal = () => { setInfoPage('legal'); setCurrentView('info'); };
  return <div className={`auth-page auth-fit ${isLogin ? 'auth-login' : 'auth-signup'}`}>
    <header className="auth-header"><button className="auth-brand" onClick={() => setCurrentView('homepage')} aria-label={t('backHome')}><img src={logo} alt="Sifit" /></button><div><LanguageSwitch /><button className="auth-header-switch" onClick={changeMode}>{isLogin ? t('signup') : t('login')}</button></div></header>
    <div className="auth-layout"><section className="auth-panel">
      <div className="auth-form-container"><p className="eyebrow green">SIFIT / WEAR YOUR STYLE</p><h1>{isLogin ? t('welcomeBack') : t('authTitle')}</h1><p className="auth-description">{isLogin ? t('loginDescription') : t('authDescription')}</p>
        {isLogin && <div className="space-y-3 mb-4"><button type="button" onClick={() => setForgot(value => !value)}>{forgot ? 'Đóng khôi phục mật khẩu' : 'Quên mật khẩu?'}</button>{forgot && <EmailRequest />}</div>}
        {!isLogin && <label className="google-signup-role">{t('role')}<select aria-label={t('role')} disabled={authLoading || !!pendingGoogle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="buyer">{t('buyer')}</option><option value="seller">{t('seller')}</option></select></label>}
        <GoogleSignIn onCredential={credential => googleSignIn(credential)} disabled={authLoading || !!pendingGoogle} revision={googleRevision} />
        {pendingGoogle && <form className="google-link-form" onSubmit={event => { event.preventDefault(); googleSignIn(pendingGoogle, googlePassword); }}>
          <p>{text('Email này đã có tài khoản Sifit. Nhập mật khẩu hiện tại để liên kết Google; đơn hàng và vai trò tài khoản sẽ được giữ nguyên.', 'This email already has a Sifit account. Confirm its password to link Google and keep your orders and account role.')}</p>
          <label>{text('Mật khẩu Sifit hiện tại', 'Current Sifit password')}<input type="password" autoComplete="current-password" required maxLength={128} value={googlePassword} disabled={authLoading} onChange={event => setGooglePassword(event.target.value)} /></label>
          <div><button type="submit" className="auth-submit" disabled={authLoading}>{authLoading ? t('loading') : text('Liên kết và đăng nhập', 'Link and sign in')}</button><button type="button" disabled={authLoading} onClick={() => { setPendingGoogle(null); setGooglePassword(''); setError(''); setGoogleRevision(value => value + 1); }}>{text('Hủy', 'Cancel')}</button></div>
        </form>}
        <div className="social-logins">
          <button aria-label={t('facebook')} title={t('facebook')} onClick={() => setError('socialUnavailable')}><span className="social-facebook" aria-hidden="true">f</span><span className="auth-social-name">Facebook</span></button>
          <button aria-label={t('apple')} title={t('apple')} onClick={() => setError('socialUnavailable')}><svg width="21" height="23" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.4 1.5c.2 1.8-1.3 3.5-3 3.6-.3-1.7 1.4-3.4 3-3.6M19.7 17c-.7 1.6-1.7 3.8-3.5 3.9-1.5.1-1.9-.8-3.5-.8s-2.1.9-3.5.8C6.1 20.7 2 13.1 5.2 8.7c1.1-1.5 3-2 4.5-1.4 1 .4 2 .8 3 .8 1-.1 2.1-1.2 3.7-.9 1.4.1 2.5.6 3.3 1.6-3.1 1.7-2.8 6 .1 7.5z" /></svg><span className="auth-social-name">Apple</span></button>
        </div>
        <div className="auth-or"><span />{t('or')}<span /></div>
        {error && <p className="auth-error" role="alert">{t(error)}</p>}
        {!emailForm ? <button className="auth-submit" onClick={() => setEmailForm(true)}>{t('emailSignup')}</button> : <form className="auth-email-form" onSubmit={handleSubmit}>
          {!isLogin && <label>{t('name')}<input required autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}
          <label>{t('email')}<input type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>{t('password')}<span className="password-input"><input aria-label={t('password')} type={showPassword ? 'text' : 'password'} required minLength={isLogin ? undefined : 8} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder={isLogin ? t('passwordHint') : t('strongPasswordHint')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><button type="button" aria-label={t(showPassword ? 'hidePassword' : 'showPassword')} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'visibility_off' : 'visibility'} /></button></span></label>
          <button type="submit" className="auth-submit" disabled={authLoading}>{authLoading ? t('loading') : isLogin ? t('login') : t('emailSignup')}<Icon name="arrow_forward" /></button>
        </form>}
        {!isLogin && <p className="auth-terms">{t('termsIntro')} <button onClick={showLegal}>{t('terms')}</button> {t('and')} <button onClick={showLegal}>{t('privacy')}</button>.</p>}
        <div className="auth-bottom-links"><p className="auth-mode-link">{isLogin ? t('noAccount') : t('hasAccount')} <button onClick={changeMode}>{isLogin ? t('signup') : t('login')}</button></p><button className="auth-back" onClick={() => setCurrentView('homepage')}><Icon name="arrow_back" />{t('backHome')}</button></div>
      </div>
    </section><aside className="auth-visual"><img src={hero} alt="Pre-loved fashion from Sifit" /><div className="auth-visual-shade" /><div className="auth-visual-copy"><p className="eyebrow">THE SECOND LIFE EDIT</p><h2>{t('heroTitle')}</h2><p>{t('heroDescription')}</p></div><span className="auth-photo-label">SIFIT / EST. FOR A BETTER WARDROBE</span></aside></div>
  </div>;
}

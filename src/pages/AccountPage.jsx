import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Panel, Field, Feedback } from '../components/MarketplaceUI';
import { useAction } from '../hooks/useAction';
import * as authService from '../services/authService';
import BuyerHeading from '../components/BuyerHeading';
import UserAvatar from '../components/UserAvatar';
import Icon from '../components/Icon';

export default function AccountPage({ section = 'all' }) {
  const { user, logoutUser, syncUserProfile } = useApp();
  const { locale } = useLanguage();
  const text = (vi, en) => locale === 'vi' ? vi : en;
  const [form, setForm] = useState({ fullName: user.name, phone: user.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);
  const { busy, error, run, setError } = useAction();
  const role = user.role === 'buyer' ? text('Người mua', 'Buyer') : user.role === 'seller' ? text('Người bán', 'Seller') : text('Quản trị viên', 'Admin');
  const dirty = form.fullName.trim() !== user.name || form.phone.trim() !== (user.phone || '');
  const profileAction = async (action, message) => {
    try { return await action(); }
    catch (cause) {
      if (cause.response?.status >= 500) throw new Error(message);
      if (cause.response?.status === 415) throw new Error(text('Nội dung ảnh không hợp lệ. Vui lòng chọn ảnh JPEG, PNG hoặc WebP khác.', 'This image is invalid. Please choose another JPEG, PNG or WebP.'));
      throw cause;
    }
  };
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const clearFile = () => { setFile(null); if (fileInput.current) fileInput.current.value = ''; };
  const chooseAvatar = event => {
    const selected = event.target.files?.[0];
    setError(''); setNotice('');
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      clearFile(); setError(text('Vui lòng chọn ảnh JPEG, PNG hoặc WebP.', 'Choose a JPEG, PNG or WebP image.')); return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      clearFile(); setError(text('Ảnh đại diện không được lớn hơn 5 MB.', 'Your avatar must be no larger than 5 MB.')); return;
    }
    setFile(selected);
  };
  const saveProfile = event => {
    event.preventDefault(); setNotice('');
    if (!form.fullName.trim()) { setError(text('Vui lòng nhập họ và tên.', 'Please enter your full name.')); return; }
    const phone = form.phone.trim();
    if (phone && (!/^\+?[0-9 ().-]{8,24}$/.test(phone) || phone.replace(/\D/g, '').length < 8)) {
      setError(text('Số điện thoại chưa hợp lệ.', 'Please enter a valid phone number.')); return;
    }
    run(async () => {
      const saved = await profileAction(() => authService.updateProfile({ fullName: form.fullName.trim(), phone }), text('Chưa lưu được thông tin. Vui lòng thử lại.', 'Could not save your profile. Please try again.'));
      syncUserProfile(saved); setForm({ fullName: saved.name, phone: saved.phone || '' });
      setNotice(text('Đã lưu thông tin cá nhân.', 'Your profile has been saved.'));
    });
  };
  const saveAvatar = () => {
    if (!file) return;
    setNotice('');
    run(async () => {
      const saved = await profileAction(() => authService.uploadAvatar(file), text('Chưa tải được ảnh đại diện. Vui lòng thử lại.', 'Could not upload your avatar. Please try again.'));
      syncUserProfile(saved); clearFile();
      setNotice(text('Đã cập nhật ảnh đại diện.', 'Your avatar has been updated.'));
    });
  };
  const removeAvatar = () => {
    setNotice('');
    run(async () => {
      const saved = await profileAction(() => authService.deleteAvatar(), text('Chưa xóa được ảnh đại diện. Vui lòng thử lại.', 'Could not remove your avatar. Please try again.'));
      syncUserProfile(saved); clearFile();
      setNotice(text('Đã xóa ảnh đại diện.', 'Your avatar has been removed.'));
    });
  };
  return <div className="member-page member-account">
    <BuyerHeading title={section === 'profile' ? text('Thông tin cá nhân', 'Personal information') : section === 'password' ? text('Đổi mật khẩu', 'Change password') : text('Thông tin tài khoản', 'Your account')}
      description={section === 'password' ? text('Cập nhật mật khẩu để bảo vệ tài khoản của bạn.', 'Update your password to protect your account.') : text('Cập nhật thông tin và ảnh đại diện của bạn tại Sifit.', 'Make your Sifit profile your own.')} />
    <Feedback busy={busy} error={error} />
    {notice && <p className="profile-success" role="status"><Icon name="task_alt" />{notice}</p>}
    {section !== 'password' && <div className="member-profile-layout">
      <aside className="member-identity">
        <UserAvatar user={preview ? { ...user, avatar: preview } : user} className="member-avatar" />
        <h2>{user.name}</h2><span className="member-badge">{role}</span><p>{user.email}</p>
        <div className="profile-avatar-actions">
          <label className={`profile-avatar-picker ${busy ? 'is-disabled' : ''}`}><Icon name="image" />{text('Chọn ảnh đại diện', 'Choose an avatar')}<input ref={fileInput} aria-label={text('Chọn ảnh đại diện', 'Choose an avatar')} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={chooseAvatar} /></label>
          <p className="profile-avatar-help">JPEG, PNG, WebP · {text('Tối đa 5 MB', 'Up to 5 MB')}</p>
          {file && <div className="profile-avatar-pending"><p>{text('Ảnh mới chưa được lưu.', 'Your new photo is not saved yet.')}</p><button className="profile-avatar-save" disabled={busy} onClick={saveAvatar}>{text('Cập nhật ảnh', 'Save avatar')}</button><button disabled={busy} onClick={() => { clearFile(); setError(''); }}>{text('Hủy chọn ảnh', 'Cancel photo')}</button></div>}
          {user.avatar && <button className="profile-avatar-remove" disabled={busy} onClick={removeAvatar}>{text('Xóa ảnh đại diện', 'Remove avatar')}</button>}
        </div>
      </aside>
      <Panel title={text('Hồ sơ tài khoản', 'Account profile')}><form className="profile-edit-form" onSubmit={saveProfile}>
        <Field label={text('Họ và tên', 'Full name')}><input className="input-field" autoComplete="name" required maxLength={100} value={form.fullName} disabled={busy} onChange={event => { setForm(previous => ({ ...previous, fullName: event.target.value })); setNotice(''); }} /></Field>
        <Field label={text('Số điện thoại', 'Phone number')}><input className="input-field" type="tel" autoComplete="tel" maxLength={24} placeholder={text('Thêm số điện thoại của bạn', 'Add your phone number')} value={form.phone} disabled={busy} onChange={event => { setForm(previous => ({ ...previous, phone: event.target.value })); setNotice(''); }} /></Field>
        <Field label="Email"><input className="input-field" type="email" autoComplete="email" value={user.email} readOnly /></Field>
        <p className="profile-field-note">{text('Email được dùng để đăng nhập tài khoản.', 'This email is used to sign in to your account.')}</p>
        <dl className="profile-account-details"><div><dt>{text('Loại tài khoản', 'Account type')}</dt><dd>{role}</dd></div><div><dt>{text('Xác minh email', 'Email verification')}</dt><dd>{user.emailVerified ? text('Đã xác minh', 'Verified') : text('Chưa xác minh', 'Not verified')}</dd></div></dl>
        <div className="profile-edit-actions"><button type="submit" className="btn-primary" disabled={busy || !dirty}><Icon name="task_alt" />{text('Lưu thay đổi', 'Save changes')}</button><button type="button" className="profile-reset" disabled={busy || !dirty} onClick={() => { setForm({ fullName: user.name, phone: user.phone || '' }); setError(''); setNotice(''); }}>{text('Hủy thay đổi', 'Discard changes')}</button></div>
      </form></Panel>
    </div>}
    {section !== 'profile' && user.hasPassword === false && <Panel title="Đăng nhập bằng Google"><p>Tài khoản này đăng nhập bằng Google và chưa có mật khẩu Sifit. Để đổi mật khẩu đăng nhập, hãy quản lý mật khẩu trong tài khoản Google của bạn.</p></Panel>}
    {section !== 'profile' && user.hasPassword !== false && <div className="member-password-layout"><aside className="member-security-note"><span className="member-feature-icon"><Icon name="verified_user" /></span><h2>Bảo mật tài khoản</h2><p>Sử dụng mật khẩu riêng cho tài khoản Sifit.</p><p>Sau khi đổi mật khẩu thành công, bạn sẽ được đăng xuất để đăng nhập lại.</p></aside><Panel title="Cập nhật mật khẩu"><form className="space-y-4" onSubmit={event => { event.preventDefault(); run(async () => { await authService.changePassword(passwords); await logoutUser(); }); }}>
      <Field label="Mật khẩu hiện tại"><input className="input-field" type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} /></Field>
      <Field label="Mật khẩu mới (ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt)"><input className="input-field" type="password" autoComplete="new-password" required minLength={8} value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} /></Field>
      <button className="btn-primary" disabled={busy}>Đổi mật khẩu và đăng xuất</button>
    </form></Panel></div>}
  </div>;
}

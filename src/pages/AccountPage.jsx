import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmailRequest } from '../components/EmailAccountActions';
import { useLanguage } from '../context/LanguageContext';
import { Panel, Field, Feedback } from '../components/MarketplaceUI';
import { useAction } from '../hooks/useAction';
import * as authService from '../services/authService';
import BuyerHeading from '../components/BuyerHeading';
import UserAvatar from '../components/UserAvatar';
import Icon from '../components/Icon';

export default function AccountPage({ section = 'all' }) {
  const { user, cart, setCurrentView, logoutUser, syncUserProfile } = useApp();
  const { locale } = useLanguage();
  const text = (vi, en) => locale === 'vi' ? vi : en;
  const buyerWardrobeLinks = [
    ['checkout', text('Đơn mua & giỏ hàng', 'Orders & bag'), 'receipt_long', cart?.length > 0 ? cart.length : null],
    ['chat', text('Chat', 'Messages'), 'chat_bubble_outline', null],
    ['wishlist', text('Yêu thích', 'Wishlist'), 'favorite_border', null],
    ['offers', text('Đề nghị giá', 'My offers'), 'payments', null],
    ['following', text('Shop đang theo dõi', 'Following shops'), 'storefront', null],
    ['notifications', text('Thông báo', 'Notifications'), 'notifications_none', null],
    ['account-addresses', text('Địa chỉ nhận hàng', 'Addresses'), 'location_on', null],
    ['report-history', text('Báo cáo của tôi', 'My reports'), 'flag', null],
  ];
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
      setNotice(text('Đã lưu thông tin cá nhân thành công.', 'Your profile has been saved.'));
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

  return (
    <div className="member-page member-account max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 animate-fade-in space-y-6">
      <BuyerHeading
        title={section === 'profile' ? text('Thông tin cá nhân', 'Personal information') : section === 'password' ? text('Đổi mật khẩu', 'Change password') : text('Thông tin tài khoản', 'Your account')}
        description={section === 'password' ? text('Cập nhật mật khẩu để bảo vệ tài khoản của bạn.', 'Update your password to protect your account.') : text('Cập nhật thông tin và ảnh đại diện của bạn tại Sifit.', 'Make your Sifit profile your own.')}
      />

      <Feedback busy={busy} error={error} />
      {notice && (
        <p className="profile-success p-3.5 px-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center gap-2" role="status">
          <Icon name="task_alt" className="text-emerald-600 text-sm" />
          {notice}
        </p>
      )}

      {section !== 'password' && (
        <div className="member-profile-layout grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Avatar & Identity Box */}
          <aside className="member-identity bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="relative mb-3">
              <UserAvatar user={preview ? { ...user, avatar: preview } : user} className="member-avatar w-24 h-24 rounded-full object-cover shadow-sm border-2 border-white ring-2 ring-primary/20" />
            </div>
            <h2 className="font-heading font-bold text-lg text-gray-900">{user.name}</h2>
            <span className="member-badge bg-primary/10 text-primary text-[11px] font-bold px-3 py-0.5 rounded-full mt-1 mb-2">
              {role}
            </span>
            <p className="text-xs text-gray-500 mb-4">{user.email}</p>

            <div className="profile-avatar-actions w-full space-y-2 pt-4 border-t border-gray-100">
              <label className={`profile-avatar-picker btn-outline w-full py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer ${busy ? 'is-disabled opacity-50' : ''}`}>
                <Icon name="image" className="text-sm" />
                {text('Chọn ảnh đại diện', 'Choose an avatar')}
                <input ref={fileInput} aria-label={text('Chọn ảnh đại diện', 'Choose an avatar')} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={chooseAvatar} className="hidden" />
              </label>
              <p className="profile-avatar-help text-[10px] text-gray-400">JPEG, PNG, WebP · {text('Tối đa 5 MB', 'Up to 5 MB')}</p>

              {file && (
                <div className="profile-avatar-pending bg-amber-50 p-3 rounded-2xl border border-amber-200/60 text-xs space-y-2">
                  <p className="text-amber-800 font-medium">{text('Ảnh mới chưa được lưu.', 'Your new photo is not saved yet.')}</p>
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1 py-1.5 text-xs inline-flex items-center justify-center gap-1" disabled={busy} onClick={saveAvatar}>
                      <Icon name="task_alt" className="text-xs" />
                      {text('Lưu ảnh', 'Save')}
                    </button>
                    <button className="btn-outline flex-1 py-1.5 text-xs" disabled={busy} onClick={() => { clearFile(); setError(''); }}>
                      {text('Hủy', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}

              {user.avatar && (
                <button className="profile-avatar-remove text-xs text-red-500 hover:text-red-700 hover:underline pt-1 inline-flex items-center gap-1 cursor-pointer" disabled={busy} onClick={removeAvatar}>
                  <Icon name="delete" className="text-xs" />
                  {text('Xóa ảnh đại diện', 'Remove avatar')}
                </button>
              )}
            </div>
          </aside>

          {/* Form edit profile & Wardrobe shortcuts */}
          <div className="md:col-span-2 space-y-6">
            {user.role === 'buyer' && (
              <Panel title={text('Tủ đồ & Cá nhân', 'Wardrobe & Personal')} icon="shopping_bag">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {buyerWardrobeLinks.map(([view, label, icon, badge]) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setCurrentView(view)}
                      className="group relative flex flex-col items-start gap-2 p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-emerald-50/70 hover:border-primary/30 transition-all text-left cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform">
                        <Icon name={icon} className="text-lg" />
                      </div>
                      <span className="text-xs font-bold text-gray-800 group-hover:text-primary leading-snug">
                        {label}
                      </span>
                      {badge !== null && (
                        <span className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title={text('Hồ sơ tài khoản', 'Account profile')} icon="person">
              <form className="profile-edit-form space-y-4" onSubmit={saveProfile}>
                <Field label={text('Họ và tên', 'Full name')} icon="person">
                  <input className="input-field" autoComplete="name" required maxLength={100} value={form.fullName} disabled={busy} onChange={event => { setForm(previous => ({ ...previous, fullName: event.target.value })); setNotice(''); }} />
                </Field>
                <Field label={text('Số điện thoại', 'Phone number')} icon="phone">
                  <input className="input-field" type="tel" autoComplete="tel" maxLength={24} placeholder={text('Thêm số điện thoại của bạn', 'Add your phone number')} value={form.phone} disabled={busy} onChange={event => { setForm(previous => ({ ...previous, phone: event.target.value })); setNotice(''); }} />
                </Field>
                <Field label="Email đăng nhập" icon="email">
                  <input className="input-field bg-gray-100/70 text-gray-500 cursor-not-allowed" type="email" autoComplete="email" value={user.email} readOnly />
                </Field>
                <p className="profile-field-note text-[11px] text-gray-400">
                  {text('Email được dùng để đăng nhập và nhận thông báo đơn hàng.', 'This email is used to sign in and receive order updates.')}
                </p>

                <dl className="profile-account-details grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                  <div>
                    <dt className="text-gray-400 font-bold uppercase text-[10px]">{text('Loại tài khoản', 'Account type')}</dt>
                    <dd className="font-extrabold text-gray-800 mt-0.5">{role}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 font-bold uppercase text-[10px]">{text('Xác minh email', 'Email verification')}</dt>
                    <dd className="font-extrabold text-primary mt-0.5 flex items-center gap-1">
                      <Icon name={user.emailVerified ? 'verified_user' : 'info'} className="text-xs" />
                      {user.emailVerified ? text('Đã xác minh', 'Verified') : text('Chưa xác minh', 'Not verified')}
                    </dd>
                  </div>
                </dl>

                <div className="profile-edit-actions flex items-center gap-3 pt-2">
                  <button type="submit" className="btn-primary py-3 px-6 text-xs font-bold inline-flex items-center gap-2" disabled={busy || !dirty}>
                    <Icon name="task_alt" className="text-sm" />
                    {text('Lưu thay đổi', 'Save changes')}
                  </button>
                  <button
                    type="button"
                    className="btn-outline py-3 px-4 text-xs font-bold inline-flex items-center gap-1.5"
                    disabled={busy || !dirty}
                    onClick={() => { setForm({ fullName: user.name, phone: user.phone || '' }); setError(''); setNotice(''); }}
                  >
                    <Icon name="close" className="text-xs" />
                    {text('Hủy thay đổi', 'Discard changes')}
                  </button>
                </div>
              </form>
            </Panel>
          </div>
        </div>
      )}

      {section === 'profile' && !user.emailVerified && (
        <Panel title="Xác minh email" icon="email">
          <EmailRequest verification />
        </Panel>
      )}

      {section !== 'profile' && user.hasPassword === false && (
        <Panel title="Đăng nhập bằng Google" icon="verified_user">
          <p className="text-xs text-gray-600 leading-relaxed">
            Tài khoản này được đăng nhập qua liên kết tài khoản Google và chưa có mật khẩu Sifit riêng biệt. Để đổi mật khẩu, vui lòng quản lý trực tiếp trong trang quản lý tài khoản Google.
          </p>
        </Panel>
      )}

      {section !== 'profile' && user.hasPassword !== false && (
        <div className="member-password-layout grid grid-cols-1 md:grid-cols-3 gap-8">
          <aside className="member-security-note bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <span className="member-feature-icon w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="lock" className="text-2xl" />
            </span>
            <h2 className="font-heading font-bold text-base text-gray-900">Bảo mật tài khoản</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Sử dụng mật khẩu mạnh kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt để bảo vệ tài khoản tốt nhất.
            </p>
            <p className="text-[11px] text-gray-400">
              Sau khi đổi mật khẩu thành công, bạn sẽ được đăng xuất để xác nhận lại phiên làm việc an toàn.
            </p>
          </aside>

          <div className="md:col-span-2">
            <Panel title="Cập nhật mật khẩu" icon="lock">
              <form
                className="space-y-4"
                onSubmit={event => {
                  event.preventDefault();
                  run(async () => {
                    await authService.changePassword(passwords);
                    await logoutUser();
                  });
                }}
              >
                <Field label="Mật khẩu hiện tại" icon="lock">
                  <input
                    className="input-field"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={passwords.currentPassword}
                    onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  />
                </Field>
                <Field label="Mật khẩu mới (ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt)" icon="lock_open">
                  <input
                    className="input-field"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={passwords.newPassword}
                    onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                  />
                </Field>
                <button className="btn-primary py-3 px-6 text-xs font-bold inline-flex items-center gap-2" disabled={busy}>
                  <Icon name="task_alt" className="text-sm" />
                  Đổi mật khẩu và đăng xuất
                </button>
              </form>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';

export default function UserAvatar({ user, className = '' }) {
  const [failedSource, setFailedSource] = useState(null);
  const name = user?.name || user?.fullName || '';
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || 'S';
  return <span className={`user-avatar ${className}`} aria-hidden="true">
    {user?.avatar && failedSource !== user.avatar
      ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" onError={() => setFailedSource(user.avatar)} />
      : initials}
  </span>;
}

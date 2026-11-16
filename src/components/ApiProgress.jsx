import { useEffect, useState } from 'react';
import { subscribeActivity } from '../utils/apiActivity';
import { useLanguage } from '../context/LanguageContext';

export default function ApiProgress() {
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  const { locale } = useLanguage();
  const active = pending > 0;
  useEffect(() => subscribeActivity(setPending), []);
  useEffect(() => {
    if (!active) { setVisible(false); setSlow(false); return; }
    const show = setTimeout(() => setVisible(true), 400);
    const delay = setTimeout(() => setSlow(true), 12000);
    return () => { clearTimeout(show); clearTimeout(delay); };
  }, [active]);
  if (!visible) return null;
  return <div className="api-progress-shell"><div className="api-progress-line" role="progressbar" aria-label={locale === 'en' ? 'Loading' : 'Đang xử lý'}><span /></div><div className="api-progress-status" role="status">{slow ? (locale === 'en' ? 'Taking a little longer. Your request is still being processed…' : 'Kết nối đang chậm. Yêu cầu của bạn vẫn đang được xử lý…') : (locale === 'en' ? 'One moment…' : 'Đang xử lý…')}</div></div>;
}

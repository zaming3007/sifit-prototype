import { useEffect, useState } from 'react';
import { useAction } from '../hooks/useAction';
import * as api from '../services/shopFollowService';
export default function ShopNotificationToggle({ shopId, enabled, disabled = false, label = 'Thông báo sản phẩm mới', onSaved }) {
  const [checked, setChecked] = useState(enabled); const { busy, error, run } = useAction();
  useEffect(() => setChecked(enabled), [enabled]);
  return <div><label className="shop-follow-notifications"><input type="checkbox" checked={checked} disabled={disabled || busy} onChange={event => {
    const next = event.target.checked; const previous = checked; setChecked(next);
    run(async () => { try { const state = await api.preferences(shopId, next); onSaved?.(state); } catch (cause) { setChecked(previous); throw cause; } });
  }} />{label}</label>{error && <p role="alert">{error}</p>}</div>;
}

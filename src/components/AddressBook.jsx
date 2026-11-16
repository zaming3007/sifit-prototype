import { useCallback, useEffect, useState } from 'react';
import * as addressService from '../services/addressService';
import { Panel, Field, Feedback } from './MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { idOf } from '../utils/marketplace';
import { useApp } from '../context/AppContext';
import Icon from './Icon';


const empty = { recipientName: '', phone: '', addressLine: '', ward: '', province: '', isDefault: false };
export default function AddressBook({ onChange }) {
  const { user } = useApp();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const addressType = user.role === 'buyer' ? 'SHIPPING' : 'BOTH';
  let nextNumber = 1;
  while (items.some(item => item.label === `Địa chỉ ${nextNumber}`)) nextNumber += 1;
  const nextLabel = `Địa chỉ ${nextNumber}`;
  const { busy, error, run } = useAction();
  const reload = useCallback(async () => { const data = await addressService.listAddresses(); setItems(data); onChange?.(data); }, [onChange]);
  useEffect(() => { run(reload); }, [run, reload]);
  const save = event => {
    event.preventDefault();
    setNotice('');
    run(async () => {
      const payload = { ...form, label: editing ? form.label : nextLabel, addressType };
      if (editing) await addressService.updateAddress(editing, payload);
      else await addressService.createAddress(payload);
      setForm(empty); setEditing(null); setAdding(false); await reload();
      setNotice('Đã lưu địa chỉ.');
    });
  };
  return <div className="member-address-book"><Panel title="Sổ địa chỉ"><Feedback error={error} busy={busy} />
    {notice && <p role="status" className="p-3 bg-green-50 text-green-800 rounded-xl">{notice}</p>}
    {!items.length && !busy && <p className="member-empty-copy">Chưa có địa chỉ. Thêm địa chỉ nhận hàng đầu tiên của bạn.</p>}
    <div className="member-address-list">{items.map(item => <div key={idOf(item)} className={`member-address-card border rounded-xl p-3 ${item.isDefault ? 'is-default' : ''}`}>
      <div className="member-address-title"><span className="member-feature-icon"><Icon name="location_on" /></span><strong>{item.label}</strong>{item.isDefault && <span className="member-badge">Mặc định</span>}</div><p className="member-address-person">{item.recipientName} · {item.phone}</p>
      <p className="member-address-copy">{item.addressLine}, {item.ward}, {item.province}</p>
      <div className="member-address-actions flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => { setEditing(idOf(item)); setAdding(false); setForm({ ...empty, ...item }); setNotice(''); }}>Sửa</button>
        <button disabled={busy} onClick={() => run(async () => { await addressService.deleteAddress(idOf(item)); await reload(); })}>Xóa</button>
        {!item.isDefault && <button disabled={busy} onClick={() => run(async () => { await addressService.setDefaultAddress(idOf(item)); await reload(); })}>Đặt mặc định</button>}
      </div>
    </div>)}</div>
    {!adding && !editing && <button disabled={busy} type="button" className="btn-primary" onClick={() => { setForm(empty); setAdding(true); setNotice(''); }}>Thêm địa chỉ</button>}
    {(adding || editing) && <form onSubmit={save} className="member-address-form grid sm:grid-cols-2 gap-3">
      <h3 className="sm:col-span-2 font-semibold">{editing ? form.label : nextLabel}</h3>
      {[['Người nhận', 'recipientName'], ['Số điện thoại', 'phone'], ['Số nhà, tên đường', 'addressLine'], ['Phường/Xã', 'ward'], ['Tỉnh/Thành phố', 'province']].map(([label, key]) => <Field key={key} label={label}><input className="input-field" required value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></Field>)}
      <label className="sm:col-span-2"><input type="checkbox" checked={form.isDefault} onChange={event => setForm({ ...form, isDefault: event.target.checked })} /> Địa chỉ mặc định</label>
      <div className="sm:col-span-2 flex flex-wrap gap-3 pt-3">
        <button disabled={busy} className="btn-primary px-6 py-3 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-50" type="submit">{busy ? 'Đang lưu…' : 'Lưu địa chỉ'}</button>
        <button type="button" onClick={() => { setEditing(null); setAdding(false); setForm(empty); }}>{editing ? 'Hủy sửa' : 'Hủy thêm'}</button>
      </div>
    </form>}
  </Panel></div>;
}

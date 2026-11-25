import { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import banks from '../data/refundBanks.json';
import { useAction } from '../hooks/useAction';
import { getApiErrorMessage } from '../utils/errorHandler';
import { Panel, Field, Feedback } from './MarketplaceUI';

const emptyBank = { bankName: '', bankBin: '', accountNumber: '', accountName: '' };

export default function SellerBankAccount({ onSaved }) {
  const [form, setForm] = useState(emptyBank);
  const [unlistedBank, setUnlistedBank] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const { busy: saving, error, run, setError } = useAction();
  const busy = saving || loading;

  useEffect(() => {
    let live = true;
    apiClient.get('/seller/bank-account').then(response => {
      const bank = response.data.data.bankAccount;
      if (!live || !bank) return;
      const { bankName, bankBin, accountNumber, accountName } = bank;
      setForm({ bankName, bankBin, accountNumber, accountName });
      if (!banks.some(item => item.bin === bankBin)) setUnlistedBank({ bankName, bankBin });
    }).catch(cause => {
      if (live) setError(getApiErrorMessage(cause) || 'Không tải được tài khoản nhận tiền.');
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [setError]);

  const selectBank = event => {
    const bankBin = event.target.value;
    const bank = banks.find(item => item.bin === bankBin);
    const bankName = bank?.shortName ?? (bankBin === unlistedBank?.bankBin ? unlistedBank.bankName : '');
    setForm(previous => ({ ...previous, bankName, bankBin }));
  };

  const save = event => {
    event.preventDefault();
    setNotice('');
    run(async () => {
      await apiClient.put('/seller/bank-account', form);
      if (form.bankBin !== unlistedBank?.bankBin) setUnlistedBank(null);
      await onSaved?.();
      setNotice('Đã lưu tài khoản nhận tiền.');
    });
  };

  return <Panel title="Tài khoản ngân hàng nhận tiền">
    <p className="seller-payout-hint">Đổi tài khoản sẽ cần xác minh lại. Khoản chi đã duyệt dùng tài khoản đã chốt.</p>
    <Feedback busy={busy} error={error} />
    {notice && <p role="status">{notice}</p>}
    <form className="seller-bank-form" onSubmit={save}>
      <div className="seller-bank-fields">
      <Field label="Tên ngân hàng">
        <select className="input-field" required value={form.bankBin} disabled={busy} onChange={selectBank}>
          <option value="">Chọn ngân hàng của bạn</option>
          {unlistedBank && <option value={unlistedBank.bankBin}>{unlistedBank.bankName}</option>}
          {banks.map(bank => <option key={bank.bin} value={bank.bin}>{bank.shortName} — {bank.name}</option>)}
        </select>
      </Field>
      <Field label="Số tài khoản nhận tiền">
        <input className="input-field" required maxLength={30} pattern="[A-Za-z0-9]{4,30}" value={form.accountNumber} disabled={busy} onChange={event => setForm({ ...form, accountNumber: event.target.value })} />
      </Field>
      <Field label="Tên chủ tài khoản">
        <input className="input-field" required minLength={3} maxLength={100} value={form.accountName} disabled={busy} onChange={event => setForm({ ...form, accountName: event.target.value })} />
      </Field>
      </div>
      <button className="seller-primary-button" disabled={busy}>Lưu tài khoản nhận tiền</button>
    </form>
  </Panel>;
}

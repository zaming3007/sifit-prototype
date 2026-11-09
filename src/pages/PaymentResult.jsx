import { useEffect, useState } from 'react';
import * as service from '../services/paymentService';
import { useApp } from '../context/AppContext';
import PaymentPanel from '../components/PaymentPanel';
import { getApiErrorMessage } from '../utils/errorHandler';
export default function PaymentResult() {
  const { fetchOrders, setCurrentView } = useApp();
  const [payment, setPayment] = useState(null); const [error, setError] = useState('');
  useEffect(() => { let live = true; const id = new URLSearchParams(window.location.search).get('paymentId');
    if (!/^[a-f\d]{24}$/i.test(id || '')) { setError('Đường dẫn thanh toán không hợp lệ.'); return; }
    service.getPayment(id).then(result => { if (live) setPayment(result); }).catch(cause => { if (live) setError(getApiErrorMessage(cause)); });
    return () => { live = false; }; }, []);
  return <div className="member-page"><h1>Kết quả thanh toán</h1><p>Trạng thái được lấy từ server Sifit và đối soát PayOS.</p>{error && <p role="alert">{error}</p>}{payment ? <PaymentPanel payment={payment} onUpdate={setPayment} onConfirmed={fetchOrders} /> : !error && <p role="status">Đang kiểm tra thanh toán…</p>}<button className="btn-primary" onClick={() => setCurrentView('checkout')}>Về đơn mua</button></div>;
}

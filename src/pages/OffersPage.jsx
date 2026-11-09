import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import BuyerHeading from '../components/BuyerHeading';
import OfferCard from '../components/OfferCard';
import { offerStatusLabels } from '../constants/offers';
import { Pager, ResourceFeedback } from '../components/OperationsUI';
import Icon from '../components/Icon';
import usePagedResource from '../hooks/usePagedResource';
export default function OffersPage({ embedded = false }) {
  const { user } = useApp(); const [status, setStatus] = useState('');
  const resource = usePagedResource(user.role === 'seller' ? '/seller/offers' : '/offers/my', status ? { status } : {});
  useEffect(() => { window.addEventListener('sifit:notifications', resource.reload); return () => window.removeEventListener('sifit:notifications', resource.reload); }, [resource.reload]);
  return <div className={embedded ? 'offers-page' : 'member-page offers-page'}>
    {!embedded && <BuyerHeading title="Đề nghị giá" description="Những lời đề nghị, phản hồi từ shop và mức giá bạn đã thống nhất."><button className="member-secondary" disabled={resource.busy} onClick={resource.reload}><Icon name="refresh" />Làm mới</button></BuyerHeading>}
    <div className="offers-toolbar"><label>Trạng thái<select aria-label="Trạng thái" value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả đề nghị</option>{Object.entries(offerStatusLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>{embedded && <button disabled={resource.busy} className="member-secondary" onClick={resource.reload}>Làm mới đề nghị</button>}</div>
    <ResourceFeedback resource={resource} /><div className="offers-grid">{resource.items.map(offer => <OfferCard key={offer._id} offer={offer} onChange={resource.reload} showHistory />)}</div><Pager resource={resource} />
  </div>;
}

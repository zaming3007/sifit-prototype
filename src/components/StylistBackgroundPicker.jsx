import { stylistBackgrounds } from '../data/stylistBackgrounds';
import Icon from './Icon';
import LocalizedContent from './LocalizedContent';
export default function StylistBackgroundPicker({ value, onChange, disabled }) {
  return <LocalizedContent><details className="stylist-background-picker"><summary>Phông nền <span>{stylistBackgrounds.find(b => b.id === value)?.label}</span></summary><div role="group" aria-label="Chọn phông nền">{stylistBackgrounds.map(b => <button key={b.id} type="button" role="radio" aria-checked={b.id === value} disabled={disabled} onClick={() => onChange(b.id)}>{b.image ? <img src={b.image} alt="" loading="lazy"/> : <span className="stylist-white-background"><Icon name="checkroom"/></span>}<span>{b.label}</span></button>)}</div></details></LocalizedContent>;
}

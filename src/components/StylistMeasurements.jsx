import LocalizedContent from './LocalizedContent';

const fields = [['height', 'Chiều cao', 'cm', 80, 250], ['weight', 'Cân nặng', 'kg', 20, 300], ['bust', 'Vòng ngực', 'cm', 30, 250], ['waist', 'Vòng eo', 'cm', 30, 250], ['hips', 'Vòng hông', 'cm', 30, 250]];
export default function StylistMeasurements({ value, onChange, disabled, onSave, saved }) {
  return <LocalizedContent><details className="stylist-measurements" open><summary>Số đo <span>Chiều cao & cân nặng bắt buộc</span></summary><div>{fields.map(([key, label, unit, min, max]) => <label key={key}>{label}{['height', 'weight'].includes(key) ? <b className="stylist-required"> *</b> : <small> (tùy chọn)</small>}<div><input type="number" required={['height', 'weight'].includes(key)} aria-label={label} placeholder="—" min={min} max={max} disabled={disabled} value={value[key] || ''} onChange={e => onChange({ ...value, [key]: e.target.value })}/><span>{unit}</span></div></label>)}</div>{onSave && <button className="btn-outline stylist-save-measurements" type="button" disabled={disabled} onClick={onSave}>{saved ? 'Đã lưu số đo' : 'Lưu số đo'}</button>}</details></LocalizedContent>;
}

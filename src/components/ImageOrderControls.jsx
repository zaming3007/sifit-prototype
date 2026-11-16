import Icon from './Icon';

export default function ImageOrderControls({ index, count, disabled, onMove, offset = 0 }) {
  return <div className="image-order-controls">
    <span>{index + offset === 0 ? 'Ảnh bìa' : `Ảnh ${index + offset + 1}`}</span>
    <div>
      <button type="button" disabled={disabled || index === 0} aria-label={`Đưa ảnh ${index + 1} về trước`} onClick={() => onMove(index, index - 1)}><Icon name="arrow_back" /></button>
      <button type="button" disabled={disabled || index === count - 1} aria-label={`Đưa ảnh ${index + 1} ra sau`} onClick={() => onMove(index, index + 1)}><Icon name="arrow_forward" /></button>
    </div>
    {index > 0 && offset === 0 && <button type="button" disabled={disabled} onClick={() => onMove(index, 0)} aria-label={`Dùng ảnh ${index + 1} làm ảnh bìa`}>Đặt làm bìa</button>}
  </div>;
}

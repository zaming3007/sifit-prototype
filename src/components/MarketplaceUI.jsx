import { cloneElement, useId } from 'react';
import Icon from './Icon';

export function Feedback({ error, busy }) {
  return (
    <>
      {error && (
        <div role="alert" className="p-3.5 px-4 bg-red-50 border border-red-200/80 text-red-700 rounded-2xl whitespace-pre-line text-xs font-medium flex items-start gap-2.5 my-3 shadow-xs">
          <Icon name="error" className="text-base text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}
      {busy && (
        <div role="status" className="p-3 px-4 bg-gray-50 border border-gray-100 text-gray-600 rounded-2xl text-xs font-medium flex items-center gap-2.5 my-3 animate-pulse">
          <Icon name="refresh" className="animate-spin text-primary text-sm flex-shrink-0" />
          <span>Đang xử lý dữ liệu…</span>
        </div>
      )}
    </>
  );
}

export function Panel({ title, children, icon }) {
  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
      {title && (
        <h2 className="font-heading font-bold text-lg text-gray-900 flex items-center gap-2.5 pb-2 border-b border-gray-50">
          {icon && <Icon name={icon} className="text-primary text-lg" />}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Tabs({ items, value, onChange, disabled = false }) {
  return (
    <nav className="flex gap-2 flex-wrap" aria-label="Chức năng">
      {items.map(([id, label, icon]) => {
        const isSelected = value === id;
        return (
          <button
            key={id}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`px-4 py-2 rounded-full border text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all duration-200 ${
              isSelected
                ? 'bg-primary text-white border-primary shadow-sm hover:opacity-95'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {icon && <Icon name={icon} className={`text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`} />}
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function Field({ label, children, icon }) {
  const id = useId();
  return (
    <div className="space-y-1.5 text-xs font-semibold text-gray-700">
      <label className="flex items-center gap-1.5" htmlFor={id}>
        {icon && <Icon name={icon} className="text-gray-400 text-xs" />}
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}

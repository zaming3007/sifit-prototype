import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Icon from './Icon';

const toneStyles = {
  emerald: {
    border: 'border-emerald-200/90',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    iconBg: 'bg-emerald-600 text-white shadow-emerald-600/25',
    bar: 'bg-emerald-600',
  },
  rose: {
    border: 'border-rose-200/90',
    badgeBg: 'bg-rose-100 text-rose-800',
    iconBg: 'bg-rose-500 text-white shadow-rose-500/25',
    bar: 'bg-rose-500',
  },
  amber: {
    border: 'border-amber-200/90',
    badgeBg: 'bg-amber-100 text-amber-800',
    iconBg: 'bg-amber-500 text-white shadow-amber-500/25',
    bar: 'bg-amber-500',
  },
  indigo: {
    border: 'border-indigo-200/90',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    iconBg: 'bg-indigo-600 text-white shadow-indigo-600/25',
    bar: 'bg-indigo-600',
  },
  sky: {
    border: 'border-sky-200/90',
    badgeBg: 'bg-sky-100 text-sky-800',
    iconBg: 'bg-sky-600 text-white shadow-sky-600/25',
    bar: 'bg-sky-600',
  },
  teal: {
    border: 'border-teal-200/90',
    badgeBg: 'bg-teal-100 text-teal-800',
    iconBg: 'bg-teal-600 text-white shadow-teal-600/25',
    bar: 'bg-teal-600',
  },
  red: {
    border: 'border-red-200/90',
    badgeBg: 'bg-red-100 text-red-800',
    iconBg: 'bg-red-600 text-white shadow-red-600/25',
    bar: 'bg-red-600',
  },
};

export default function ActionToastCenter() {
  const [toasts, setToasts] = useState([]);
  const { locale } = useLanguage();

  useEffect(() => {
    const handleToast = event => {
      const item = event.detail;
      if (!item) return;
      setToasts(prev => [item, ...prev].slice(0, 4));

      const duration = item.duration || 3800;
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== item.id));
      }, duration);
    };

    window.addEventListener('sifit:action-toast', handleToast);
    return () => window.removeEventListener('sifit:action-toast', handleToast);
  }, []);

  const dismiss = id => {
    setToasts(prev => prev.filter(item => item.id !== id));
  };

  if (!toasts.length) return null;

  return (
    <div
      className="action-toast-stack fixed top-20 right-4 sm:right-6 z-[80] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-[370px] pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(toast => {
        const style = toneStyles[toast.tone] || toneStyles.emerald;
        const categoryLabel =
          locale === 'vi' ? toast.categoryLabelVi : toast.categoryLabelEn;

        return (
          <div
            key={toast.id}
            role="status"
            className={`action-toast-card pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md border ${style.border} p-3.5 shadow-xl flex items-start gap-3 animate-slide-up transition-all`}
          >
            {/* Category Icon */}
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${style.iconBg}`}
            >
              <Icon name={toast.icon || 'task_alt'} className="text-lg" />
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${style.badgeBg}`}
                >
                  {categoryLabel}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {locale === 'vi' ? 'Vừa xong' : 'Just now'}
                </span>
              </div>
              <p className="font-heading font-bold text-xs sm:text-[13px] text-gray-900 leading-snug">
                {toast.title}
              </p>
              {toast.message && (
                <p className="text-[11.5px] text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
                  {toast.message}
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={locale === 'vi' ? 'Đóng thông báo' : 'Dismiss notification'}
              className="w-6 h-6 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
            >
              <Icon name="close" className="text-xs" />
            </button>

            {/* Bottom Progress Accent */}
            <span
              className={`action-toast-progress absolute bottom-0 left-0 h-[3px] ${style.bar}`}
              style={{
                animationDuration: `${toast.duration || 3800}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

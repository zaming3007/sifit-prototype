import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../components/Icon';
import LocalizedContent from '../components/LocalizedContent';
import * as aiStylistService from '../services/aiStylistService';
import { money } from '../utils/marketplace';

const DEFAULT_PROMPTS = [
  { id: 'party', label: 'Đi tiệc & Hẹn hò', prompt: 'Gợi ý giúp mình set đồ đi tiệc tối hoặc hẹn hò thật thanh lịch, tôn dáng.' },
  { id: 'streetwear', label: 'Dạo phố cuối tuần', prompt: 'Mình muốn tìm outfit dạo phố cà phê cuối tuần năng động, trẻ trung.' },
  { id: 'office', label: 'Công sở tối giản', prompt: 'Tư vấn phối đồ đi làm, đi học phong cách tối giản (Smart Casual) dễ mặc.' },
  { id: 'vintage', label: 'Vintage độc bản', prompt: 'Gợi ý cho mình những món đồ phong cách Vintage / Retro cá tính đang có sẵn.' },
  { id: 'winter', label: 'Mùa lạnh / Đà Lạt', prompt: 'Mình sắp đi du lịch nơi se lạnh, gợi ý giúp mình áo khoác và đồ phối ấm áp.' },
  { id: 'budget', label: 'Săn đồ đẹp dưới 300k', prompt: 'Tìm giúp mình những món đồ độ mới cao, dễ phối với ngân sách dưới 300k.' },
];

const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    role: 'ai',
    text: 'Chào bạn! Mình là **Trợ lý AI Stylist của Sifit**.\n\nBạn đang tìm trang phục cho dịp nào (đi biển, dự tiệc, công sở, dạo phố, mùa lạnh...) hay muốn tư vấn theo **chiều cao, cân nặng và ngân sách**? Hãy nhắn cho mình hoặc chọn nhanh gợi ý bên dưới nhé!',
    followUps: [
      'Gợi ý đồ đi tiệc thanh lịch',
      'Mình nặng 52kg cao 1m60 mặc size gì?',
      'Tìm đồ Vintage dưới 350k',
    ],
  },
];

const renderFormattedText = text => {
  if (!text) return null;
  const parts = String(text).split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
};

export default function AiStylist() {
  const { setSelectedProduct, setCurrentView, addToCart, browse } = useApp();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState(DEFAULT_PROMPTS);
  const [activeCount, setActiveCount] = useState(0);
  const [selectedSize, setSelectedSize] = useState('ALL');
  const [maxBudget, setMaxBudget] = useState('');
  const chatContainerRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    let mounted = true;
    aiStylistService
      .getAiStylistPrompts()
      .then(data => {
        if (!mounted) return;
        if (data.quickPrompts?.length) setQuickPrompts(data.quickPrompts);
        if (typeof data.activeProductCount === 'number') setActiveCount(data.activeProductCount);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length <= 1 && !isTyping) return;
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const sendPrompt = async rawText => {
    const text = String(rawText ?? input).trim();
    if (!text || isTyping) return;

    const userMsg = { id: `user-${Date.now()}`, role: 'user', text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsTyping(true);

    try {
      const result = await aiStylistService.getAiStylistRecommendation({
        message: text,
        history: nextHistory.slice(-6).map(m => ({ role: m.role, text: m.text })),
        preferences: {
          size: selectedSize !== 'ALL' ? selectedSize : undefined,
          maxPrice: maxBudget ? Number(maxBudget) : undefined,
        },
      });

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: result.reply || 'Mình đã tìm thấy những sản phẩm phù hợp với phong cách của bạn:',
          detectedContext: result.detectedContext,
          products: result.products || [],
          outfitSummary: result.outfitSummary,
          followUps: result.followUps || [],
        },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'ai',
          text:
            error.response?.data?.message ||
            'Hệ thống AI Stylist đang bận trong giây lát. Bạn vui lòng thử gửi lại yêu cầu nhé!',
          followUps: ['Thử gợi ý đồ dạo phố', 'Xem danh mục sản phẩm'],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const resetChat = () => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
  };

  return (
    <LocalizedContent>
      <div className="ai-workspace max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 animate-fade-in">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <Icon name="auto_awesome" className="text-sm" />
              Sifit AI Stylist • Kết nối kho hàng trực tiếp
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-gray-900">
              Trợ lý phối đồ cá nhân hóa
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Gợi ý trang phục theo vóc dáng, dịp mặc và ngân sách từ{' '}
              <strong>{activeCount || 'các'}</strong> món đồ pre-loved đang mở bán trên sàn.
            </p>
          </div>

          {/* Filter Preferences */}
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-2">
              <span>Size:</span>
              <select
                value={selectedSize}
                onChange={e => setSelectedSize(e.target.value)}
                className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả</option>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Freesize'].map(sz => (
                  <option key={sz} value={sz}>{sz}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-2">
              <span>Ngân sách/món:</span>
              <select
                value={maxBudget}
                onChange={e => setMaxBudget(e.target.value)}
                className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
              >
                <option value="">Mọi mức giá</option>
                <option value="200000">Dưới 200.000đ</option>
                <option value="350000">Dưới 350.000đ</option>
                <option value="500000">Dưới 500.000đ</option>
                <option value="1000000">Dưới 1.000.000đ</option>
              </select>
            </label>

            <button
              type="button"
              onClick={resetChat}
              className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200/80 px-3.5 py-2 rounded-full inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Icon name="refresh" className="text-sm" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Quick Topic Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map(item => (
            <button
              key={item.id}
              type="button"
              disabled={isTyping}
              onClick={() => sendPrompt(item.prompt)}
              className="shrink-0 text-xs font-bold bg-white hover:bg-stone-100 text-gray-800 hover:text-gray-950 border border-gray-200 hover:border-gray-400 px-3.5 py-2 rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Icon name="auto_awesome" className="text-xs text-amber-500" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Chat Box */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm flex flex-col overflow-hidden">
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-gradient-to-b from-stone-50/60 to-white min-h-[360px] max-h-[520px]"
          >
            {messages.map(m => {
              const isMe = m.role === 'user';
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-full sm:max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && (
                      <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Icon name="auto_awesome" className="text-lg" />
                      </div>
                    )}

                    <div className="flex flex-col gap-3 min-w-0">
                      <div
                        className={`px-5 py-3.5 shadow-2xs ${
                          isMe
                            ? 'bg-emerald-900 text-white rounded-3xl rounded-tr-sm'
                            : 'bg-stone-100 text-gray-800 rounded-3xl rounded-tl-sm border border-stone-200/80'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {isMe ? m.text : renderFormattedText(m.text)}
                        </p>

                        {/* Context Badges */}
                        {!isMe && m.detectedContext && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-stone-200/80 text-[11px] font-semibold text-stone-600">
                            {m.detectedContext.occasion && (
                              <span className="bg-white px-2.5 py-0.5 rounded-full border border-stone-200">
                                Phong cách: {m.detectedContext.occasion}
                              </span>
                            )}
                            {m.detectedContext.suggestedSize && (
                              <span className="bg-white px-2.5 py-0.5 rounded-full border border-stone-200">
                                Size ưu tiên: {m.detectedContext.suggestedSize}
                              </span>
                            )}
                            {m.detectedContext.maxBudget && (
                              <span className="bg-white px-2.5 py-0.5 rounded-full border border-stone-200">
                                Ngân sách: ≤ {money(m.detectedContext.maxBudget)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Recommended Products Grid */}
                      {!isMe && m.products && m.products.length > 0 && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {m.products.map(p => (
                              <div
                                key={p._id}
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setCurrentView('detail');
                                }}
                                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
                              >
                                <div className="aspect-[3/4] relative overflow-hidden bg-stone-100">
                                  {p.images?.[0] ? (
                                    <img
                                      src={p.images[0]}
                                      alt={p.title}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <Icon name="checkroom" className="text-3xl" />
                                    </div>
                                  )}
                                  <span className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Mới {p.condition}%
                                  </span>
                                  {p.size && (
                                    <span className="absolute top-2 right-2 bg-white/90 text-gray-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-gray-200">
                                      {p.size}
                                    </span>
                                  )}
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 truncate">
                                      {p.brand || p.category || 'Sifit Select'}
                                    </p>
                                    <p className="font-bold text-xs text-gray-900 line-clamp-2 group-hover:text-emerald-800 transition-colors mt-0.5">
                                      {p.title}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
                                    <span className="font-extrabold text-emerald-800 text-xs">
                                      {money(p.price)}
                                    </span>
                                    <button
                                      type="button"
                                      title="Thêm vào giỏ hàng"
                                      onClick={e => {
                                        e.stopPropagation();
                                        addToCart(p);
                                      }}
                                      className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-800 text-emerald-900 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-emerald-200"
                                    >
                                      <Icon name="add_shopping_cart" className="text-xs" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Outfit Total Bar */}
                          {m.outfitSummary && m.products.length > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/90 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs">
                              <span className="text-emerald-950 font-medium">
                                Trọn bộ <strong>{m.outfitSummary.itemCount} món</strong> gợi ý có tổng giá:{' '}
                                <strong className="text-emerald-900 font-black">
                                  {money(m.outfitSummary.totalPrice)}
                                </strong>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => browse()}
                                  className="text-emerald-800 font-bold hover:underline cursor-pointer"
                                >
                                  Xem thêm tại Cửa hàng
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Follow-up Suggestions */}
                      {!isMe && m.followUps && m.followUps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.followUps.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              disabled={isTyping}
                              onClick={() => sendPrompt(q)}
                              className="text-xs font-semibold text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                    <Icon name="auto_awesome" className="text-lg" />
                  </div>
                  <div className="px-4 py-3 bg-stone-100 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-600 flex items-center gap-2">
                    <span>AI Stylist đang chọn đồ từ tủ Sifit...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={e => {
              e.preventDefault();
              sendPrompt();
            }}
            className="p-3 sm:p-4 border-t border-gray-200/80 flex gap-2.5 bg-white"
          >
            <input
              type="text"
              placeholder="Nhập dịp mặc, phong cách, số đo (VD: Đi Đà Lạt, cao 1m62 nặng 52kg, dưới 400k...)"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isTyping}
              className="flex-1 bg-stone-50 border border-gray-200 focus:bg-white focus:border-emerald-700 rounded-full px-5 py-3 text-sm outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="btn-primary disabled:opacity-50 text-white px-6 py-3 rounded-full font-bold text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <span>Tư vấn</span>
              <Icon name="send" className="text-sm" />
            </button>
          </form>
        </div>
      </div>
    </LocalizedContent>
  );
}

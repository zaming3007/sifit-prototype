import React, { useState, useRef, useEffect } from 'react';
import * as chatService from '../services/chatService';
import { Feedback } from '../components/MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { Dialog } from '../components/OperationsUI';

import { useApp } from '../context/AppContext';
import LocalizedContent from '../components/LocalizedContent';

// Messages may contain a raw id or a populated user object. Compare a
// normalised id so the alignment stays correct for both accounts.
const getUserId = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?._id ? String(value._id) : value?.id ? String(value.id) : null;
};

const isCurrentUser = (sender, currentUser) => {
  const senderId = getUserId(sender);
  const currentUserId = getUserId(currentUser);
  return Boolean(senderId && currentUserId && senderId === currentUserId);
};

export default function Chat() {
  const { chats, messages, activeChatId, setActiveChatId, user, sendMessage, openProduct, loadOlderMessages, hasOlderMessages, fetchChats } = useApp();
  const [input, setInput] = useState('');
  const { busy, error, run } = useAction();
  const [reportId, setReportId] = useState(null);
  const [reason, setReason] = useState('');
  const [blockState, setBlockState] = useState({ id: '', blocked: false, error: '' });
  const [confirmBlock, setConfirmBlock] = useState(false);
  const sendAttempt = useRef(null);

  const visibleChats = chats.filter(c =>
    c.participants?.some(participant => getUserId(participant) === getUserId(user))
  );
  const activeChat = visibleChats.find(c => c._id === activeChatId);
  const chatMessages = messages[activeChatId] || [];
  const otherUser = activeChat?.participants?.find(p => getUserId(p) !== getUserId(user));
  const otherId = getUserId(otherUser);
  const blockPending = !!otherId && blockState.id !== otherId;
  const blocked = blockState.id === otherId && blockState.blocked;
  useEffect(() => {
    let live = true;
    setConfirmBlock(false);
    if (otherId) chatService.getBlockStatus(otherId).then(value => { if (live) setBlockState({ id: otherId, blocked: value, error: '' }); }).catch(error => { if (live) setBlockState({ id: otherId, blocked: false, error: error.response?.data?.message || 'Không tải được trạng thái chặn. Hãy chọn lại hội thoại.' }); });
    return () => { live = false; };
  }, [otherId]);

  const lastMessageId = chatMessages.at(-1)?._id;
  useEffect(() => {
    const last = lastMessageId;
    if (last && activeChatId) chatService.markRead(activeChatId, last).catch(() => {});
  }, [activeChatId, lastMessageId]);
  const send = () => {
    if (!input.trim() || !activeChatId || busy || blocked || blockPending || blockState.error) return;
    const fingerprint = activeChatId + ':' + input.trim();
    if (sendAttempt.current?.fingerprint !== fingerprint) sendAttempt.current = { fingerprint, id: crypto.randomUUID() };
    run(async () => {
      const result = await sendMessage(activeChatId, input.trim(), sendAttempt.current.id);
      if (result.success) { setInput(''); sendAttempt.current = null; }
    });
  };

  return (
    <LocalizedContent>
    <Feedback busy={busy} error={error} />
    {blockState.error && <p role="alert">{blockState.error}</p>}
    {confirmBlock && <Dialog title={blocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'} busy={busy} onClose={() => setConfirmBlock(false)}><Feedback busy={busy} error={error} /><p>{blocked ? 'Cho phép tiếp tục trao đổi tin nhắn với' : 'Ngừng nhận và gửi tin nhắn với'} {otherUser?.name}?</p><button disabled={busy} onClick={() => run(async () => { if (blocked) await chatService.unblockUser(otherId); else await chatService.blockUser(otherId); setBlockState({ id: otherId, blocked: !blocked, error: '' }); setConfirmBlock(false); })}>Xác nhận {blocked ? 'bỏ chặn' : 'chặn'}</button></Dialog>}
    {reportId && <form className="max-w-4xl mx-auto p-4 space-y-3" onSubmit={event => { event.preventDefault(); run(async () => { await chatService.reportMessage(reportId, reason); setReportId(null); setReason(''); }); }}><label>Lý do báo cáo tin nhắn<textarea required maxLength="1000" className="input-field" value={reason} onChange={event => setReason(event.target.value)} /></label><button disabled={busy}>Gửi báo cáo</button><button type="button" onClick={() => setReportId(null)}>Hủy</button></form>}
    <div className="chat-workspace max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 h-[calc(100vh-160px)] flex gap-6 animate-fade-in">
      {/* ── Conversation list ── */}
      <aside className="w-72 flex-shrink-0 bg-white rounded-3xl border border-gray-100 shadow-card flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-heading font-black text-xl text-gray-900">Hộp Thư</h3>
          <button disabled={busy} onClick={() => run(fetchChats)}>Làm mới</button>
          <p className="text-xs text-gray-400 mt-0.5">{visibleChats.length} cuộc trò chuyện</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {visibleChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 py-10">
              <span className="material-symbols-outlined text-5xl">inbox</span>
              <p className="text-sm">Chưa có tin nhắn nào</p>
            </div>
          ) : visibleChats.map(c => {
            const other = c.participants?.find(p => getUserId(p) !== getUserId(user));
            const isActive = c._id === activeChatId;
            return (
              <button
                key={c._id}
                onClick={() => setActiveChatId(c._id)}
                className={`w-full text-left p-4 flex gap-3.5 border-b border-gray-50 items-center transition-all cursor-pointer ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-gray-50'}`}
              >
                <img
                  src={other?.avatar || 'https://i.pravatar.cc/150'}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{other?.name}</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">Về: {c.listing?.title}</p>
                  {c.lastMessage && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{c.lastMessage.content}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Chat window ── */}
      <section className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-card flex flex-col overflow-hidden">
        {activeChat ? (
          <>
            {/* Chat header */}
            <header className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl overflow-hidden shadow-sm bg-gray-100">
                  <img src={activeChat.listing?.images?.[0]} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-gray-900 line-clamp-1">{activeChat.listing?.title}</h4>
                  <p className="text-[11px] text-primary font-black uppercase tracking-widest">Đang chat với {otherUser?.name}</p>
                </div>
              </div>
              <button onClick={() => openProduct(activeChat.listing)} className="text-primary bg-primary/10 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-primary/20 transition-colors cursor-pointer border-none">
                Xem Sản Phẩm
              </button>
              <button disabled={busy || blockPending || !!blockState.error} onClick={() => setConfirmBlock(true)}>{blocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}</button>
            </header>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-5 bg-gradient-to-b from-gray-50/30 to-white">
              {hasOlderMessages && <button disabled={busy} onClick={() => run(loadOlderMessages)}>Tải tin nhắn cũ</button>}
              {chatMessages.map((m, i) => {
                const isMe = isCurrentUser(m.sender, user);
                return (
                  <div key={m._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      {m.attachments?.length > 0 && (
                        <img src={m.attachments[0]?.url || m.attachments[0]} alt="attachment" className="rounded-2xl mb-2 max-w-[200px] border border-gray-100" />
                      )}
                      <div className={`px-5 py-3 shadow-sm ${isMe ? 'bg-primary text-white rounded-[22px] rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-[22px] rounded-bl-sm'}`}>
                        <p className="text-sm leading-relaxed">{m.deletedAt ? 'Tin nhắn đã được xóa' : m.content}</p>
                        {!isMe && !m.deletedAt && <button className="text-xs underline" onClick={() => setReportId(m._id)}>Báo cáo</button>}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1.5 px-1">
                        {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <footer className="p-4 border-t border-gray-100 flex gap-3 bg-white/60 backdrop-blur-sm">
              <input
                type="text"
                maxLength={2000}
                disabled={busy || blocked || blockPending || !!blockState.error}
                placeholder={blocked ? 'Bạn đã chặn người dùng này' : 'Nhập tin nhắn...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                className="flex-1 bg-gray-100 border border-transparent focus:bg-white focus:border-primary/30 focus:shadow-[0_0_0_4px_rgba(0,108,73,0.08)] rounded-full px-5 py-3 text-sm outline-none transition-all"
              />
              <button
                disabled={busy || blocked || blockPending || !!blockState.error}
                onClick={send}
                className="bg-primary text-white w-11 h-11 rounded-full flex items-center justify-center hover:shadow-emerald-sm hover:-translate-y-0.5 transition-all cursor-pointer border-none flex-shrink-0"
              >
                <span className="material-symbols-outlined text-xl ml-0.5">send</span>
              </button>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4">
            <span className="material-symbols-outlined text-7xl">forum</span>
            <p className="font-heading font-medium text-lg text-gray-400">Chọn một cuộc hội thoại để bắt đầu</p>
          </div>
        )}
      </section>
    </div>
    </LocalizedContent>
  );
}

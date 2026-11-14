import React, { useState, useRef, useEffect } from 'react';
import * as chatService from '../services/chatService';
import { Feedback } from '../components/MarketplaceUI';
import { useAction } from '../hooks/useAction';
import { Dialog } from '../components/OperationsUI';
import { useApp } from '../context/AppContext';
import LocalizedContent from '../components/LocalizedContent';
import Icon from '../components/Icon';

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
    if (otherId) {
      chatService.getBlockStatus(otherId)
        .then(value => { if (live) setBlockState({ id: otherId, blocked: value, error: '' }); })
        .catch(error => { if (live) setBlockState({ id: otherId, blocked: false, error: error.response?.data?.message || 'Không tải được trạng thái chặn. Hãy chọn lại hội thoại.' }); });
    }
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
      {blockState.error && <p role="alert" className="p-3 bg-red-50 text-red-600 rounded-xl mb-4 text-xs font-semibold">{blockState.error}</p>}
      {confirmBlock && (
        <Dialog title={blocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'} busy={busy} onClose={() => setConfirmBlock(false)}>
          <Feedback busy={busy} error={error} />
          <p className="text-sm text-gray-700 mb-4">
            {blocked ? 'Cho phép tiếp tục trao đổi tin nhắn với' : 'Ngừng nhận và gửi tin nhắn với'} <strong>{otherUser?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-outline text-xs py-2 px-4" onClick={() => setConfirmBlock(false)}>Hủy</button>
            <button
              className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
              disabled={busy}
              onClick={() => run(async () => {
                if (blocked) await chatService.unblockUser(otherId);
                else await chatService.blockUser(otherId);
                setBlockState({ id: otherId, blocked: !blocked, error: '' });
                setConfirmBlock(false);
              })}
            >
              <Icon name={blocked ? 'lock_open' : 'lock'} className="text-sm" />
              Xác nhận {blocked ? 'bỏ chặn' : 'chặn'}
            </button>
          </div>
        </Dialog>
      )}

      {reportId && (
        <form
          className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100 my-6 space-y-4"
          onSubmit={event => {
            event.preventDefault();
            run(async () => {
              await chatService.reportMessage(reportId, reason);
              setReportId(null);
              setReason('');
            });
          }}
        >
          <h3 className="font-heading font-bold text-base text-gray-900 flex items-center gap-2">
            <Icon name="flag" className="text-red-500" />
            Báo Cáo Tin Nhắn Vi Phạm
          </h3>
          <label className="block text-xs font-semibold text-gray-700">
            Lý do báo cáo tin nhắn
            <textarea
              required
              maxLength="1000"
              className="input-field mt-1.5 min-h-[90px]"
              placeholder="Ghi rõ nội dung quấy rối, gian lận hoặc vi phạm quy tắc cộng đồng…"
              value={reason}
              onChange={event => setReason(event.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-outline text-xs py-2 px-4" onClick={() => setReportId(null)}>Hủy</button>
            <button type="submit" disabled={busy} className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700">
              <Icon name="flag" className="text-sm" />
              Gửi báo cáo
            </button>
          </div>
        </form>
      )}

      <div className="chat-workspace max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 h-[calc(100vh-140px)] flex gap-6 animate-fade-in">
        {/* ── Conversation List ── */}
        <aside className="w-80 flex-shrink-0 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg text-gray-900 flex items-center gap-2">
                <Icon name="forum" className="text-primary text-xl" />
                Hộp Thư
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{visibleChats.length} cuộc trò chuyện</p>
            </div>
            <button
              disabled={busy}
              onClick={() => run(fetchChats)}
              className="p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-gray-50 transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              <Icon name="refresh" className={`text-base ${busy ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {visibleChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 py-10 px-4 text-center">
                <Icon name="inbox" className="text-5xl text-gray-300" />
                <p className="text-xs text-gray-400 font-medium">Chưa có tin nhắn nào</p>
                <p className="text-[11px] text-gray-400">Nhắn tin cho shop khi bạn cần hỏi về món đồ ưng ý nhé.</p>
              </div>
            ) : (
              visibleChats.map(c => {
                const other = c.participants?.find(p => getUserId(p) !== getUserId(user));
                const isActive = c._id === activeChatId;
                return (
                  <button
                    key={c._id}
                    onClick={() => setActiveChatId(c._id)}
                    className={`w-full text-left p-3.5 px-4 flex gap-3 border-b border-gray-50 items-center transition-all cursor-pointer ${
                      isActive ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={other?.avatar || 'https://i.pravatar.cc/150'}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-gray-900 truncate">{other?.name || 'Người dùng'}</p>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                        <Icon name="checkroom" className="text-[10px] text-gray-400" />
                        {c.listing?.title || 'Sản phẩm'}
                      </p>
                      {c.lastMessage && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{c.lastMessage.content}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Active Chat Window ── */}
        <section className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <header className="p-3.5 px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl overflow-hidden shadow-xs bg-gray-100 border border-gray-200 flex-shrink-0">
                    <img src={activeChat.listing?.images?.[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-gray-900 line-clamp-1">{activeChat.listing?.title}</h4>
                    <p className="text-[11px] text-primary font-bold tracking-wider flex items-center gap-1">
                      <Icon name="person" className="text-xs" />
                      Đang chat với {otherUser?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openProduct(activeChat.listing)}
                    className="inline-flex items-center gap-1.5 text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border-none"
                  >
                    <Icon name="storefront" className="text-xs" />
                    Xem Món Đồ
                  </button>
                  <button
                    disabled={busy || blockPending || !!blockState.error}
                    onClick={() => setConfirmBlock(true)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    title={blocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}
                  >
                    <Icon name={blocked ? 'lock_open' : 'lock'} className="text-sm" />
                  </button>
                </div>
              </header>

              {/* Message Feed */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 bg-gradient-to-b from-gray-50/20 to-white">
                {hasOlderMessages && (
                  <div className="text-center py-2">
                    <button
                      disabled={busy}
                      onClick={() => run(loadOlderMessages)}
                      className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-xs"
                    >
                      <Icon name="history" className="text-xs" />
                      Tải tin nhắn cũ hơn
                    </button>
                  </div>
                )}

                {chatMessages.map((m, i) => {
                  const isMe = isCurrentUser(m.sender, user);
                  return (
                    <div key={m._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                        {m.attachments?.length > 0 && (
                          <img
                            src={m.attachments[0]?.url || m.attachments[0]}
                            alt="attachment"
                            className="rounded-2xl mb-1.5 max-w-[200px] border border-gray-100 shadow-xs"
                          />
                        )}
                        <div
                          className={`px-4 py-2.5 shadow-xs ${
                            isMe
                              ? 'bg-primary text-white rounded-[20px] rounded-br-sm'
                              : 'bg-gray-100 text-gray-900 rounded-[20px] rounded-bl-sm'
                          }`}
                        >
                          <p className="text-xs sm:text-sm leading-relaxed">{m.deletedAt ? 'Tin nhắn đã được xóa' : m.content}</p>
                          {!isMe && !m.deletedAt && (
                            <button
                              className="text-[10px] opacity-70 hover:opacity-100 underline mt-1 block"
                              onClick={() => setReportId(m._id)}
                            >
                              Báo cáo
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                          {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <footer className="p-3.5 px-5 border-t border-gray-100 flex gap-2.5 bg-white">
                <input
                  type="text"
                  maxLength={2000}
                  disabled={busy || blocked || blockPending || !!blockState.error}
                  placeholder={blocked ? 'Bạn đã chặn người dùng này' : 'Nhập tin nhắn...'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  className="flex-1 bg-gray-50 border border-gray-200 focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/10 rounded-full px-5 py-2.5 text-xs sm:text-sm outline-none transition-all"
                />
                <button
                  disabled={busy || blocked || blockPending || !!blockState.error || !input.trim()}
                  onClick={send}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:shadow-md transition-all cursor-pointer border-none flex-shrink-0"
                  aria-label="Gửi tin nhắn"
                >
                  <Icon name="send" className="text-lg ml-0.5" />
                </button>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-1">
                <Icon name="forum" className="text-4xl" />
              </div>
              <p className="font-heading font-bold text-base text-gray-600">Chọn một cuộc hội thoại để bắt đầu</p>
              <p className="text-xs text-gray-400 max-w-sm">
                Trò chuyện trực tiếp với người bán để hỏi kỹ số đo, tình trạng và thương lượng mức giá ưng ý.
              </p>
            </div>
          )}
        </section>
      </div>
    </LocalizedContent>
  );
}

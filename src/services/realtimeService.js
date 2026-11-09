import { io } from 'socket.io-client';
import { API_BASE_URL, getAccessToken, refreshAccessToken, clearAccessToken } from './apiClient';
import { collectPages } from './pagination';
import { listConversations } from './chatService';

// REST persists messages; sockets signal new data and reconnects recover history.
export function connectRealtime({ onMessage, onReconnect, onNotifications }) {
  const origin = import.meta.env.VITE_SOCKET_URL || new URL(API_BASE_URL, window.location.origin).origin;
  const socket = io(origin, { auth: callback => callback({ token: getAccessToken() }), withCredentials: true });
  let stopped = false;
  let refreshing = false;
  socket.on('account:suspended', () => {
    clearAccessToken();
    window.dispatchEvent(new Event('sifit:session-expired'));
    socket.disconnect();
  });
  socket.on('message:new', payload => onMessage(payload.message));
  const joinRooms = async () => {
    try {
      const { items } = await collectPages(listConversations);
      if (!stopped) for (const item of items) socket.emit('conversation:join', { conversationId: item._id });
    } catch { /* The REST loader shows fetch errors. */ }
  };
  socket.on('notification:new', () => {
    window.dispatchEvent(new Event('sifit:notifications'));
    onNotifications?.();
    onReconnect(); joinRooms();
  });
  socket.on('connect', () => { onReconnect(); joinRooms(); });
  window.addEventListener('sifit:conversations', joinRooms);
  socket.on('conversation:updated', onReconnect);
  socket.on('connect_error', async error => {
    if (!/token|expired|unauthorized/i.test(error.message) || refreshing || stopped) return;
    refreshing = true;
    try { await refreshAccessToken(); if (!stopped) socket.connect(); }
    catch { /* REST will surface an expired session on the next request. */ }
    finally { refreshing = false; }
  });
  return () => { stopped = true; window.removeEventListener('sifit:conversations', joinRooms); socket.disconnect(); };
}

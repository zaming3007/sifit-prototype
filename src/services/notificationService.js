import { API_ENDPOINTS } from '../constants/apiEndpoints';
import apiClient from './apiClient';
const changed = () => window.dispatchEvent(new Event('sifit:notifications'));

export async function listNotifications(params = {}, signal) {
  const response = await apiClient.get(API_ENDPOINTS.notifications.root, { params, signal });
  return {
    items: response.data?.data?.items || [],
    pagination: response.data?.data?.pagination,
  };
}

export async function unreadCount() {
  const response = await apiClient.get(API_ENDPOINTS.notifications.unreadCount);
  return response.data?.data?.unreadCount || 0;
}

export async function markRead(id) {
  const response = await apiClient.patch(API_ENDPOINTS.notifications.read(id));
  changed();
  return response.data?.data?.notification;
}

export async function markAllRead() {
  const response = await apiClient.patch(API_ENDPOINTS.notifications.readAll);
  changed();
  return response.data?.data;
}

export async function archive(id) {
  await apiClient.delete(API_ENDPOINTS.notifications.byId(id));
  changed();
}
export async function preferences() {
  return (await apiClient.get(API_ENDPOINTS.notifications.preferences)).data.data.preferences;
}
export async function updatePreferences(data) {
  return (await apiClient.patch(API_ENDPOINTS.notifications.preferences, data)).data.data.preferences;
}

import { API_ENDPOINTS } from '../constants/apiEndpoints';
import apiClient, { clearAccessToken, setAccessToken, refreshAccessToken } from './apiClient';

const mapRole = role => {
  if (!['ADMIN', 'SELLER', 'BUYER'].includes(role)) throw new Error('Vai trò tài khoản không hợp lệ. Vui lòng liên hệ quản trị viên.');
  return role.toLowerCase();
};

export const normalizeUser = user => {
  if (!user) return null;

  return {
    ...user,
    _id: user._id || user.id,
    name: user.name || user.fullName || '',
    avatar: user.avatar || null,
    phone: user.phone || '',
    role: mapRole(user.role),
    blocked: user.status === 'SUSPENDED',
    averageRating: user.averageRating || 0,
    reviewCount: user.reviewCount || 0,
    addresses: user.addresses || [],
  };
};

const unwrap = response => response.data?.data || {};

export async function login({ email, password }) {
  const data = unwrap(await apiClient.post(API_ENDPOINTS.auth.login, { email, password }));
  const user = normalizeUser(data.user);
  setAccessToken(data.accessToken);
  return {
    user,
    accessToken: data.accessToken,
  };
}

export async function register({ name, email, password, role = 'buyer' }) {
  const data = unwrap(
    await apiClient.post(API_ENDPOINTS.auth.register, {
      fullName: name,
      email,
      password,
      role: role.toUpperCase(),
    }),
  );
  return {
    user: normalizeUser(data.user),
  };
}

export async function googleLogin({ credential, role = 'buyer', currentPassword }) {
  const data = unwrap(await apiClient.post(API_ENDPOINTS.auth.google, {
    credential, role: role.toUpperCase(), ...(currentPassword ? { currentPassword } : {}),
  }));
  const user = normalizeUser(data.user);
  setAccessToken(data.accessToken);
  return { user, accessToken: data.accessToken };
}

export async function refreshSession() {
  const data = await refreshAccessToken();
  return {
    user: normalizeUser(data.user),
    accessToken: data.accessToken,
  };
}

export async function getCurrentUser() {
  const data = unwrap(await apiClient.get(API_ENDPOINTS.auth.me));
  return normalizeUser(data.user);
}

export async function updateProfile({ fullName, phone }) {
  const data = unwrap(await apiClient.patch(API_ENDPOINTS.auth.me, { fullName, phone }));
  return normalizeUser(data.user);
}

export async function uploadAvatar(file) {
  const body = new FormData();
  body.append('avatar', file);
  const data = unwrap(await apiClient.post(API_ENDPOINTS.auth.avatar, body, { headers: { 'Content-Type': 'multipart/form-data' } }));
  return normalizeUser(data.user);
}

export async function deleteAvatar() {
  const data = unwrap(await apiClient.delete(API_ENDPOINTS.auth.avatar));
  return normalizeUser(data.user);
}

export async function logout() {
  try {
    await apiClient.post(API_ENDPOINTS.auth.logout);
  } finally {
    window.google?.accounts?.id?.disableAutoSelect?.();
    clearAccessToken();
  }
}

export async function changePassword({ currentPassword, newPassword }) {
  await apiClient.patch(API_ENDPOINTS.auth.changePassword, { currentPassword, newPassword });
  clearAccessToken();
}

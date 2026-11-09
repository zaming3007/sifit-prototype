import axios from 'axios';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

let accessToken = null;
let refreshPromise = null;

export const setAccessToken = token => {
  accessToken = token || null;
  window.dispatchEvent(new Event('sifit:token-changed'));
};

export const clearAccessToken = () => {
  accessToken = null;
  window.dispatchEvent(new Event('sifit:token-changed'));
};

export const getAccessToken = () => accessToken;

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient.post(API_ENDPOINTS.auth.refreshToken)
      .then(response => {
        const data = response.data.data;
        setAccessToken(data.accessToken);
        return data;
      }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use(config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';
    const isAuthRequest = [
      API_ENDPOINTS.auth.login,
      API_ENDPOINTS.auth.google,
      API_ENDPOINTS.auth.register,
      API_ENDPOINTS.auth.refreshToken,
      API_ENDPOINTS.auth.logout,
    ].some(endpoint => url.includes(endpoint));

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const data = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${data?.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      window.dispatchEvent(new Event('sifit:session-expired'));
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;

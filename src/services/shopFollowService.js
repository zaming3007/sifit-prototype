import apiClient from './apiClient';
export const getState = async (id, signal) => (await apiClient.get(`/shops/${id}/follow`, { signal })).data.data;
export const count = async (id, signal) => (await apiClient.get(`/shops/${id}/followers/count`, { signal })).data.data;
export const follow = async id => (await apiClient.put(`/shops/${id}/follow`, {})).data.data;
export const unfollow = async id => (await apiClient.delete(`/shops/${id}/follow`)).data.data;
export const preferences = async (id, notifyNewProducts) => (await apiClient.patch(`/shops/${id}/follow`, { notifyNewProducts })).data.data;

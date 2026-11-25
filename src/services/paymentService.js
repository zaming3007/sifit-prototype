import { API_ENDPOINTS } from '../constants/apiEndpoints';
import apiClient from './apiClient';

export async function createPayment(data) {
  const response = await apiClient.post(API_ENDPOINTS.payments.root, data);
  return response.data?.data?.payment || response.data?.data;
}

export async function getPayment(id, { signal } = {}) {
  const response = await apiClient.get(API_ENDPOINTS.payments.byId(id), { signal });
  return response.data?.data?.payment;
}

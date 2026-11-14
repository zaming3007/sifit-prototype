import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { normalizeProduct } from '../utils/normalizers';
import apiClient from './apiClient';

export async function getAiStylistPrompts() {
  const response = await apiClient.get(API_ENDPOINTS.aiStylist.prompts);
  return response.data?.data || { activeProductCount: 0, categories: [], quickPrompts: [] };
}

export async function getAiStylistRecommendation({ message, history = [], preferences = {} }) {
  const response = await apiClient.post(API_ENDPOINTS.aiStylist.recommend, {
    message,
    history,
    preferences,
  });
  const data = response.data?.data || {};
  return {
    ...data,
    products: (data.products || []).map(normalizeProduct).filter(Boolean),
  };
}

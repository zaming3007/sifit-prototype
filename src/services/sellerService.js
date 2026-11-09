import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { normalizeProduct } from '../utils/normalizers';
import { normalizeOrder } from './orderService';
import apiClient from './apiClient';

export async function getSellerProfile() {
  const response = await apiClient.get(API_ENDPOINTS.seller.profile);
  return response.data?.data?.profile;
}

export async function createSellerProfile(data) {
  const response = await apiClient.post(API_ENDPOINTS.seller.profile, data);
  return response.data?.data?.profile;
}

export async function updateSellerProfile(data) {
  const response = await apiClient.patch(API_ENDPOINTS.seller.profile, data);
  return response.data?.data?.profile;
}

export async function listSellerOrders(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.seller.orders, { params });
  return {
    items: (response.data?.data?.items || []).map(normalizeOrder),
    pagination: response.data?.data?.pagination,
  };
}

export async function getShop(slug, params = {}, signal) {
  const response = await apiClient.get(API_ENDPOINTS.shops.bySlug(slug), { params, signal });
  const data = response.data.data;
  return {
    shop: data.shop,
    products: (data.products || []).map(item => ({ ...normalizeProduct(item), seller: { _id: data.shop.userId, name: data.shop.shopName, avatar: data.shop.avatar } })),
    pagination: data.pagination,
    facets: data.facets,
  };
}

export async function getShopBySeller(sellerId, signal) {
  return (await apiClient.get(`/shops/by-seller/${sellerId}`, { signal })).data.data.shop;
}

export async function listShops(params = {}) {
  return (await apiClient.get(API_ENDPOINTS.shops.list, { params })).data.data;
}

export async function getEarnings() {
  return (await apiClient.get(API_ENDPOINTS.seller.earnings)).data.data.earnings;
}

export async function listPayouts(params = {}) {
  return (await apiClient.get(API_ENDPOINTS.seller.payouts, { params })).data.data;
}

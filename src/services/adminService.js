import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { normalizeProduct } from '../utils/normalizers';
import { normalizeOrder } from './orderService';
import { normalizeUser } from './authService';
import apiClient from './apiClient';

export async function dashboardOverview() {
  const response = await apiClient.get(API_ENDPOINTS.admin.dashboardOverview);
  return response.data?.data || {};
}

export async function listUsers(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.admin.users, { params });
  return {
    items: (response.data?.data?.items || []).map(normalizeUser),
    pagination: response.data?.data?.pagination,
  };
}

export async function updateUserStatus(id, data) {
  const response = await apiClient.patch(API_ENDPOINTS.admin.userStatus(id), data);
  return normalizeUser(response.data?.data?.user);
}

export async function listProducts(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.admin.products, { params });
  return {
    items: (response.data?.data?.items || []).map(normalizeProduct),
    pagination: response.data?.data?.pagination,
  };
}

export async function listOrders(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.admin.orders, { params });
  return {
    items: (response.data?.data?.items || []).map(normalizeOrder),
    pagination: response.data?.data?.pagination,
  };
}

export async function listMessageReports(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.admin.messageReports, { params });
  return {
    items: response.data?.data?.items || [],
    pagination: response.data?.data?.pagination,
  };
}

export async function moderateProduct(id, action, reason) {
  return (await apiClient.patch(`/admin/products/${id}/${action}`, reason ? { reason } : {})).data.data.product;
}
export async function resolveMessageReport(id, resolutionNote) {
  return (await apiClient.patch(API_ENDPOINTS.admin.resolveMessageReport(id), { resolutionNote })).data.data.report;
}
export async function listVerifications(params = {}) {
  return (await apiClient.get(API_ENDPOINTS.sellerVerification.adminList, { params })).data.data;
}
export async function reviewVerification(id, approved, reason) {
  return (await apiClient.patch(approved ? API_ENDPOINTS.sellerVerification.approve(id) : API_ENDPOINTS.sellerVerification.reject(id), { reason })).data.data;
}
export async function listDisputes(params = {}) {
  return (await apiClient.get(API_ENDPOINTS.disputes.admin, { params })).data.data;
}
export async function reviewDispute(id, note) {
  return (await apiClient.patch(API_ENDPOINTS.disputes.review(id), { note })).data.data;
}
export async function resolveDispute(id, status, resolution, expectedVersion) {
  return (await apiClient.patch(API_ENDPOINTS.disputes.resolve(id), { status, resolution, expectedVersion })).data.data;
}

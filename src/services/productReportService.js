import apiClient from './apiClient';
export const createReport = async (productId, body) => (await apiClient.post(`/products/${productId}/reports`, body)).data.data.report;
export const myReports = async (productId, signal) => (await apiClient.get('/product-reports/my', { params: { productId, limit: 20 }, signal })).data.data;
export const resolveReport = async (id, body) => (await apiClient.patch(`/admin/product-reports/${id}/resolve`, body)).data.data.report;
export const moderateReporter = async (id, body) => (await apiClient.patch(`/admin/product-reports/${id}/reporter`, body)).data.data.policy;

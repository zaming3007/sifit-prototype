import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { conditionPercentToEnum, normalizeProduct, sizeToApi } from '../utils/normalizers';
import apiClient from './apiClient';

const unwrapItems = response => response.data?.data?.items || [];

export async function listProducts(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.products.list, { params });
  return {
    items: unwrapItems(response).map(normalizeProduct),
    pagination: response.data?.data?.pagination,
  };
}

export async function getProduct(id) {
  const response = await apiClient.get(API_ENDPOINTS.products.byId(id));
  return normalizeProduct(response.data?.data?.product);
}

export async function listMyProducts(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.products.mine, { params });
  return {
    items: unwrapItems(response).map(normalizeProduct),
    pagination: response.data?.data?.pagination,
  };
}

export async function createProduct(data) {
  const response = await apiClient.post(API_ENDPOINTS.products.list, {
    title: data.title,
    description: data.description || data.defects || data.title,
    price: Number(data.price),
    categoryId: data.categoryId,
    brand: data.brand,
    size: sizeToApi(data.size),
    color: data.color,
    condition: conditionPercentToEnum(data.condition),
  });
  return normalizeProduct(response.data?.data?.product);
}

export async function updateProduct(id, data) {
  const payload = {};
  if (data.imageOrder !== undefined) payload.imageOrder = data.imageOrder;
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined || data.defects !== undefined) payload.description = data.description || data.defects;
  if (data.price !== undefined) payload.price = Number(data.price);
  if (data.categoryId !== undefined) payload.categoryId = data.categoryId;
  if (data.brand !== undefined) payload.brand = data.brand;
  if (data.size !== undefined) payload.size = sizeToApi(data.size);
  if (data.color !== undefined) payload.color = data.color;
  if (data.condition !== undefined) payload.condition = conditionPercentToEnum(data.condition);

  const response = await apiClient.patch(API_ENDPOINTS.products.byId(id), payload);
  return normalizeProduct(response.data?.data?.product);
}

export async function deleteProduct(id) {
  await apiClient.delete(API_ENDPOINTS.products.byId(id));
}

export async function submitProduct(id) {
  const response = await apiClient.post(API_ENDPOINTS.products.submit(id));
  return normalizeProduct(response.data?.data?.product);
}

export async function uploadImages(id, files) {
  const body = new FormData();
  for (const file of files) body.append('images', file);
  const response = await apiClient.post(API_ENDPOINTS.products.images(id), body, {
    headers: { 'Content-Type': undefined },
  });
  return normalizeProduct(response.data?.data?.product);
}

export async function deleteImage(id, publicId) {
  const response = await apiClient.delete(API_ENDPOINTS.products.image(id, publicId));
  return normalizeProduct(response.data?.data?.product);
}

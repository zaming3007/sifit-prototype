import { API_ENDPOINTS } from '../constants/apiEndpoints';
import apiClient from './apiClient';
import { normalizeSeller } from '../utils/normalizers';

const normalizeReview = review => ({
  ...review,
  _id: review?._id || review?.id,
  reviewer: normalizeSeller(review?.reviewer || review?.buyerId),
  rating: review?.rating,
  comment: review?.comment,
  createdAt: review?.createdAt,
});

export async function listProductReviews(productId, params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.reviews.productList(productId), { params });
  return {
    items: (response.data?.data?.items || []).map(normalizeReview),
    pagination: response.data?.data?.pagination,
  };
}

export async function createProductReview(data) {
  const response = await apiClient.post(API_ENDPOINTS.reviews.products, data);
  return normalizeReview(response.data?.data?.review);
}

export async function listMyReviews(params = {}) {
  const data = (await apiClient.get(API_ENDPOINTS.reviews.mine, { params })).data.data;
  return { ...data, items: data.items.map(normalizeReview) };
}

export async function updateReview(id, data) {
  return normalizeReview((await apiClient.patch(API_ENDPOINTS.reviews.byId(id), data)).data.data.review);
}

export async function removeReview(id) {
  return normalizeReview((await apiClient.delete(API_ENDPOINTS.reviews.byId(id))).data.data.review);
}

export async function uploadReviewImages(id, files) {
  const body = new FormData();
  for (const file of files) body.append('images', file);
  return normalizeReview((await apiClient.post(API_ENDPOINTS.reviews.images(id), body, {
    headers: { 'Content-Type': undefined },
  })).data.data.review);
}

export async function deleteReviewImage(id, publicId) {
  return normalizeReview((await apiClient.delete(API_ENDPOINTS.reviews.image(id, publicId))).data.data.review);
}

export async function createSellerRating(data) {
  return (await apiClient.post(API_ENDPOINTS.reviews.sellers, data)).data.data.rating;
}

export async function listShopRatings(slug, params = {}, signal) {
  const data = (await apiClient.get(API_ENDPOINTS.reviews.shopRatings(slug), { params, signal })).data.data;
  return { ...data, items: data.items.map(normalizeReview) };
}

export async function productSummary(id) {
  return (await apiClient.get(API_ENDPOINTS.reviews.productSummary(id))).data.data;
}

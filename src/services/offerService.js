import apiClient from './apiClient';
const data = response => response.data.data;
export const createOffer = async (productId, body) => data(await apiClient.post(`/products/${productId}/offers`, body)).offer;
export const respond = async (id, decision, note) => data(await apiClient.post(`/seller/offers/${id}/respond`, { decision, note })).offer;
export const withdraw = async id => data(await apiClient.post(`/offers/${id}/withdraw`)).offer;
export const listMyOffers = async params => data(await apiClient.get('/offers/my', { params }));

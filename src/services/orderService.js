import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { normalizeProduct, normalizeSeller } from '../utils/normalizers';
import apiClient from './apiClient';

const mapStatus = status => {
  const value = String(status || '').toUpperCase();
  if (value === 'PENDING_PAYMENT') return 'pending';
  if (['PAID', 'PROCESSING'].includes(value)) return 'processing';
  if (['SHIPPED', 'DELIVERED'].includes(value)) return 'shipping';
  if (['COMPLETED'].includes(value)) return 'completed';
  if (['CANCELLED', 'REFUNDED'].includes(value)) return 'cancelled';
  return String(status || '').toLowerCase();
};

export const normalizeOrder = order => {
  const items = (order?.items || []).map(item => ({
    ...item,
    product: normalizeProduct({
      ...item, _id: item.productId?._id || item.productId,
      images: item.image ? [item.image] : [], status: 'sold', sellerId: order.sellerId,
    }),
  }));
  const product = items[0]?.product || order?.productSnapshot || order?.listing || order?.product;
  return {
    ...order,
    _id: order?._id || order?.id,
    items,
    buyer: normalizeSeller(order?.buyer || order?.buyerId),
    seller: normalizeSeller(order?.seller || order?.sellerId),
    listing: normalizeProduct(product),
    price: order?.subtotal || product?.price || order?.price || 0,
    shippingFee: order?.shippingFee || 0,
    totalAmount: order?.buyerTotal ?? order?.subtotal ?? 0,
    status: mapStatus(order?.orderStatus),
    shippingAddress: order?.shippingAddress,
    trackingNumber: order?.trackingNumber,
    shippingCarrier: order?.shippingCarrier,
    isReviewed: order?.isReviewed || false,
    createdAt: order?.createdAt,
  };
};

export async function createOrder({ shippingAddress, notes, idempotencyKey, offerIds }) {
  const response = await apiClient.post(API_ENDPOINTS.orders.root, {
    shippingAddress,
    notes,
    idempotencyKey,
    offerIds,
  });
  return response.data?.data?.checkout;
}

export async function confirmReceipt(id) {
  const response = await apiClient.post(API_ENDPOINTS.orders.confirmReceipt(id));
  return normalizeOrder(response.data?.data?.order);
}

export async function listMyOrders(params = {}) {
  const response = await apiClient.get(API_ENDPOINTS.orders.mine, { params });
  return {
    items: (response.data?.data?.items || []).map(normalizeOrder),
    pagination: response.data?.data?.pagination,
  };
}

export async function cancelOrder(id) {
  const response = await apiClient.post(API_ENDPOINTS.orders.cancel(id));
  return normalizeOrder(response.data?.data?.order);
}

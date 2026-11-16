import apiClient from './apiClient';

export const getState = async () => (await apiClient.get('/stylist/state')).data.data;
export const getJob = async id => (await apiClient.get(`/stylist/jobs/${id}`)).data.data.job;
export const removeJob = async id => apiClient.delete(`/stylist/jobs/${id}`);
export const getImage = async id => URL.createObjectURL((await apiClient.get(`/stylist/jobs/${id}/image`, { responseType: 'blob' })).data);
export async function tryOn({ photo, products, engine, requestId }) {
  const body = new FormData();
  body.append('photo', photo);
  body.append('productIds', JSON.stringify(products));
  body.append('engine', engine);
  body.append('requestId', requestId);
  body.append('consent', 'true');
  return (await apiClient.post('/stylist/tryon', body, { headers: { 'Content-Type': undefined }, timeout: 30000 })).data.data.job;
}

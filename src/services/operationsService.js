import apiClient from './apiClient';

const data = response => response.data.data;
export const list = async (path, params = {}, signal) => data(await apiClient.get(path, { params, signal }));
export const get = async path => data(await apiClient.get(path));
export const post = async (path, body = {}) => data(await apiClient.post(path, body));
export const patch = async (path, body = {}) => data(await apiClient.patch(path, body));
export const put = async (path, body = {}) => data(await apiClient.put(path, body));
export const remove = async path => data(await apiClient.delete(path));

export async function exportCsv(type, params) {
  let response;
  try { response = await apiClient.get(`/admin/reports/${type}/export`, { params, responseType: 'blob' }); }
  catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Keep the transport error if the response is not JSON. */ }
    }
    throw error;
  }
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url; link.download = `sifit-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

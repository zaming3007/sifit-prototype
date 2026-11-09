import apiClient from './apiClient';
export async function saveRefundBank(id, bank) { return (await apiClient.put(`/refunds/${id}/bank`, bank)).data.data.refund; }
export async function uploadRefundProof(id, file) {
  const form = new FormData(); form.append('proof', file);
  return (await apiClient.post(`/admin/manual-refunds/${id}/proof`, form, { headers: { 'Content-Type': undefined } })).data.data.refund;
}
export async function downloadRefundProof(id) {
  let response;
  try { response = await apiClient.get(`/refunds/${id}/proof`, { responseType: 'blob' }); }
  catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Preserve network error. */ }
    }
    throw error;
  }
  const url = URL.createObjectURL(response.data); const link = document.createElement('a');
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[response.data.type] || 'png';
  link.href = url; link.download = `sifit-refund-${id}.${ext}`; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

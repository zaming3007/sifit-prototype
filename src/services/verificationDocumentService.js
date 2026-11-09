import apiClient from './apiClient';
export async function uploadDocument(id, kind, file) {
  const form = new FormData(); form.append('document', file);
  return (await apiClient.post(`/seller/verification/${id}/documents/${kind}`, form, { headers: { 'Content-Type': undefined } })).data.data;
}
export async function documentBlob(id, kind) {
  try { return (await apiClient.get(`/seller-verifications/${id}/documents/${kind}`, { responseType: 'blob' })).data; }
  catch (error) { if (error.response?.data instanceof Blob) { try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Keep original error. */ } } throw error; }
}
export async function downloadDocument(id, kind) {
  const blob = await documentBlob(id, kind); const url = URL.createObjectURL(blob);
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[blob.type] || 'png';
  const link = document.createElement('a'); link.href = url; link.download = `sifit-verification-${kind}.${ext}`; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

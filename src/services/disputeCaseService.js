import apiClient from './apiClient';
export async function uploadDisputeEvidence(id, file, caption, category) {
  const form = new FormData(); form.append('evidence', file); form.append('caption', caption); form.append('category', category);
  return (await apiClient.post(`/disputes/${id}/evidence`, form, { headers: { 'Content-Type': undefined } })).data.data.evidence;
}
export async function getDisputeEvidenceBlob(id, fileId) {
  try { return (await apiClient.get(`/disputes/${id}/evidence/${fileId}`, { responseType: 'blob' })).data; }
  catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Preserve transport error. */ }
    }
    throw error;
  }
}

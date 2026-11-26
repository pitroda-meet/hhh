import { apiClient, emitDatabaseChange } from './api.js';

export async function getFaqs(params = {}) {
  return (await apiClient.get('/faqs', { params })).data;
}

export async function saveFaq(input) {
  const response = input.id
    ? await apiClient.put(`/admin/faqs/${input.id}`, input)
    : await apiClient.post('/admin/faqs', input);
  emitDatabaseChange();
  return response.data;
}

export async function deleteFaq(id) {
  const response = await apiClient.delete(`/admin/faqs/${id}`);
  emitDatabaseChange();
  return response.data;
}

export async function suggestFaq(ticketId, { question, answer }) {
  const response = await apiClient.post(`/staff/queries/${ticketId}/suggest-faq`, { question, answer });
  emitDatabaseChange();
  return response.data;
}

export async function setFaqFeedback(id, value) {
  const response = await apiClient.post(`/faqs/${id}/feedback`, { value });
  emitDatabaseChange();
  return response.data;
}

export const faqService = { getFaqs, saveFaq, deleteFaq, suggestFaq, setFaqFeedback };

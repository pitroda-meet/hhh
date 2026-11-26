import { apiClient, emitDatabaseChange } from './api.js';

export async function getSessions() {
  return (await apiClient.get('/v1/agent/sessions')).data;
}

export async function createSession(language = 'en') {
  const response = await apiClient.post('/v1/agent/sessions', { language });
  emitDatabaseChange();
  return response.data;
}

export async function getSession(id) {
  return (await apiClient.get(`/v1/agent/sessions/${id}`)).data;
}

export async function sendMessage({ session_id, message, action }) {
  const response = await apiClient.post('/v1/agent/chat', { session_id, message, action });
  emitDatabaseChange();
  return response.data;
}

export async function confirmTicket(sessionId, messageId, confirmed) {
  const response = await apiClient.post(`/v1/agent/sessions/${sessionId}/confirm-ticket`, {
    message_id: messageId,
    confirmed,
  });
  emitDatabaseChange();
  return response.data;
}

export async function setMessageFeedback(messageId, feedback) {
  const response = await apiClient.post(`/v1/agent/messages/${messageId}/feedback`, { feedback });
  emitDatabaseChange();
  return response.data;
}

export async function deleteSession(id) {
  const response = await apiClient.delete(`/v1/agent/sessions/${id}`);
  emitDatabaseChange();
  return response.data;
}

export const chatService = {
  getSessions,
  createSession,
  getSession,
  sendMessage,
  confirmTicket,
  setMessageFeedback,
  deleteSession,
};

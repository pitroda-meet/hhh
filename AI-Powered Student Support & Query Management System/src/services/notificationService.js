import { apiClient, emitDatabaseChange } from './api.js';

export async function getNotifications() {
  return (await apiClient.get('/notifications')).data;
}

export async function markAsRead(id) {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  emitDatabaseChange();
  return response.data;
}

export const notificationService = { getNotifications, markAsRead };

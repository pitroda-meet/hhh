import { USE_MOCK, apiClient, emitDatabaseChange, mockRequest, requireUser } from './api.js';
import { dbNow, getDatabase, isoNow, mutateDatabase } from '../mock/database.js';

export async function getNotifications() {
  if (!USE_MOCK) return (await apiClient.get('/notifications')).data;
  return mockRequest('GET', '/api/notifications', () => {
    const user = requireUser();
    const db = getDatabase();
    return { items: db.notifications.filter((n) => n.user_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), now: dbNow(db) };
  });
}

export async function markAsRead(id) {
  if (!USE_MOCK) {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    emitDatabaseChange();
    return response.data;
  }
  return mockRequest('PATCH', `/api/notifications/${id}/read`, () => {
    const user = requireUser();
    return mutateDatabase((db) => {
      db.notifications.filter((n) => n.user_id === user.id && (id === 'all' || n.id === id)).forEach((n) => { n.read_at = isoNow(db); });
      return { read: true };
    });
  });
}

export const notificationService = { getNotifications, markAsRead };

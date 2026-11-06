import axios from 'axios';
import { getAuthStorageKey, getDatabase, getDatabaseEpoch } from '../mock/database.js';

// Replace mockRequest calls with apiClient calls when the Laravel API is ready.
// Axios is intentionally confined to the service layer.
export const apiClient = axios.create({ baseURL: import.meta.env?.VITE_API_BASE_URL || '/api', timeout: 15000, headers: { Accept: 'application/json' } });
apiClient.interceptors.request.use((config) => {
  let session;
  try { session = JSON.parse(localStorage.getItem(getAuthStorageKey()) || 'null'); } catch { session = null; }
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

export class ApiError extends Error {
  constructor(message, status = 422, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.response = { status, data: { message, errors } };
  }
}

export function requireUser(roles) {
  let session;
  try { session = JSON.parse(localStorage.getItem(getAuthStorageKey()) || 'null'); } catch { session = null; }
  const user = getDatabase().users.find((u) => u.id === session?.user_id && u.active);
  if (!user) throw new ApiError('Please sign in to continue.', 401);
  if (roles && !roles.includes(user.role)) throw new ApiError('You do not have access to this action.', 403);
  return user;
}

export async function mockRequest(method, route, handler) {
  const start = Date.now();
  const epoch = getDatabaseEpoch();
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.floor(Math.random() * 201)));
  try {
    assertRequestEpoch(epoch);
    const data = await handler();
    return { data: structuredClone(data), message: 'Success', meta: { method, route, duration_ms: Date.now() - start } };
  } catch (error) {
    if (error instanceof ApiError || error.name === 'AbortError') throw error;
    throw new ApiError(error.message || 'The request could not be completed.');
  }
}

export function assertRequestEpoch(epoch) {
  if (epoch !== getDatabaseEpoch()) {
    const error = new Error('The previous demo request was cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

export function paginate(items, params = {}) {
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 10));
  const page = Math.min(Math.max(1, Number(params.page) || 1), Math.max(1, Math.ceil(items.length / pageSize)));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, page_size: pageSize, last_page: Math.max(1, Math.ceil(items.length / pageSize)) };
}

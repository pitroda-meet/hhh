import axios from 'axios';
import { AUTH_KEY, getDatabase, getDatabaseEpoch } from '../mock/database.js';

export const TOKEN_KEY = 'sahay_auth_token';
export const USER_KEY = 'sahay_auth_user';
export const USE_MOCK = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_USE_MOCK === 'true'
  : true;

export const apiClient = axios.create({
  baseURL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:8000/api',
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

export function getAuthToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) return token;
    const legacy = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    return legacy?.token || null;
  } catch {
    return null;
  }
}

export function setAuthStorage(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user_id: user.id, token }));
  }
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(AUTH_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function emitDatabaseChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sahay:database'));
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers.Accept = 'application/json';
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || '');
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/demo-login');
    if (status === 401 && !isAuthAttempt) {
      clearAuthStorage();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahay:unauthorized'));
      }
    }
    return Promise.reject(error);
  },
);

export class ApiError extends Error {
  constructor(message, status = 422, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.response = { status, data: { message, errors } };
  }
}

export function requireUser(roles) {
  let session;
  try { session = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { session = null; }
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
    const error = new Error('The previous request was cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

export function paginate(items, params = {}) {
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 10));
  const page = Math.min(Math.max(1, Number(params.page) || 1), Math.max(1, Math.ceil(items.length / pageSize)));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, page_size: pageSize, last_page: Math.max(1, Math.ceil(items.length / pageSize)) };
}

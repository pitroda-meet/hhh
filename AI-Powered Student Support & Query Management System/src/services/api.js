import axios from 'axios';
import { errorMessage } from '../utils/format.js';
import { notify } from '../utils/notify.js';

export const TOKEN_KEY = 'sahay_auth_token';
export const USER_KEY = 'sahay_auth_user';

export const apiClient = axios.create({
  baseURL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:8000/api',
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setAuthStorage(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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

    const message = !error?.response
      ? 'Cannot reach the server. Please check your connection and try again.'
      : status === 401 && !isAuthAttempt
        ? 'Your session has expired. Please sign in again.'
        : errorMessage(error);

    error.normalizedMessage = message;

    if (!error?.config?.skipErrorToast && typeof window !== 'undefined') {
      error._toasted = true;
      notify.error(message, { toastId: `api-${status || 'network'}-${message}` });
    }

    return Promise.reject(error);
  },
);

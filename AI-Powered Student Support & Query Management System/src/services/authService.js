import { apiClient, clearAuthStorage, emitDatabaseChange, getAuthToken, setAuthStorage } from './api.js';

export async function login({ email, password }) {
  const response = await apiClient.post('/auth/login', { email, password });
  const { token, user } = response.data.data;
  setAuthStorage(token, user);
  return response.data;
}

export async function register(input) {
  const payload = {
    ...input,
    password_confirmation: input.confirm_password ?? input.password_confirmation,
  };
  const response = await apiClient.post('/auth/register', payload);
  const { token, user } = response.data.data;
  setAuthStorage(token, user);
  return response.data;
}

export async function demoLogin(role) {
  const response = await apiClient.post('/auth/demo-login', { role });
  const { token, user } = response.data.data;
  setAuthStorage(token, user);
  return response.data;
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return { data: null };
  try {
    const response = await apiClient.get('/auth/me', { skipErrorToast: true });
    setAuthStorage(token, response.data.data);
    return response.data;
  } catch {
    clearAuthStorage();
    return { data: null };
  }
}

export async function logout() {
  try {
    if (getAuthToken()) await apiClient.post('/auth/logout', {}, { skipErrorToast: true });
  } finally {
    clearAuthStorage();
  }
  return { data: { logged_out: true } };
}

export async function updateProfile(input) {
  const response = await apiClient.patch('/auth/profile', input);
  const token = getAuthToken();
  if (token && response.data?.data) setAuthStorage(token, response.data.data);
  emitDatabaseChange();
  return response.data;
}

export const authService = { login, register, demoLogin, getCurrentUser, logout, updateProfile };

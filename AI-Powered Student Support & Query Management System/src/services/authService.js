import { ApiError, mockRequest, requireUser } from './api.js';
import { AUTH_KEY, getDatabase, isoNow, mutateDatabase, nextId, publicUser } from '../mock/database.js';

export async function login({ email, password }) {
  return mockRequest('POST', '/api/auth/login', () => {
    const user = getDatabase().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password && u.active);
    if (!user) throw new ApiError('The email or password is incorrect.', 401);
    const token = `sahay-${user.id}-${Date.now()}`;
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user_id: user.id, token }));
    return { user: publicUser(user), token };
  });
}

export async function register(input) {
  return mockRequest('POST', '/api/auth/register', () => {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    if (!name || name.length < 2) throw new ApiError('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) throw new ApiError('Please enter a valid email address.');
    if ((input.password || '').length < 8) throw new ApiError('Choose a password with at least 8 characters.');
    if (getDatabase().users.some((u) => u.email.toLowerCase() === email)) throw new ApiError('An account with this email already exists.');
    const user = mutateDatabase((db) => {
      const id = nextId(db.users);
      const record = { id, name, email, password: input.password, role_id: 1, role: 'student', department_ids: [], phone: input.phone || '', institute: input.institute || 'Government ITI, Junagadh', trade: input.trade || 'Electrician', year: '1st year', enrollment_number: input.enrollment_number?.trim() || `GTI-2026-${String(200 + id).padStart(4, '0')}`, language: input.language || 'en', active: true, created_at: isoNow(db) };
      db.users.push(record);
      return publicUser(record);
    });
    const token = `sahay-${user.id}-${Date.now()}`;
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user_id: user.id, token }));
    return { user, token };
  });
}

export async function getCurrentUser() {
  return mockRequest('GET', '/api/auth/me', () => {
    if (!localStorage.getItem(AUTH_KEY)) return null;
    try { return publicUser(requireUser()); } catch { localStorage.removeItem(AUTH_KEY); return null; }
  });
}

export async function logout() {
  return mockRequest('POST', '/api/auth/logout', () => { localStorage.removeItem(AUTH_KEY); return { logged_out: true }; });
}

export async function updateProfile(input) {
  return mockRequest('PATCH', '/api/auth/profile', () => {
    const user = requireUser();
    if (!input.name?.trim()) throw new ApiError('Your name is required.');
    return mutateDatabase((db) => {
      const record = db.users.find((u) => u.id === user.id);
      ['name', 'phone', 'institute', 'trade', 'year', 'language'].forEach((key) => { if (input[key] !== undefined) record[key] = String(input[key]).trim(); });
      if (user.role !== 'student' && input.designation !== undefined) record.designation = String(input.designation).trim().slice(0, 100);
      return publicUser(record);
    });
  });
}

export const authService = { login, register, getCurrentUser, logout, updateProfile };

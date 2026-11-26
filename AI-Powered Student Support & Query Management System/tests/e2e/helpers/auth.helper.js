import { expect } from '@playwright/test';
import { API_BASE_URL } from './fixtures.js';

export const DEFAULT_PASSWORD = process.env.E2E_PASSWORD || 'Demo@2026';

export const SEEDED_USERS = {
  student: {
    email: 'student@iti.demo',
    password: DEFAULT_PASSWORD,
    role: 'student',
    name: 'Aarav Patel',
    landingPath: '/student',
  },
  student2: {
    email: 'nidhi.shah@iti.demo',
    password: DEFAULT_PASSWORD,
    role: 'student',
    name: 'Nidhi Shah',
    landingPath: '/student',
  },
  staff: {
    email: 'staff@iti.demo',
    password: DEFAULT_PASSWORD,
    role: 'staff',
    name: 'Mehul Joshi',
    landingPath: '/staff',
  },
  staffAcademic: {
    email: 'kavita.trivedi@iti.demo',
    password: DEFAULT_PASSWORD,
    role: 'staff',
    name: 'Kavita Trivedi',
    landingPath: '/staff',
  },
  admin: {
    email: 'admin@iti.demo',
    password: DEFAULT_PASSWORD,
    role: 'admin',
    name: 'Drashti Desai',
    landingPath: '/admin',
  },
  principal: {
    email: 'principal@iti.demo',
    password: DEFAULT_PASSWORD,
    role: 'principal',
    name: 'Dr. Rupal Shah',
    landingPath: '/principal',
  },
};

export async function loginAs(page, roleOrCreds, options = {}) {
  const creds = typeof roleOrCreds === 'string' ? SEEDED_USERS[roleOrCreds] : roleOrCreds;
  if (!creds) throw new Error(`Unknown role: ${roleOrCreds}`);

  await page.goto('/login');
  await page.evaluate(() => localStorage.removeItem('sahay.language'));
  if (options.resetLanguage !== false) {
    // Ensure clean English UI for deterministic assertions unless explicitly testing i18n
    await page.reload();
  }

  await page.getByLabel(/email address/i).fill(creds.email);
  await page.getByLabel(/password/i, { exact: false }).first().fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  const expectedPath = creds.landingPath || `/${creds.role}`;
  await page.waitForURL((url) => url.pathname === expectedPath || url.pathname.startsWith(`${expectedPath}/`), {
    timeout: 20000,
  });

  const token = await page.evaluate(() => localStorage.getItem('sahay_auth_token'));
  expect(token).toBeTruthy();
  return creds;
}

export async function loginViaApi(page, roleOrCreds) {
  const creds = typeof roleOrCreds === 'string' ? SEEDED_USERS[roleOrCreds] : roleOrCreds;
  const response = await page.request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: creds.email, password: creds.password },
    headers: { Accept: 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const { token, user } = body.data;

  await page.goto('/login');
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem('sahay_auth_token', t);
      localStorage.setItem('sahay_auth_user', JSON.stringify(u));
    },
    { t: token, u: user },
  );
  return { token, user };
}

export async function getAuthToken(page) {
  return page.evaluate(() => localStorage.getItem('sahay_auth_token'));
}

export async function logout(page) {
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: /sign out|સાઇન આઉટ|साइन आउट/i }).click();
  await page.waitForURL('**/login');
  const token = await page.evaluate(() => localStorage.getItem('sahay_auth_token'));
  expect(token).toBeNull();
}


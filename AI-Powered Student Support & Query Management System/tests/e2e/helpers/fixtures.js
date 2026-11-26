import { test as base, expect } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Extended Playwright test fixture that fails immediately on any uncaught
 * browser pageerror or HTTP >= 500 server response during the test.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const pageErrors = [];
    const serverErrors = [];

    const onPageError = (error) => {
      pageErrors.push(error?.message || String(error));
    };

    const onResponse = (response) => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    };

    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    await provide(page);

    page.off('pageerror', onPageError);
    page.off('response', onResponse);

    expect(pageErrors, `Uncaught pageerror(s): ${pageErrors.join(' | ')}`).toEqual([]);
    expect(serverErrors, `HTTP 5xx response(s): ${serverErrors.join(' | ')}`).toEqual([]);
  },
});

export async function resetDatabase(request) {
  const response = await request.post(`${API_BASE_URL}/demo/reset`, {
    headers: { Accept: 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
}

export { expect };


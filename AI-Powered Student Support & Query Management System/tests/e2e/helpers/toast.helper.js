import { expect } from '@playwright/test';

async function expectToastByType(page, type, text) {
  const selector = `.Toastify__toast--${type}`;
  const toast = text
    ? page.locator(selector).filter({ hasText: text }).first()
    : page.locator(selector).first();
  await expect(toast).toBeVisible({ timeout: 12000 });
  return toast;
}

export async function expectToastSuccess(page, text) {
  return expectToastByType(page, 'success', text);
}

export async function expectToastError(page, text) {
  return expectToastByType(page, 'error', text);
}

export async function expectToastWarning(page, text) {
  return expectToastByType(page, 'warning', text);
}

export async function expectToastInfo(page, text) {
  return expectToastByType(page, 'info', text);
}

export async function dismissAllToasts(page) {
  const closeButtons = page.locator('.Toastify__close-button');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    await closeButtons.nth(i).click().catch(() => {});
  }
}


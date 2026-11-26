import { test, expect, API_BASE_URL } from './helpers/fixtures.js';
import { loginAs, loginViaApi } from './helpers/auth.helper.js';

test.describe('07 - i18n Switcher, Real-Time Notifications, 404 & Responsive Layout', () => {
  test('Language Switcher toggles English -> Gujarati -> Hindi and persists across reload', async ({ page }) => {
    await loginAs(page, 'student');

    const langTrigger = page.getByTestId('language-switcher').locator('..').locator('[role="combobox"]');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });

    // Switch to Gujarati
    await langTrigger.click();
    await page.getByRole('option', { name: 'ગુજરાતી' }).click();
    await expect(nav.getByRole('link', { name: 'મારા પ્રશ્નો' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'AI સહાયક' })).toBeVisible();

    // Reload preserves Gujarati
    await page.reload();
    await expect(nav.getByRole('link', { name: 'મારા પ્રશ્નો' })).toBeVisible();

    // Switch to Hindi
    await langTrigger.click();
    await page.getByRole('option', { name: 'हिन्दी' }).click();
    await expect(nav.getByRole('link', { name: 'मेरे प्रश्न' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'AI सहायक' })).toBeVisible();

    // Restore English
    await langTrigger.click();
    await page.getByRole('option', { name: 'English' }).click();
    await expect(nav.getByRole('link', { name: 'My Queries' })).toBeVisible();
  });

  test('Notification bell shows unread alert on reply, navigates to ticket, and marks notification as read', async ({ page, browser }) => {
    // 1. Staff replies to student's active ticket #101 via API to generate a fresh notification for Aarav Patel
    const staffCtx = await browser.newContext();
    const staffPage = await staffCtx.newPage();
    const { token: staffToken } = await loginViaApi(staffPage, 'staffAcademic');
    const uniqueMsg = `Notification trigger reply ${Date.now()}`;
    const replyRes = await staffPage.request.post(`${API_BASE_URL}/staff/queries/101/reply`, {
      data: { message: uniqueMsg },
      headers: { Authorization: `Bearer ${staffToken}`, Accept: 'application/json' },
    });
    expect(replyRes.ok()).toBeTruthy();
    await staffCtx.close();

    // 2. Student logs in and inspects Notification bell
    await loginAs(page, 'student');
    const bell = page.getByTestId('notification-bell');
    await expect(bell).toBeVisible();
    await expect(bell).toHaveAttribute('aria-label', /[1-9]\d*\s+unread/i);

    const ariaBefore = await bell.getAttribute('aria-label');
    const unreadMatch = ariaBefore?.match(/(\d+)\s+unread/i);
    const unreadBefore = unreadMatch ? Number(unreadMatch[1]) : 0;
    expect(unreadBefore).toBeGreaterThanOrEqual(1);

    await bell.click();
    const notifItem = page.getByRole('menuitem').filter({ hasText: 'New reply on ITI-2026-00101' }).first();
    await expect(notifItem).toBeVisible();
    await notifItem.click();

    // Navigates straight to ticket 101 and marks notification read
    await page.waitForURL('**/student/queries/101');
    await expect(page.getByText(uniqueMsg)).toBeVisible();

    await expect(async () => {
      const ariaAfter = await bell.getAttribute('aria-label');
      const afterMatch = ariaAfter?.match(/(\d+)\s+unread/i);
      const unreadAfter = afterMatch ? Number(afterMatch[1]) : 0;
      expect(unreadAfter).toBeLessThan(unreadBefore);
    }).toPass({ timeout: 10000 });
  });

  test('404 Not Found page renders cleanly and Go Back button returns to home dashboard', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/non-existent-page-xyz');

    await expect(page.getByText('This page took a different path.')).toBeVisible();
    await page.getByRole('link', { name: /back to overview/i }).click();
    await page.waitForURL('**/student');
  });

  test('Mobile (375x812) and Tablet (768x1024) viewports render key dashboards without horizontal overflow', async ({ page }) => {
    await loginAs(page, 'student');

    // Mobile 375x812
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/student');
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    await expect(page.getByText('Total queries').first()).toBeVisible();
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(mobileOverflow).toBeLessThanOrEqual(2);

    // Open mobile navigation drawer
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('link', { name: 'My Queries' })).toBeVisible();
    await page.getByRole('link', { name: 'My Queries' }).click();
    await page.waitForURL('**/student/queries');

    // Tablet 768x1024 on Principal analytics
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginViaApi(page, 'principal');
    await page.goto('/principal');
    await expect(page.getByText('Total tickets').first()).toBeVisible();
    const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(tabletOverflow).toBeLessThanOrEqual(2);
  });
});


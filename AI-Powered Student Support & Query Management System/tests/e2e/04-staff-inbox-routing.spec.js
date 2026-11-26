import { test, expect, API_BASE_URL } from './helpers/fixtures.js';
import { loginAs, loginViaApi, logout } from './helpers/auth.helper.js';
import { expectToastSuccess, expectToastWarning } from './helpers/toast.helper.js';
import { uniqueTicketData } from './helpers/testData.js';

test.describe('04 - Staff Inbox Routing, Public vs Internal Notes, Status & Reassignment', () => {
  test('Auto-routed ticket appears in Staff Inbox; public replies visible to student while internal notes stay strictly hidden', async ({ page, browser }) => {
    const ticketData = uniqueTicketData({
      subject: `Staff E2E Exam Routing ${Date.now()}`,
      categoryName: 'Examination',
      priority: 'High',
    });

    // 1. Student creates Examination ticket -> auto-routed to Mehul Joshi (staff@iti.demo)
    await loginAs(page, 'student');
    await page.goto('/student/queries/new');
    await page.getByLabel(/subject/i).fill(ticketData.subject);
    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: 'Examination' }).click();
    await page.getByRole('combobox', { name: /priority/i }).click();
    await page.getByRole('option', { name: 'High' }).click();
    await page.getByLabel(/description/i).fill(ticketData.description);
    await page.getByRole('button', { name: /submit query/i }).click();
    await expectToastSuccess(page, /created and routed successfully/i);

    const ticketNumber = (await page.locator('text=/ITI-\\d{4}-\\d{5}/').first().textContent()).trim();
    const viewTicketHref = await page.getByRole('link', { name: /view ticket/i }).getAttribute('href');
    const ticketId = viewTicketHref.split('/').pop();
    await logout(page);

    // 2. Staff logs in and finds auto-routed ticket in Inbox
    await loginAs(page, 'staff');
    await page.goto('/staff/inbox');

    const searchInput = page.getByPlaceholder(/search by ticket id/i);
    await searchInput.fill(ticketNumber);
    await expect(page.getByRole('link', { name: ticketNumber })).toBeVisible();

    // Test inbox filtering (Status + My assignments + Sort + Reset)
    await page.getByRole('checkbox', { name: /my assignments only/i }).check();
    await expect(page.getByRole('link', { name: ticketNumber })).toBeVisible();
    await page.getByRole('combobox', { name: /sort by/i }).click();
    await page.getByRole('option', { name: /priority first/i }).click();
    await expect(page.getByRole('link', { name: ticketNumber })).toBeVisible();
    await page.getByRole('button', { name: /reset filters/i }).click();

    await searchInput.fill(ticketNumber);
    await page.getByRole('link', { name: ticketNumber }).click();
    await page.waitForURL(`**/staff/queries/${ticketId}`);

    // 3. Post Public Reply
    const publicReplyText = `Public staff guidance for ${ticketNumber}`;
    await page.getByLabel(/write a helpful reply/i).fill(publicReplyText);
    await page.getByRole('button', { name: /send reply/i }).click();
    await expectToastSuccess(page, 'Your reply has been sent.');
    await expect(page.getByText(publicReplyText)).toBeVisible();

    // 4. Switch to Internal Notes tab -> empty validation + post secret internal note
    const internalSecret = `INTERNAL_CONFIDENTIAL_NOTE_${Date.now()}`;
    await page.getByRole('tab', { name: /internal notes/i }).click();
    await page.getByRole('button', { name: /add internal note/i }).click();
    await expectToastWarning(page, 'Write an internal note of at least 2 characters.');

    await page.getByLabel(/write an internal staff note/i).fill(internalSecret);
    await page.getByRole('button', { name: /add internal note/i }).click();
    await expectToastSuccess(page, 'Internal note saved.');
    await expect(page.getByText(internalSecret)).toBeVisible();

    // 5. Verify in a separate Student browser context that Public Reply IS visible and Internal Note is STRICTLY HIDDEN in UI & API
    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    const { token: studentToken } = await loginViaApi(studentPage, 'student');
    const apiDetailRes = await studentPage.request.get(`${API_BASE_URL}/student/queries/${ticketId}`, {
      headers: { Authorization: `Bearer ${studentToken}`, Accept: 'application/json' },
    });
    expect(apiDetailRes.ok()).toBeTruthy();
    const apiDetailJson = await apiDetailRes.json();
    expect(apiDetailJson.data.internal_notes).toBeUndefined();
    expect(JSON.stringify(apiDetailJson)).not.toContain(internalSecret);

    await studentPage.goto(`/student/queries/${ticketId}`);
    await expect(studentPage.getByText(publicReplyText)).toBeVisible();
    await expect(studentPage.getByText(internalSecret)).toHaveCount(0);
    await expect(studentPage.getByRole('tab', { name: /internal notes/i })).toHaveCount(0);
    await studentContext.close();

    // 6. Status transitions: Waiting for Student -> Resolved, verify Timeline updates
    await page.getByRole('combobox', { name: /change status/i }).click();
    await page.getByRole('option', { name: 'Waiting for Student' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /confirm/i }).click();
    await expectToastSuccess(page, /Status: Waiting for Student/i);

    await page.getByTestId('resolve-ticket').click();
    await page.getByRole('dialog').getByRole('button', { name: /confirm/i }).click();
    await expectToastSuccess(page, /Status: Resolved/i);
    await expect(page.getByText('Ticket timeline')).toBeVisible();
    await expect(page.getByText(/Status updated to Resolved/i)).toBeVisible();
  });

  test('Staff can reassign an active ticket using ReassignDialog with validation', async ({ page }) => {
    await loginAs(page, 'staff');
    // Seeded ticket 103: "Hall ticket name correction" (Assigned to Mehul Joshi, Examination)
    await page.goto('/staff/queries/103');
    await expect(page.getByText('ITI-2026-00103')).toBeVisible();

    await page.getByRole('button', { name: /forward ticket/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Empty handover note validation
    await dialog.getByRole('button', { name: /reassign/i }).click();
    await expectToastWarning(page, 'Provide a short handover note (min 3 characters).');

    // Reassign to Academic department (Kavita Trivedi)
    await dialog.getByRole('combobox', { name: /department/i }).click();
    await page.getByRole('option', { name: 'Academic' }).click();
    await dialog.getByLabel(/reason \/ handover note/i).fill('Transferring to Academic department for verification.');
    await dialog.getByRole('button', { name: /reassign/i }).click();

    await expectToastSuccess(page, /Assigned to/i);
    // Staff Mehul Joshi is not in Academic dept, so TicketDetail redirects back to /staff/inbox
    await page.waitForURL('**/staff/inbox');
  });
});


import { test, expect } from './helpers/fixtures.js';
import { loginAs } from './helpers/auth.helper.js';
import { expectToastSuccess, expectToastWarning } from './helpers/toast.helper.js';
import { uniqueTicketData } from './helpers/testData.js';

test.describe('02 - Student Portal & Ticket Lifecycle End-to-End', () => {
  test('Student dashboard renders KPI cards, quick actions, and recent queries cleanly', async ({ page }) => {
    await loginAs(page, 'student');

    await expect(page.getByText('Total queries', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Open queries', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('In progress', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible();

    for (const actionLabel of ['Ask the AI', 'Raise a query', 'Track a ticket', 'Explore FAQs']) {
      await expect(page.getByRole('button', { name: new RegExp(actionLabel, 'i') })).toBeVisible();
    }

    await expect(page.getByText('Your recent queries')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Support queries' })).toBeVisible();
  });

  test('New query validates empty form, invalid/oversized attachments, creates ticket with file, and persists on reload', async ({ page }) => {
    const ticket = uniqueTicketData();
    await loginAs(page, 'student');
    await page.goto('/student/queries/new');

    // Empty submit -> inline validation + warning toast
    await page.getByRole('button', { name: /submit query/i }).click();
    await expectToastWarning(page, 'Subject must be between 5 and 150 characters.');
    await expect(page.getByText('Subject must be between 5 and 150 characters.').first()).toBeVisible();

    // Invalid file type rejection
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'blocked-script.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('MZ'),
    });
    await expectToastWarning(page, 'unsupported file type');

    // Oversized (> 5 MB) file rejection
    await fileInput.setInputFiles({
      name: 'oversized-scan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 2048, 65),
    });
    await expectToastWarning(page, 'exceeds the 5 MB file size limit');

    // Fill valid subject, select category (auto-displays department), priority, description, valid attachment
    await page.getByLabel(/subject/i).fill(ticket.subject);
    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: ticket.categoryName }).click();
    // Routing sidebar previews auto-mapped department
    await expect(page.getByText('Examination').last()).toBeVisible();

    await page.getByRole('combobox', { name: /priority/i }).click();
    await page.getByRole('option', { name: ticket.priority }).click();
    await page.getByLabel(/description/i).fill(ticket.description);

    await fileInput.setInputFiles({
      name: 'hall-ticket-proof.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Valid student supporting document for E2E test.'),
    });
    await expect(page.getByText(/hall-ticket-proof\.txt/i)).toBeVisible();

    await page.getByRole('button', { name: /submit query/i }).click();
    await expectToastSuccess(page, /created and routed successfully/i);

    // Confirmation summary card shows generated ticket number
    const ticketNumLocator = page.locator('text=/ITI-\\d{4}-\\d{5}/').first();
    await expect(ticketNumLocator).toBeVisible();
    const ticketNumber = (await ticketNumLocator.textContent()).trim();
    expect(ticketNumber).toMatch(/^ITI-\d{4}-\d{5}$/);

    // Verify persistence in My Queries after page reload
    await page.getByRole('link', { name: /my queries/i }).last().click();
    await page.waitForURL('**/student/queries');
    await page.reload();
    await expect(page.getByRole('link', { name: ticketNumber })).toBeVisible();
    await expect(page.getByText(ticket.subject)).toBeVisible();
  });

  test('My Queries supports search, status/category filtering, reset filters, and Ticket Detail timeline + reply + feedback', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/student/queries');

    // Search for seeded ticket ITI-2026-00102 (Bonafide certificate for bus pass, Resolved)
    const searchInput = page.getByPlaceholder(/search by ticket id/i);
    await searchInput.fill('ITI-2026-00102');
    await expect(page.getByRole('link', { name: 'ITI-2026-00102' })).toBeVisible();
    await expect(page.getByText('Bonafide certificate for bus pass')).toBeVisible();

    // Filter by Status = Resolved
    await page.getByRole('combobox', { name: /status/i }).click();
    await page.getByRole('option', { name: 'Resolved' }).click();
    await expect(page.getByRole('link', { name: 'ITI-2026-00102' })).toBeVisible();

    // Filter by Category = Administrative
    await page.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: 'Administrative' }).click();
    await expect(page.getByRole('link', { name: 'ITI-2026-00102' })).toBeVisible();

    // Reset filters restores all queries
    await page.getByRole('button', { name: /reset filters/i }).click();
    await expect(searchInput).toHaveValue('');

    // Open an active ticket (ITI-2026-00101: Correction in practical attendance, Open)
    await searchInput.fill('ITI-2026-00101');
    await page.getByRole('link', { name: 'ITI-2026-00101' }).click();
    await page.waitForURL('**/student/queries/*');

    await expect(page.getByText('Ticket timeline')).toBeVisible();
    await expect(page.getByText('Support request received.')).toBeVisible();

    // Empty reply validation
    await page.getByRole('button', { name: /send reply/i }).click();
    await expectToastWarning(page, 'Write a reply or attach a file before sending.');

    // Post follow-up reply
    const followUp = `Student follow-up E2E ${Date.now()}`;
    await page.getByLabel(/write a helpful reply/i).fill(followUp);
    await page.getByRole('button', { name: /send reply/i }).click();
    await expectToastSuccess(page, 'Your reply has been sent.');
    await expect(page.getByText(followUp)).toBeVisible();

    // Submit feedback rating on Resolved ticket ITI-2026-00102
    await page.goto('/student/queries/102');
    await expect(page.getByText('How was your support experience?')).toBeVisible();
    await page.getByRole('radio', { name: '5 Stars' }).click({ force: true });
    await page.getByLabel(/anything you’d like us to know/i).fill('Very helpful and prompt service!');
    await page.getByRole('button', { name: /submit feedback/i }).click();
    await expectToastSuccess(page, 'Thank you! Your feedback makes a difference.');
  });

  test('Student profile validates mobile number and persists profile updates across reload', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/student/profile');

    // Invalid phone validation
    const phoneField = page.getByLabel(/mobile number/i);
    await phoneField.fill('12');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expectToastWarning(page, 'Enter a valid mobile number (7–20 digits).');

    // Valid update
    await phoneField.fill('9876543299');
    await page.getByLabel(/trade/i).fill('Electrician (Honors)');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your profile has been updated.');

    await page.reload();
    await expect(page.getByLabel(/mobile number/i)).toHaveValue('9876543299');
    await expect(page.getByLabel(/trade/i)).toHaveValue('Electrician (Honors)');
  });
});


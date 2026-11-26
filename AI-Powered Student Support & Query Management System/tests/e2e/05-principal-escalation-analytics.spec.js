import fs from 'node:fs';
import { test, expect } from './helpers/fixtures.js';
import { loginAs } from './helpers/auth.helper.js';
import { expectToastSuccess } from './helpers/toast.helper.js';

test.describe('05 - Principal Escalation, Analytics & CSV Report Export', () => {
  test('Principal dashboard renders charts, staff performance, critical watchlist, and exports valid CSV report', async ({ page }) => {
    await loginAs(page, 'principal');

    // KPI summary cards
    await expect(page.getByText('Total tickets').first()).toBeVisible();
    await expect(page.getByText('Resolution rate').first()).toBeVisible();
    await expect(page.getByText('Avg. first response').first()).toBeVisible();
    await expect(page.getByText('Student satisfaction').first()).toBeVisible();

    // Recharts SVG visualizations render cleanly
    const charts = page.locator('svg.recharts-surface');
    await expect(charts.first()).toBeVisible();
    expect(await charts.count()).toBeGreaterThanOrEqual(4);

    // Staff performance table & critical watchlist
    await expect(page.getByRole('table', { name: 'Staff performance' })).toBeVisible();
    await expect(page.getByText('A little extra attention needed')).toBeVisible();

    // Report Export (CSV download event + file content verification)
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export report/i }).click();
    const download = await downloadPromise;
    await expectToastSuccess(page, 'Your report has been downloaded.');

    expect(download.suggestedFilename()).toMatch(/^sahay-support-report-\d{4}-\d{2}-\d{2}\.csv$/);
    const filePath = await download.path();
    expect(filePath).toBeTruthy();

    const csvContent = fs.readFileSync(filePath, 'utf8');
    expect(csvContent).toContain('SAHAY — INSTITUTE SUPPORT REPORT');
    expect(csvContent).toContain('"Department","Total","Resolved","Pending","Average first response (hours)"');
    expect(csvContent).toContain('"Staff","Assigned","Resolved","Pending","Average first response (hours)","Satisfaction"');
    expect(csvContent).toContain('"Date","Created","Resolved"');
    expect(csvContent.split(/\r?\n/).length).toBeGreaterThan(15);
  });

  test('Principal inspects escalated tickets, intervenes with reply, reassigns, and resolves', async ({ page }) => {
    await loginAs(page, 'principal');
    await page.goto('/principal/tickets');

    // Critical & Escalated Watchlist is checked by default for Principal
    const watchlistToggle = page.getByRole('checkbox', { name: /critical & escalated watchlist/i });
    await expect(watchlistToggle).toBeChecked();
    await expect(page.getByRole('link', { name: 'ITI-2026-00109' })).toBeVisible();

    // Uncheck watchlist -> shows all tickets, filter by Escalated status
    await watchlistToggle.uncheck();
    await page.getByRole('combobox', { name: /status/i }).click();
    await page.getByRole('option', { name: 'Escalated' }).click();
    await expect(page.getByRole('link', { name: 'ITI-2026-00109' })).toBeVisible();

    // Open escalated ticket ITI-2026-00109 (Scholarship bank verification delayed)
    await page.getByRole('link', { name: 'ITI-2026-00109' }).click();
    await page.waitForURL('**/principal/queries/109');

    // Principal posts intervention reply
    const interventionMsg = `Principal escalation intervention ${Date.now()}`;
    await page.getByLabel(/write a helpful reply/i).fill(interventionMsg);
    await page.getByRole('button', { name: /send reply/i }).click();
    await expectToastSuccess(page, 'Your reply has been sent.');
    await expect(page.getByText(interventionMsg)).toBeVisible();

    // Principal reassigns to Administration department
    await page.getByRole('button', { name: /forward ticket/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: /department/i }).click();
    await page.getByRole('option', { name: 'Administration' }).click();
    await dialog.getByLabel(/reason \/ handover note/i).fill('Principal directing Administration to expedite scholarship bank check.');
    await dialog.getByRole('button', { name: /reassign/i }).click();
    await expectToastSuccess(page, /Assigned to/i);

    // Principal resolves the ticket
    await page.getByTestId('resolve-ticket').click();
    await page.getByRole('dialog').getByRole('button', { name: /confirm/i }).click();
    await expectToastSuccess(page, /Status: Resolved/i);
  });
});


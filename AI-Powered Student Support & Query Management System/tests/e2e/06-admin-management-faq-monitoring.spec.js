import { test, expect } from './helpers/fixtures.js';
import { loginAs, loginViaApi } from './helpers/auth.helper.js';
import { expectToastError, expectToastInfo, expectToastSuccess, expectToastWarning } from './helpers/toast.helper.js';
import { uniqueCategoryData, uniqueDeptData, uniqueEmail, uniqueFaqData, uniqueRuleData } from './helpers/testData.js';

test.describe('06 - Admin All Tickets, Management CRUD, FAQs & AI Monitoring', () => {
  test('All Tickets page displays system-wide tickets across departments with filters', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/tickets');

    await expect(page.getByRole('heading', { name: /all tickets/i })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Support queries' }).locator('tbody tr')).toHaveCount(8);

    // Search for seeded ticket across system
    await page.getByPlaceholder(/search by ticket id/i).fill('ITI-2026-00100');
    await expect(page.getByRole('link', { name: 'ITI-2026-00100' })).toBeVisible();
    await page.getByRole('button', { name: /reset filters/i }).click();

    // Filter by Department = Technical / IT
    await page.getByRole('combobox', { name: /department/i }).click();
    await page.getByRole('option', { name: 'Technical / IT' }).click();
    await expect(page.getByText('Student portal password reset').first()).toBeVisible();

    // Reset filters
    await page.getByRole('button', { name: /reset filters/i }).click();
    await expect(page.getByRole('table', { name: 'Support queries' }).locator('tbody tr').first()).toBeVisible();
  });

  test('Users CRUD: validates email/password, creates user, edits role & active status, and deletes unused user', async ({ page }) => {
    const newEmail = uniqueEmail('cruduser');
    await loginAs(page, 'admin');
    await page.goto('/admin/users');

    // Open Add dialog and test validation (invalid email + short password)
    await page.getByRole('button', { name: /add new/i }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^name/i).fill('Test Staff Member');
    await dialog.getByLabel(/email address/i).fill('bad-email');
    await dialog.getByLabel(/password/i).fill('123');
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastWarning(page, 'Enter a valid email address.');

    await dialog.getByLabel(/email address/i).fill(newEmail);
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastWarning(page, 'Password must be at least 8 characters.');

    // Create valid student user
    await dialog.getByLabel(/password/i).fill('SecurePass@2026');
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');

    // Search for created user, edit role to Principal and deactivate
    await page.getByPlaceholder(/search users/i).fill(newEmail);
    await expect(page.getByText(newEmail)).toBeVisible();
    await page.getByRole('button', { name: 'Edit Test Staff Member' }).click();

    dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: /role/i }).click();
    await page.getByRole('option', { name: 'Principal / Supervisor' }).click();
    await dialog.getByRole('checkbox', { name: /active/i }).uncheck();
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');
    await expect(page.getByText('Inactive').first()).toBeVisible();

    // Cleanly delete unused test user
    await page.getByRole('button', { name: 'Delete Test Staff Member' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();
    await expectToastSuccess(page, 'Record deleted.');
    await expect(page.getByText(newEmail)).toHaveCount(0);
  });

  test('Departments & Categories CRUD: validates SLA & duplicate codes, creates, edits, and deletes cleanly', async ({ page }) => {
    const dept = uniqueDeptData();
    const cat = uniqueCategoryData();
    await loginAs(page, 'admin');

    // --- Departments CRUD ---
    await page.goto('/admin/departments');
    await page.getByRole('button', { name: /add new/i }).click();
    let dialog = page.getByRole('dialog');

    // Invalid SLA (> 168)
    await dialog.getByLabel(/^name/i).fill(dept.name);
    await dialog.getByLabel(/^code/i).fill(dept.code);
    await dialog.getByLabel(/sla \(hours\)/i).fill('200');
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastWarning(page, 'SLA must be between 1 and 168 hours.');

    // Duplicate code ('EXAM') -> Laravel 422 error toast
    await dialog.getByLabel(/^code/i).fill('EXAM');
    await dialog.getByLabel(/sla \(hours\)/i).fill(dept.sla_hours);
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastError(page, 'Department codes must be unique.');

    // Create valid department
    await dialog.getByLabel(/^code/i).fill(dept.code);
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');

    // Search & Edit department
    await page.getByPlaceholder(/search departments/i).fill(dept.code);
    await expect(page.getByText(dept.name)).toBeVisible();
    await page.getByRole('button', { name: `Edit ${dept.name}` }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel(/sla \(hours\)/i).fill('48');
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');
    await expect(page.getByText('48h')).toBeVisible();

    // --- Categories CRUD ---
    await page.goto('/admin/categories');
    await page.getByRole('button', { name: /add new/i }).click();
    dialog = page.getByRole('dialog');

    // Empty name validation
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastWarning(page, 'Category name must be at least 2 characters.');

    // Create category mapped to new department
    await dialog.getByLabel(/^name/i).fill(cat.name);
    await dialog.getByRole('combobox', { name: /department/i }).click();
    await page.getByRole('option', { name: dept.name }).click();
    await dialog.getByLabel(/description/i).fill(cat.description);
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');

    // Edit & Delete category
    await page.getByPlaceholder(/search query categories/i).fill(cat.name);
    await page.getByRole('button', { name: `Edit ${cat.name}` }).click();
    dialog = page.getByRole('dialog');
    const updatedCatName = `${cat.name} Updated`;
    await dialog.getByLabel(/^name/i).fill(updatedCatName);
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');

    await page.getByPlaceholder(/search query categories/i).fill(updatedCatName);
    await page.getByRole('button', { name: `Delete ${updatedCatName}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();
    await expectToastSuccess(page, 'Record deleted.');

    // Now delete the temporary department cleanly
    await page.goto('/admin/departments');
    await page.getByPlaceholder(/search departments/i).fill(dept.code);
    await page.getByRole('button', { name: `Delete ${dept.name}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();
    await expectToastSuccess(page, 'Record deleted.');
  });

  test('Escalation rules CRUD validates negative/zero threshold hours, creates, edits, simulates, and deletes', async ({ page }) => {
    const rule = uniqueRuleData();
    await loginAs(page, 'admin');
    await page.goto('/admin/escalation');

    await page.getByRole('button', { name: /add new/i }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^name/i).fill(rule.name);
    await dialog.getByLabel(/threshold \(hours\)/i).fill('-5');
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastWarning(page, 'Threshold must be between 1 and 720 hours.');

    await dialog.getByLabel(/threshold \(hours\)/i).fill(rule.threshold_hours);
    await dialog.getByRole('combobox', { name: /priority/i }).click();
    await page.getByRole('option', { name: rule.priority }).click();
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');

    await page.getByPlaceholder(/search escalation rules/i).fill(rule.name);
    await expect(page.getByText(rule.name)).toBeVisible();

    // Edit threshold
    await page.getByRole('button', { name: `Edit ${rule.name}` }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel(/threshold \(hours\)/i).fill('30');
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');
    await expect(page.getByText('30h')).toBeVisible();

    // Simulate +24h escalation action
    await page.getByRole('button', { name: /simulate \+24h/i }).click();
    await expectToastInfo(page, /Escalated \d+ overdue tickets/i);

    // Delete rule
    await page.getByRole('button', { name: `Delete ${rule.name}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();
    await expectToastSuccess(page, 'Record deleted.');
  });

  test('Multilingual FAQ Management: validates translations, publishes, verifies Student search + Helpful feedback, edits & deletes', async ({ page, browser }) => {
    const faq = uniqueFaqData();
    await loginAs(page, 'admin');
    await page.goto('/admin/faqs');

    await page.getByRole('button', { name: /add new/i }).click();
    let dialog = page.getByRole('dialog');

    // Select category and fill only English, then click Approve & publish -> expects HI translation error
    await dialog.getByRole('combobox', { name: /category/i }).click();
    await page.getByRole('option', { name: faq.categoryName }).click();
    await dialog.getByLabel(/^question/i).fill(faq.translations.en.question);
    await dialog.getByLabel(/approved answer/i).fill(faq.translations.en.answer);
    await dialog.getByLabel(/search keywords/i).fill(faq.translations.en.keywords);

    await dialog.getByRole('button', { name: /approve & publish/i }).click();
    await expectToastWarning(page, /Both question and answer in HI are required/i);

    // Fill Hindi & Gujarati translations
    await dialog.getByLabel(/^question/i).fill(faq.translations.hi.question);
    await dialog.getByLabel(/approved answer/i).fill(faq.translations.hi.answer);
    await dialog.getByLabel(/search keywords/i).fill(faq.translations.hi.keywords);

    await dialog.getByRole('tab', { name: 'ગુજરાતી' }).click();
    await dialog.getByLabel(/^question/i).fill(faq.translations.gu.question);
    await dialog.getByLabel(/approved answer/i).fill(faq.translations.gu.answer);
    await dialog.getByLabel(/search keywords/i).fill(faq.translations.gu.keywords);

    await dialog.getByRole('button', { name: /approve & publish/i }).click();
    await expectToastSuccess(page, 'FAQ approved and published in all three languages.');

    // Verify in Student context on /student/faqs: search finds it + Helpful button records feedback in DB
    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await loginViaApi(studentPage, 'student');
    await studentPage.goto('/student/faqs');

    await studentPage.getByPlaceholder(/what would you like to know/i).fill(faq.translations.en.question);
    await expect(studentPage.getByText(faq.translations.en.question)).toBeVisible();
    await studentPage.getByText(faq.translations.en.question).click();
    await expect(studentPage.getByText(faq.translations.en.answer)).toBeVisible();

    const helpfulBtn = studentPage.getByRole('button', { name: 'Helpful', exact: true }).first();
    const feedbackResPromise = studentPage.waitForResponse((res) => res.url().includes('/feedback') && res.request().method() === 'POST');
    await helpfulBtn.click();
    const feedbackRes = await feedbackResPromise;
    expect(feedbackRes.ok()).toBeTruthy();
    const feedbackJson = await feedbackRes.json();
    expect(feedbackJson.data.helpful).toBeGreaterThanOrEqual(1);
    await expectToastSuccess(studentPage, 'Thank you! Your feedback makes a difference.');
    await studentCtx.close();

    // Admin edits and deletes the test FAQ cleanly
    await page.getByPlaceholder(/what would you like to know/i).fill(faq.translations.en.question);
    await expect(page.getByText(faq.translations.en.question)).toBeVisible();
    await page.locator('button[aria-label^="Edit FAQ "]').first().click();

    dialog = page.getByRole('dialog');
    const editedQuestion = `${faq.translations.en.question} (Edited)`;
    await dialog.getByLabel(/^question/i).fill(editedQuestion);
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expectToastSuccess(page, 'Your changes have been saved.');

    await page.getByPlaceholder(/what would you like to know/i).fill(editedQuestion);
    await expect(page.getByText(editedQuestion)).toBeVisible();
    await page.locator('button[aria-label^="Delete FAQ "]').first().click();
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();
    await expectToastSuccess(page, 'Record deleted.');
  });

  test('AI Monitoring page displays live AiActionLog records and opens trace modal', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/ai-monitoring');

    await expect(page.getByText('Total tool calls')).toBeVisible();
    await expect(page.getByText(/FAQ match rate:/i)).toBeVisible();
    await expect(page.getByText(/AI Gateway:/i)).toBeVisible();

    const table = page.getByRole('table', { name: 'AI action logs' });
    await expect(table).toBeVisible();
    await expect(table.getByText('search_faq').first()).toBeVisible();

    // Open trace details dialog
    await table.getByRole('button', { name: /view trace/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Knowledge policy:/i)).toBeVisible();
    await dialog.getByRole('button', { name: /close/i }).click();
  });
});


import { test, expect } from '@playwright/test';

async function capture(page, testInfo, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true, animations: 'disabled' });
}

async function switchRole(page, role) {
  await page.getByTestId('switch-role').click();
  await page.getByTestId(`switch-${role}`).click();
  await expect(page).toHaveURL(new RegExp(`/${role}$`));
}

test('complete multilingual hackathon recording flow', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'A good place to start.' })).toBeVisible();
  await capture(page, testInfo, '01-login.png');
  await page.getByTestId('demo-student').click();
  await expect(page.getByRole('heading', { name: /Welcome back, Aarav/ })).toBeVisible();
  await capture(page, testInfo, '02-student-dashboard.png');

  await page.getByRole('link', { name: /AI Assistant/ }).click();
  await expect(page.getByRole('heading', { name: 'Hi, I’m Sahay.' })).toBeVisible();
  await page.getByTestId('suggestGujarati').click();
  await expect(page.getByText('સ્રોત: માન્ય FAQ', { exact: true })).toBeVisible();
  await expect(page.getByRole('log')).toContainText('digitalgujarat.gov.in');
  await capture(page, testInfo, '03-gujarati-answer.png');

  await page.getByTestId('chat-input').fill('मेरे परीक्षा पंजीकरण में त्रुटि आ रही है');
  await page.getByTestId('chat-input').press('Enter');
  await expect(page.getByTestId('confirm-create-ticket')).toBeVisible();
  await page.getByTestId('chat-input').fill('मेरा प्रशिक्षु नंबर GTI-2026-0142 है और Duplicate record दिखाई देता है।');
  await page.getByTestId('chat-input').press('Enter');
  await expect(page.getByRole('log')).toContainText('मैंने यह जानकारी आपके अनुरोध में जोड़ दी है');
  await page.getByTestId('confirm-create-ticket').click();
  await expect(page.getByRole('log')).toContainText('ITI-2026-00125');
  await expect(page.getByRole('log')).toContainText('Mehul Joshi');
  await capture(page, testInfo, '04-ticket-created.png');

  await switchRole(page, 'staff');
  await page.getByRole('link', { name: 'ITI-2026-00125', exact: true }).first().click();
  await page.getByLabel('Write a helpful reply…').fill('आपके पंजीकरण का डुप्लिकेट रिकॉर्ड ठीक कर दिया गया है। कृपया पोर्टल में लॉगिन करके नया आवेदन पुष्टिकरण डाउनलोड करें।');
  await page.getByRole('button', { name: 'Send reply', exact: true }).click();
  await expect(page.getByText('Your reply has been sent.', { exact: true })).toBeVisible();
  await page.getByTestId('resolve-ticket').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Suggest as FAQ', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Question', exact: true }).fill('How can students resolve a duplicate examination registration record?');
  await dialog.getByLabel('Approved answer').fill('Share the trainee number and error screenshot with the Examination Cell. Staff will verify the official record and provide an updated acknowledgement after correction.');
  await dialog.getByRole('button', { name: 'Suggest as FAQ', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await capture(page, testInfo, '05-staff-resolution.png');

  await switchRole(page, 'student');
  await page.getByTestId('notification-bell').click();
  await page.getByText('ITI-2026-00125 · Resolved', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How was your support experience?' })).toBeVisible();
  await page.locator('label').filter({ hasText: /^5 Stars$/ }).click();
  await expect(page.getByLabel('5 Stars', { exact: true })).toBeChecked();
  await page.getByLabel('Anything you’d like us to know? (optional)').fill('Clear, quick and helpful. Thank you!');
  await page.getByRole('button', { name: 'Submit feedback', exact: true }).click();
  await expect(page.getByText('Thank you! Your feedback makes a difference.', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('5 Stars', { exact: true })).toBeChecked();
  await capture(page, testInfo, '06-student-feedback.png');

  await switchRole(page, 'admin');
  await page.getByRole('link', { name: 'Review suggestions', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'How can students resolve a duplicate examination registration record?' });
  await row.getByRole('button', { name: 'Review', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'हिन्दी', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Question', exact: true }).fill('परीक्षा पंजीकरण का डुप्लिकेट रिकॉर्ड कैसे ठीक करें?');
  await dialog.getByLabel('Approved answer').fill('प्रशिक्षु नंबर और त्रुटि का स्क्रीनशॉट परीक्षा विभाग को दें। कर्मचारी रिकॉर्ड सत्यापित करके सुधार के बाद नया पुष्टिकरण देंगे।');
  await dialog.getByRole('tab', { name: 'ગુજરાતી', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Question', exact: true }).fill('પરીક્ષા નોંધણીનો ડુપ્લિકેટ રેકોર્ડ કેવી રીતે સુધારવો?');
  await dialog.getByLabel('Approved answer').fill('તાલીમાર્થી નંબર અને ભૂલનો સ્ક્રીનશોટ પરીક્ષા વિભાગને આપો. કર્મચારી રેકોર્ડ ચકાસીને સુધારા પછી નવી પહોંચ આપશે.');
  await dialog.getByRole('button', { name: 'Approve & publish', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('FAQ approved and published in all three languages.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'AI Monitoring', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Monitoring', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('create_ticket');
  await capture(page, testInfo, '07-ai-monitoring.png');

  await switchRole(page, 'principal');
  await expect(page.getByRole('heading', { name: 'Better support. Stronger outcomes.' })).toBeVisible();
  await page.getByTestId('simulate-time').click();
  await page.getByTestId('advance-clock').click();
  await expect(page.getByRole('dialog')).toContainText('overdue tickets escalated');
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText('Escalated', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Reassign', exact: true }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: /^Department/ }).click();
  await page.getByRole('option', { name: 'Technical / IT', exact: true }).click();
  await dialog.getByRole('combobox', { name: /^Assigned to/ }).click();
  await page.getByRole('option', { name: 'Hitesh Makwana', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Reason / handover note', exact: true }).fill('Please review the examination portal record and coordinate with the Examination Cell.');
  await dialog.getByRole('button', { name: 'Reassign', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('link', { name: 'ITI-2026-00112', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hitesh Makwana', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Suggest as FAQ', exact: true })).toHaveCount(0);
  await expect(page.getByText('Escalated', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Analytics Overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Better support. Stronger outcomes.' })).toBeVisible();
  await capture(page, testInfo, '08-principal-escalations.png');
  expect(errors).toEqual([]);
});

test('mobile navigation, Gujarati UI, FAQs and protected routing', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/student');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('demo-student').click();
  await expect(page.getByRole('heading', { name: /Welcome back, Aarav/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('combobox', { name: 'Language', exact: true }).click();
  await page.getByRole('option', { name: 'ગુજરાતી', exact: true }).click();
  await expect(page.getByRole('heading', { name: /ફરી સ્વાગત છે/ })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('link', { name: 'પ્રશ્નોત્તરી કેન્દ્ર', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'થોડું જ્ઞાન, લાંબો સાથ' })).toBeVisible();
  await page.getByRole('textbox', { name: 'તમે શું જાણવા માંગો છો?' }).fill('શિષ્યવૃત્તિ');
  await expect(page.getByText('3 માન્ય જવાબો', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /આઈટીઆઈ શિષ્યવૃત્તિ માટે કેવી રીતે અરજી કરવી/ }).click();
  await expect(page.getByText(/Digital Gujarat પોર્ટલ digitalgujarat.gov.in/)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, testInfo, '09-mobile-gujarati.png');
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/student$/);
  expect(errors).toEqual([]);
});

test('manual query, search filters, metadata attachment and admin CRUD dialogs', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('demo-student').click();
  await page.getByRole('button', { name: /Raise a query/ }).click();
  await page.getByRole('textbox', { name: 'Subject', exact: true }).fill('Workshop equipment verification request');
  await page.getByRole('combobox', { name: 'Category', exact: true }).click();
  await page.getByRole('option', { name: 'Workshop / Trade', exact: true }).click();
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Please verify the measurement equipment available for our second-year workshop batch.');
  await page.locator('input[type="file"]').setInputFiles({ name: 'workshop-note.txt', mimeType: 'text/plain', buffer: Buffer.from('Equipment reference for the demo.') });
  await page.getByRole('button', { name: 'Submit query', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'You’re in good hands!' })).toBeVisible();
  await expect(page.getByText('Jignesh Parmar', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'View ticket', exact: true }).click();
  await expect(page.getByText('workshop-note.txt', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'My Queries', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Search by ticket ID, subject, or student…' }).fill('workshop equipment verification');
  await expect(page.getByRole('table')).toContainText('Workshop equipment verification request');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);

  await switchRole(page, 'admin');
  await page.getByRole('link', { name: 'Departments', exact: true }).click();
  await page.getByRole('button', { name: 'Add new', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Placement Cell');
  await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('PLAC');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Placement Cell' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Placement Cell', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Industry Placement Cell');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Industry Placement Cell' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Industry Placement Cell', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Industry Placement Cell' })).toHaveCount(0);
});

test('student registration, profile persistence, login/logout and hidden demo reset', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/register');
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Harsh Mehta');
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('harsh@demo.test');
  await page.getByLabel(/^Password/).fill('Welcome@2026');
  await page.getByLabel(/^Confirm password/).fill('Welcome@2026');
  await page.getByRole('button', { name: 'Create a student account', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Welcome back, Harsh/ })).toBeVisible();
  await page.getByRole('link', { name: 'My Profile', exact: true }).click();
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Harsh Vyas');
  await page.getByRole('textbox', { name: 'Mobile number', exact: true }).fill('9876543210');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Your profile has been updated.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Full name', exact: true })).toHaveValue('Harsh Vyas');
  await page.getByRole('button', { name: 'Profile menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('harsh@demo.test');
  await page.getByLabel(/^Password/).fill('Welcome@2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Welcome back, Harsh/ })).toBeVisible();
  await page.keyboard.press('Control+Shift+D');
  await page.getByRole('dialog').getByRole('button', { name: 'Reset & start demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Welcome back, Aarav/ })).toBeVisible();
  await expect(page.getByText('DEMO MODE · Ctrl ⇧ D', { exact: true })).toBeVisible();
  await page.keyboard.press('Control+Shift+D');
  await page.getByRole('dialog').getByRole('button', { name: 'Hide demo mode', exact: true }).click();
  await expect(page.getByText('DEMO MODE · Ctrl ⇧ D', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

import { test, expect } from './helpers/fixtures.js';
import { getAuthToken, loginAs, logout, SEEDED_USERS } from './helpers/auth.helper.js';
import { expectToastError, expectToastInfo, expectToastSuccess, expectToastWarning } from './helpers/toast.helper.js';
import { uniqueEmail } from './helpers/testData.js';

test.describe('01 - Authentication, Form Validation & RBAC Guards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('Login form validates empty submit, invalid email, and wrong credentials', async ({ page }) => {
    await page.goto('/login');

    // Empty submit -> client-side validation error + warning toast
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText('Enter a valid email address.').first()).toBeVisible();
    await expectToastWarning(page, 'Enter a valid email address.');

    // Invalid email format
    await page.getByLabel(/email address/i).fill('not-an-email');
    await page.getByLabel(/password/i).first().fill('Demo@2026');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText('Enter a valid email address.').first()).toBeVisible();

    // Valid email format, wrong password -> Laravel 401 + error toast
    await page.getByLabel(/email address/i).fill(SEEDED_USERS.student.email);
    await page.getByLabel(/password/i).first().fill('WrongPassword999');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expectToastError(page, 'The email or password is incorrect.');
    await expect(page.locator('.MuiAlert-root').filter({ hasText: 'The email or password is incorrect.' })).toBeVisible();
    expect(await getAuthToken(page)).toBeNull();
  });

  test('Registration validates weak password, password mismatch, duplicate email, and succeeds for new student', async ({ page }) => {
    await page.goto('/register');

    const fullName = page.getByLabel(/full name/i);
    const emailInput = page.getByLabel(/email address/i);
    const phoneInput = page.getByLabel(/mobile number/i);
    const passwordInput = page.getByLabel(/^password/i);
    const confirmInput = page.getByLabel(/confirm password/i);
    const submitBtn = page.getByRole('button', { name: /create a student account/i });

    // Weak password (< 8 chars)
    await fullName.fill('Karan Solanki');
    await emailInput.fill(uniqueEmail('weak'));
    await phoneInput.fill('9876501234');
    await passwordInput.fill('short1');
    await confirmInput.fill('short1');
    await submitBtn.click();
    await expectToastWarning(page, 'Password must be at least 8 characters.');
    await expect(page.getByText('Password must be at least 8 characters.').first()).toBeVisible();

    // Password mismatch
    await passwordInput.fill('StrongPass@1');
    await confirmInput.fill('MismatchPass@2');
    await submitBtn.click();
    await expectToastWarning(page, 'The passwords do not match.');
    await expect(page.getByText('The passwords do not match.').first()).toBeVisible();

    // Duplicate email -> Laravel 422 error toast
    await emailInput.fill(SEEDED_USERS.student.email);
    await passwordInput.fill('StrongPass@1');
    await confirmInput.fill('StrongPass@1');
    await submitBtn.click();
    await expectToastError(page, 'An account with this email already exists.');

    // Successful new student registration -> auto redirect to /student + success toast
    const freshEmail = uniqueEmail('newstudent');
    await fullName.fill('Karan Solanki');
    await emailInput.fill(freshEmail);
    await submitBtn.click();

    await expectToastSuccess(page, 'Account created! Welcome to Sahay, Karan Solanki.');
    await page.waitForURL('**/student');
    expect(await getAuthToken(page)).toBeTruthy();
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByText('Karan Solanki')).toBeVisible();
  });

  test('All four roles land on their exact dashboard with expected sidebar links and user badge', async ({ page }) => {
    // 1. Student
    await loginAs(page, 'student');
    await expectToastSuccess(page, `Welcome back, ${SEEDED_USERS.student.name}!`);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByText('Student Portal')).toBeVisible();
    for (const label of ['Overview', 'AI Assistant', 'My Queries', 'FAQ Center', 'My Profile']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
    await expect(nav.getByText('Aarav Patel')).toBeVisible();
    await expect(nav.getByText('GTI-2026-0142')).toBeVisible();
    await logout(page);

    // 2. Staff
    await loginAs(page, 'staff');
    await expect(nav.getByText('Staff Workspace')).toBeVisible();
    for (const label of ['Overview', 'Ticket Inbox', 'FAQ Center', 'My Profile']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
    await expect(nav.getByText('Mehul Joshi')).toBeVisible();
    await expect(nav.getByText('Staff / Instructor')).toBeVisible();
    await logout(page);

    // 3. Principal
    await loginAs(page, 'principal');
    await expect(nav.getByText('Institute Oversight')).toBeVisible();
    for (const label of ['Analytics Overview', 'All Tickets', 'My Profile']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
    await expect(nav.getByText('Dr. Rupal Shah')).toBeVisible();
    await expect(nav.getByText('Principal / Supervisor')).toBeVisible();
    await logout(page);

    // 4. Admin
    await loginAs(page, 'admin');
    await expect(nav.getByText('Administration')).toBeVisible();
    for (const label of ['Overview', 'All Tickets', 'AI Monitoring', 'Users', 'Departments', 'Query Categories', 'Staff Assignments', 'FAQ Management', 'Escalation Rules', 'My Profile']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
    await expect(nav.getByText('Drashti Desai')).toBeVisible();
    await expect(nav.getByText('Administrator')).toBeVisible();
    await logout(page);
  });

  test('RBAC guards block unauthenticated access and cross-role route access', async ({ page }) => {
    // Unauthenticated access to protected role routes -> /login
    for (const protectedPath of ['/student', '/student/queries', '/staff/inbox', '/admin/users', '/principal/tickets']) {
      await page.goto(protectedPath);
      await page.waitForURL('**/login');
    }

    // Authenticated Student blocked from staff, admin, principal portals -> redirected to /student
    await loginAs(page, 'student');
    for (const forbiddenPath of ['/admin/tickets', '/admin/users', '/staff/inbox', '/principal/tickets']) {
      await page.goto(forbiddenPath);
      await page.waitForURL((url) => url.pathname === '/student');
    }
  });

  test('Logout clears token and prevents back-button access to protected routes', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/student/queries');
    await expect(page.getByRole('heading', { name: /my queries/i })).toBeVisible();

    await logout(page);
    await expectToastInfo(page, 'Signed out successfully.');
    expect(await getAuthToken(page)).toBeNull();

    await page.goBack();
    await page.waitForURL('**/login');

    await page.goto('/student');
    await page.waitForURL('**/login');
  });
});


import { test, expect } from './helpers/fixtures.js';
import { loginAs } from './helpers/auth.helper.js';
import { expectToastSuccess, expectToastWarning } from './helpers/toast.helper.js';

test.describe('03 - AI Chatbot Workflow & Ticket Escalation', () => {
  test('AI Chat validates empty input, answers English FAQ, handles Gujarati/Hindi, escalates to ticket, and persists across reload', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/student/chat');

    // Initial welcome screen + 4 suggested quick prompts
    await expect(page.getByText('Hi, I’m Sahay.')).toBeVisible();
    await expect(page.getByTestId('suggestGujarati')).toBeVisible();
    await expect(page.getByTestId('suggestHindi')).toBeVisible();
    await expect(page.getByTestId('suggestExam')).toBeVisible();
    await expect(page.getByTestId('suggestWorkshop')).toBeVisible();

    const chatInput = page.getByTestId('chat-input');
    const sendBtn = page.getByRole('button', { name: 'Send message' });

    // Whitespace-only input keeps Send button disabled and pressing Enter shows warning toast
    await chatInput.fill('   ');
    await expect(sendBtn).toBeDisabled();
    await chatInput.press('Enter');
    await expectToastWarning(page, 'Please enter a message before sending.');

    // Live AI Chat in English -> matches published FAQ
    await chatInput.fill('How do I apply for an ITI scholarship?');
    await sendBtn.click();

    await expect(page.getByText('How do I apply for an ITI scholarship?')).toBeVisible();
    await expect(page.getByText(/digitalgujarat\.gov\.in/i)).toBeVisible();
    await expect(page.getByText('Source: Approved FAQ').first()).toBeVisible();

    // Expand AI actions trace to verify tool execution log
    await page.getByRole('button', { name: /ai actions ·/i }).first().click();
    await expect(page.getByText('search_faq').first()).toBeVisible();

    // Multilingual check: Gujarati query
    await chatInput.fill('શિષ્યવૃત્તિ માટે કેવી રીતે અરજી કરવી?');
    await sendBtn.click();
    await expect(page.getByText(/Digital Gujarat પોર્ટલ/i)).toBeVisible();
    await expect(page.locator('.MuiChip-label', { hasText: 'ગુજરાતી' }).first()).toBeVisible();

    // Multilingual check: Hindi query (unmatched issue -> confirmation card)
    await chatInput.fill('मेरे परीक्षा पंजीकरण में त्रुटि आ रही है');
    await sendBtn.click();
    await expect(page.locator('.MuiChip-label', { hasText: 'हिन्दी' }).first()).toBeVisible();

    // Escalate / Confirm ticket creation from chat
    await expect(page.getByTestId('confirm-create-ticket')).toBeVisible();
    await page.getByTestId('confirm-create-ticket').click();
    await expectToastSuccess(page, /ITI-\d{4}-\d{5}/);

    const createdTicketRef = page.locator('text=/ITI-\\d{4}-\\d{5}/').first();
    await expect(createdTicketRef).toBeVisible();
    const createdTicketNumber = (await createdTicketRef.textContent()).trim();

    // Session persistence across reload
    await page.waitForURL(/\?session=\d+/);
    await page.reload();
    await expect(page.getByText('How do I apply for an ITI scholarship?')).toBeVisible();
    await expect(page.getByText('શિષ્યવૃત્તિ માટે કેવી રીતે અરજી કરવી?')).toBeVisible();
    await expect(page.getByText(createdTicketNumber).first()).toBeVisible();

    // Confirm ticket actually exists in My Queries
    await page.goto('/student/queries');
    await page.getByPlaceholder(/search by ticket id/i).fill(createdTicketNumber);
    await expect(page.getByRole('link', { name: createdTicketNumber })).toBeVisible();
  });
});


import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/services/authService.js';
import { ticketService } from '../src/services/ticketService.js';
import { faqService } from '../src/services/faqService.js';
import { chatService } from '../src/services/chatService.js';
import { adminService } from '../src/services/adminService.js';
import { notificationService } from '../src/services/notificationService.js';
import { AUTH_KEY, DATABASE_KEY, getDatabase, refreshDatabaseFromStorage, resetDatabase } from '../src/mock/database.js';
import { detectLanguage, classifyIntent, searchApprovedFaq } from '../src/mock/agentEngine.js';
import en from '../src/i18n/en.json' with { type: 'json' };
import hi from '../src/i18n/hi.json' with { type: 'json' };
import gu from '../src/i18n/gu.json' with { type: 'json' };

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
  clear() { this.data.clear(); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
beforeEach(() => { localStorage.clear(); resetDatabase(); });

async function conversation(question, language = 'en') {
  const { data: session } = await chatService.createSession(language);
  const { data } = await chatService.sendMessage({ session_id: session.id, message: question });
  return data;
}

test('seed has relationally complete multilingual data and four users per role', () => {
  const db = getDatabase();
  for (const role of ['student', 'staff', 'admin', 'principal']) assert.equal(db.users.filter((u) => u.role === role).length, 4);
  assert.equal(db.departments.length, 6);
  assert.equal(db.tickets.length, 25);
  assert.equal(db.faqs.filter((f) => f.status === 'published').length, 30);
  for (const faq of db.faqs) {
    const translations = db.faq_translations.filter((f) => f.faq_id === faq.id);
    assert.equal(translations.length, 3);
    assert.ok(translations.every((t) => t.question && t.answer));
  }
  for (const ticket of db.tickets) {
    assert.ok(db.users.some((u) => u.id === ticket.student_id));
    assert.ok(db.users.some((u) => u.id === ticket.assigned_to && u.department_ids.includes(ticket.department_id)));
    assert.ok(db.ticket_status_history.some((h) => h.ticket_id === ticket.id));
  }
  assert.ok(localStorage.getItem(DATABASE_KEY));
});

test('Hindi and Gujarati dictionaries cover every English UI key', () => {
  for (const dictionary of [hi, gu]) {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(en).sort());
    assert.ok(Object.values(dictionary).every((value) => typeof value === 'string' && value.trim().length));
  }
});

test('Unicode detection, intent classification and fuzzy approved-FAQ retrieval', () => {
  assert.equal(detectLanguage('શિષ્યવૃત્તિ માટે અરજી કેવી રીતે કરવી?'), 'gu');
  assert.equal(detectLanguage('परीक्षा पंजीकरण की जानकारी'), 'hi');
  assert.equal(detectLanguage('Where is my hall ticket?'), 'en');
  assert.equal(classifyIntent('मेरे परीक्षा पंजीकरण में त्रुटि आ रही है'), 'Examination');
  assert.equal(classifyIntent('workshop machine fault'), 'Workshop/Trade');
  assert.equal(classifyIntent('Talk to a human'), 'Human Assistance');
  const typo = searchApprovedFaq(getDatabase(), 'How do I apply for a scholrship?', 'en', 'Scholarship');
  assert.equal(typo.faq.id, 1);
  assert.equal(searchApprovedFaq(getDatabase(), 'My exam registration shows a duplicate record error', 'en', 'Examination'), null);
});

test('authentication, student registration and protected service permissions', async () => {
  await assert.rejects(() => ticketService.listStudentQueries(), /sign in/);
  await assert.rejects(() => authService.login({ email: 'student@iti.demo', password: 'wrong' }), /incorrect/);
  const { data } = await authService.register({ name: 'Hetvi Joshi', email: 'hetvi@demo.test', password: 'Welcome@2026', trade: 'Fitter' });
  assert.equal(data.user.role, 'student');
  assert.equal(data.user.password, undefined);
  assert.ok(localStorage.getItem(AUTH_KEY));
  await assert.rejects(() => authService.register({ name: 'Hetvi Joshi', email: 'hetvi@demo.test', password: 'Welcome@2026' }), /already exists/);
  await assert.rejects(() => adminService.getReports(), /do not have access/);
  await assert.rejects(() => ticketService.getTicket(100), /not found|not accessible/);
  await authService.logout();
  assert.equal((await authService.getCurrentUser()).data, null);
});

test('Gujarati FAQ answer uses published knowledge, records a tool call and saves feedback', async () => {
  await authService.demoLogin('student');
  const { assistant_message: answer, session } = await conversation('શિષ્યવૃત્તિ માટે કેવી રીતે અરજી કરવી?', 'gu');
  assert.equal(answer.type, 'faq');
  assert.equal(answer.language, 'gu');
  assert.match(answer.content, /digitalgujarat.gov.in/);
  assert.match(answer.content, /અરજી/);
  assert.equal(answer.actions[0].tool, 'search_faq');
  assert.equal(getDatabase().tickets.length, 25);
  await chatService.setMessageFeedback(answer.id, 'up');
  const saved = (await chatService.getSession(session.id)).data;
  assert.equal(saved.messages.find((m) => m.id === answer.id).feedback, 'up');
  refreshDatabaseFromStorage();
  assert.equal((await chatService.getSessions()).data.length, 1);
});

test('Hindi issue collects context, requires consent, creates one ticket and tracks it', async () => {
  await authService.demoLogin('student');
  const initial = await conversation('मेरे परीक्षा पंजीकरण में त्रुटि आ रही है', 'hi');
  assert.equal(initial.assistant_message.type, 'confirmation');
  assert.equal(getDatabase().tickets.length, 25);
  const followup = (await chatService.sendMessage({ session_id: initial.session.id, message: 'मेरा प्रशिक्षु नंबर GTI-2026-0142 है और Duplicate record दिखाई देता है।' })).data;
  assert.equal(followup.session.context.pending_ticket.category_id, 2);
  assert.match(followup.session.context.pending_ticket.description, /परीक्षा पंजीकरण/);
  assert.match(followup.session.context.pending_ticket.description, /GTI-2026-0142/);
  await assert.rejects(() => chatService.confirmTicket(initial.session.id, initial.assistant_message.id, true), /expired/);
  const { data: result } = await chatService.confirmTicket(initial.session.id, followup.assistant_message.id, true);
  assert.equal(result.ticket.ticket_number, 'ITI-2026-00125');
  assert.equal(result.ticket.assigned_staff.name, 'Mehul Joshi');
  assert.equal(result.ticket.department.name, 'Examination');
  assert.equal(result.ticket.status, 'Assigned');
  assert.equal(getDatabase().tickets.length, 26);
  await chatService.confirmTicket(initial.session.id, followup.assistant_message.id, true);
  assert.equal(getDatabase().tickets.length, 26, 'a repeated confirmation is idempotent');
  const tracking = (await chatService.sendMessage({ session_id: initial.session.id, message: 'status of ITI-2026-00125' })).data;
  assert.equal(tracking.assistant_message.type, 'ticket');
  assert.equal(tracking.assistant_message.actions[0].tool, 'get_ticket_status');
  assert.equal(tracking.assistant_message.ticket_id, result.ticket.id);
});

test('declining a confirmation never creates a ticket; human support retains the issue', async () => {
  await authService.demoLogin('student');
  const { session, assistant_message } = await conversation('My examination registration is not working');
  await chatService.confirmTicket(session.id, assistant_message.id, false);
  assert.equal(getDatabase().tickets.length, 25);
  const human = (await chatService.sendMessage({ session_id: session.id, message: 'Talk to a human', action: 'request_human_support' })).data;
  assert.equal(human.assistant_message.type, 'confirmation');
  assert.match(human.session.context.pending_ticket.description, /examination registration/);
  assert.equal(human.session.context.pending_ticket.category_id, 2);
  assert.ok(human.assistant_message.actions.some((a) => a.tool === 'request_human_support'));
});

test('deleting a conversation never reuses an old ticket confirmation', async () => {
  await authService.demoLogin('student');
  const first = await conversation('My examination registration has a duplicate record error');
  const firstTicket = (await chatService.confirmTicket(first.session.id, first.assistant_message.id, true)).data.ticket;
  await chatService.deleteSession(first.session.id);
  refreshDatabaseFromStorage();
  const second = await conversation('My examination registration now has a different record mismatch');
  assert.notEqual(second.session.id, first.session.id);
  assert.notEqual(second.assistant_message.id, first.assistant_message.id);
  const secondTicket = (await chatService.confirmTicket(second.session.id, second.assistant_message.id, true)).data.ticket;
  assert.equal(firstTicket.ticket_number, 'ITI-2026-00125');
  assert.equal(secondTicket.ticket_number, 'ITI-2026-00126');
  assert.notEqual(secondTicket.id, firstTicket.id);
  assert.match(secondTicket.description, /different record mismatch/);
});

test('student → staff → resolved → notification → rating persists end to end', async () => {
  await authService.demoLogin('student');
  const { data: created } = await ticketService.createTicket({ subject: 'Examination registration record error', description: 'My record displays a duplicate error for trainee GTI-2026-0142.', category_id: 2, priority: 'High', attachments: [{ name: 'error.png', size: 1000, type: 'image/png' }] });
  await assert.rejects(() => ticketService.updateTicketStatus(created.id, 'Resolved'), /access/);
  await authService.demoLogin('staff');
  assert.ok((await ticketService.listStaffQueries({ search: created.ticket_number })).data.items.some((t) => t.id === created.id));
  await assert.rejects(() => ticketService.updateTicketStatus(created.id, 'Resolved'), /resolution reply/);
  await ticketService.replyToTicket(created.id, { message: 'Your duplicate registration has been verified and corrected. Please download the updated acknowledgement.' });
  assert.equal((await ticketService.getTicket(created.id)).data.status, 'In Progress');
  await ticketService.updateTicketStatus(created.id, 'Resolved');
  await authService.demoLogin('student');
  const notes = (await notificationService.getNotifications()).data.items;
  const resolvedNotification = notes.find((n) => n.ticket_id === created.id && n.type === 'resolved');
  assert.ok(resolvedNotification && !resolvedNotification.read_at);
  await notificationService.markAsRead(resolvedNotification.id);
  await ticketService.rateTicket(created.id, { rating: 5, feedback: 'Clear and helpful support.' });
  refreshDatabaseFromStorage();
  const ticket = (await ticketService.getTicket(created.id)).data;
  assert.equal(ticket.rating, 5);
  assert.equal(ticket.status, 'Resolved');
  assert.equal(ticket.replies.length, 1);
  assert.deepEqual(ticket.history.map((h) => h.status), ['Open', 'Assigned', 'In Progress', 'Resolved']);
  assert.equal(ticket.attachments[0].name, 'error.png');
  assert.ok((await notificationService.getNotifications()).data.items.find((n) => n.id === resolvedNotification.id).read_at);
});

test('routing uses least active workload, and forwarding enforces department membership', async () => {
  await authService.demoLogin('admin');
  const { data: extraStaff } = await adminService.saveRecord('users', { name: 'Ravi Vyas', email: 'ravi@demo.test', role: 'staff', active: true, department_ids: [2] });
  await authService.demoLogin('student');
  const { data: ticket } = await ticketService.createTicket({ subject: 'Help with exam registration', description: 'Please check the incorrect registration details on my exam form.', category_id: 2 });
  assert.equal(ticket.assigned_to, extraStaff.id);
  await authService.demoLogin('staff');
  await assert.rejects(() => ticketService.forwardTicket(ticket.id, { department_id: 5, staff_id: 5, note: 'Wrong staff' }), /not assigned/);
  const { data: forwarded } = await ticketService.forwardTicket(ticket.id, { department_id: 5, note: 'The issue requires portal access review.' });
  assert.equal(forwarded.department_id, 5);
  assert.equal(forwarded.assigned_to, 7);
  await assert.rejects(() => ticketService.getTicket(ticket.id), /not found|not accessible/);
});

test('staff FAQ suggestions require all translations before approval and publication', async () => {
  await authService.demoLogin('staff');
  const { data: suggestion } = await faqService.suggestFaq(103, { question: 'How can I verify my examination registration record?', answer: 'Ask the Examination Cell to verify your trainee record and share the acknowledgement.' });
  await authService.demoLogin('admin');
  await assert.rejects(() => faqService.saveFaq({ ...suggestion, status: 'published' }), /HI.*required/);
  const suggested = (await faqService.getFaqs({ manage: true, status: 'suggested' })).data.find((f) => f.id === 31);
  await faqService.saveFaq({ ...suggested, status: 'approved' });
  assert.equal(searchApprovedFaq(getDatabase(), 'My exam registration shows a duplicate record error', 'en', 'Examination'), null, 'approved but unpublished FAQs are not retrieved');
  await faqService.saveFaq({ ...suggested, status: 'published' });
  await authService.demoLogin('student');
  const response = await conversation('My exam registration shows a duplicate record error');
  assert.equal(response.assistant_message.type, 'faq');
  assert.equal(response.assistant_message.faq_id, 31);
  await assert.rejects(() => faqService.saveFaq({ ...suggested, status: 'draft' }), /access/);
});

test('admin CRUD protects references and supports new departments, mappings, users and rules', async () => {
  await authService.demoLogin('admin');
  const { data: department } = await adminService.saveRecord('departments', { name: 'Placement', code: 'PLAC', description: 'Apprenticeship support', sla_hours: 24, active: true });
  const { data: category } = await adminService.saveRecord('categories', { name: 'Industry placement', department_id: department.id, active: true });
  await assert.rejects(() => adminService.deleteRecord('departments', department.id), /linked/);
  await adminService.saveRecord('categories', { ...category, name: 'Placement assistance' });
  assert.equal((await adminService.getManagementData('categories')).data.find((c) => c.id === category.id).name, 'Placement assistance');
  await adminService.deleteRecord('categories', category.id);
  await adminService.deleteRecord('departments', department.id);
  const { data: rule } = await adminService.saveRecord('escalation_rules', { name: 'Critical first review', threshold_hours: 6, target_role: 'supervisor', priority: 'Critical', enabled: true });
  assert.equal(rule.threshold_hours, 6);
  await adminService.deleteRecord('escalation_rules', rule.id);
  await assert.rejects(() => adminService.deleteRecord('users', 9), /linked/);
});

test('clock simulation escalates overdue tickets, preserves resolved tickets and updates reports', async () => {
  await authService.demoLogin('principal');
  const before = (await adminService.getReports()).data;
  const resolvedIds = getDatabase().tickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).map((t) => t.id);
  const { data: simulated } = await adminService.simulateTime(24);
  assert.ok(simulated.escalated_count > 0);
  assert.equal(simulated.time_offset_hours, 24);
  for (const id of resolvedIds) assert.ok(['Resolved', 'Closed'].includes(getDatabase().tickets.find((t) => t.id === id).status));
  const after = (await adminService.getReports()).data;
  assert.ok(after.summary.escalated > before.summary.escalated);
  assert.equal(after.trend.length, 30);
  assert.equal(after.departments.reduce((sum, d) => sum + d.total, 0), after.summary.total);
  assert.ok((await notificationService.getNotifications()).data.items.some((n) => n.type === 'escalated' && simulated.ticket_ids.includes(n.ticket_id)));
  const { data: second } = await adminService.simulateTime(24);
  assert.equal(second.time_offset_hours, 48);
  await authService.demoLogin('admin');
  assert.ok((await notificationService.getNotifications()).data.items.some((n) => n.type === 'escalated'));
});

test('reset removes demo mutations and restarts ticket numbering while retaining the role', async () => {
  await authService.demoLogin('student');
  await ticketService.createTicket({ subject: 'A new general support question', description: 'Please help me with an institute support request.', category_id: 8 });
  const { data } = await adminService.resetDemo();
  assert.equal(data.user.role, 'student');
  assert.equal(getDatabase().tickets.length, 25);
  assert.equal(getDatabase().meta.next_ticket_number, 125);
  assert.equal(getDatabase().chat_sessions.length, 0);
});

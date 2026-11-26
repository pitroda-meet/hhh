import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, clearAuthStorage, getAuthToken, getStoredUser, setAuthStorage } from '../src/services/api.js';
import { authService } from '../src/services/authService.js';
import { ticketService } from '../src/services/ticketService.js';
import { faqService } from '../src/services/faqService.js';
import { chatService } from '../src/services/chatService.js';
import { adminService } from '../src/services/adminService.js';
import { notificationService } from '../src/services/notificationService.js';
import { errorMessage } from '../src/utils/format.js';
import {
  extractValidationErrors,
  validateAttachmentFiles,
  validateChatMessage,
  validateFaqForm,
  validateFaqSuggestion,
  validateLogin,
  validateManagementRecord,
  validateNewQuery,
  validateProfile,
  validateReassign,
  validateRegister,
  validateReplyOrNote,
} from '../src/utils/validation.js';
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

const recordedRequests = [];

function installMockAdapter(responder) {
  apiClient.defaults.adapter = async (config) => {
    recordedRequests.push({
      method: (config.method || 'get').toUpperCase(),
      url: config.url,
      data: config.data,
      params: config.params,
      headers: config.headers,
    });
    const result = responder ? responder(config) : { status: 200, data: { data: {} } };
    if (result.status >= 400) {
      const error = new Error('HTTP Error');
      error.config = config;
      error.response = { status: result.status, data: result.data };
      throw error;
    }
    return {
      status: result.status || 200,
      statusText: 'OK',
      headers: {},
      config,
      data: result.data,
    };
  };
}

beforeEach(() => {
  localStorage.clear();
  recordedRequests.length = 0;
  installMockAdapter();
});

test('Hindi and Gujarati dictionaries cover every English UI key', () => {
  for (const dictionary of [hi, gu]) {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(en).sort());
    assert.ok(Object.values(dictionary).every((value) => typeof value === 'string' && value.trim().length));
  }
});

test('client-side validation covers auth, queries, attachments, chat, FAQ, and admin forms', () => {
  assert.equal(validateLogin({ email: 'bad', password: '' }).valid, false);
  assert.equal(validateLogin({ email: 'student@iti.demo', password: 'Demo@2026' }).valid, true);

  const badReg = validateRegister({
    name: 'A',
    email: 'invalid',
    phone: '12',
    password: 'short',
    confirm_password: 'other',
    institute: '',
    trade: '',
  });
  assert.equal(badReg.valid, false);
  assert.ok(badReg.errors.name && badReg.errors.email && badReg.errors.phone && badReg.errors.password && badReg.errors.confirm_password);

  assert.equal(validateProfile({ name: 'Aarav Patel', phone: '9876543210', institute: 'Government ITI, Junagadh' }).valid, true);
  assert.equal(validateNewQuery({ subject: 'Hi', category_id: '', description: 'Short' }).valid, false);
  assert.equal(validateNewQuery({ subject: 'Exam hall ticket issue', category_id: 2, priority: 'High', description: 'My hall ticket shows the wrong trade name.' }).valid, true);

  const invalidFiles = validateAttachmentFiles([
    { name: 'virus.exe', size: 1000, type: 'application/octet-stream' },
    { name: 'huge.pdf', size: 7 * 1024 * 1024, type: 'application/pdf' },
    { name: 'valid.pdf', size: 1024, type: 'application/pdf' },
  ]);
  assert.equal(invalidFiles.accepted.length, 1);
  assert.equal(invalidFiles.errors.length, 2);

  assert.ok(validateReplyOrNote('   ', { isNote: false, hasAttachments: false }));
  assert.equal(validateReplyOrNote('Verified.', { isNote: true }), null);
  assert.equal(validateReassign({ department_id: '', note: 'no' }).valid, false);
  assert.equal(validateFaqSuggestion({ question: 'Why', answer: 'Ok' }).valid, false);
  assert.ok(validateChatMessage('   '));
  assert.equal(validateChatMessage('How do I apply for scholarship?'), null);

  assert.equal(validateManagementRecord('departments', { name: 'Lab', code: '!', sla_hours: 500 }).valid, false);
  assert.equal(validateManagementRecord('escalation_rules', { name: 'Rule 1', threshold_hours: 24, target_role: 'supervisor' }).valid, true);

  const faqCheck = validateFaqForm({
    category_id: 1,
    status: 'draft',
    translations: {
      en: { question: 'English Q', answer: 'English A' },
      hi: { question: '', answer: '' },
      gu: { question: '', answer: '' },
    },
  }, true);
  assert.equal(faqCheck.valid, false);
  assert.ok(faqCheck.errors['translations.hi'] && faqCheck.errors['translations.gu']);
});

test('authService stores Sanctum token, attaches Bearer header, and clears storage on 401', async () => {
  installMockAdapter((config) => {
    if (config.url === '/auth/login') {
      return {
        status: 200,
        data: { data: { token: 'sanctum-token-123', user: { id: 1, role: 'student', name: 'Aarav Patel' } } },
      };
    }
    if (config.url === '/student/queries') {
      return { status: 401, data: { message: 'Unauthenticated.' } };
    }
    return { status: 200, data: { data: {} } };
  });

  await authService.login({ email: 'student@iti.demo', password: 'Demo@2026' });
  assert.equal(getAuthToken(), 'sanctum-token-123');
  assert.equal(getStoredUser().role, 'student');

  await assert.rejects(() => ticketService.listStudentQueries());
  assert.equal(recordedRequests[1].headers.Authorization, 'Bearer sanctum-token-123');
  assert.equal(getAuthToken(), null);
  assert.equal(getStoredUser(), null);

  clearAuthStorage();
});

test('services route to the exact Laravel API endpoints for all roles and payloads', async () => {
  setAuthStorage('tok-staff', { id: 5, role: 'staff', name: 'Mehul Joshi' });
  await ticketService.getDashboard();
  await ticketService.listQueries({ status: 'Open' });
  await ticketService.getTicket(103);
  await ticketService.claimTicket(103);
  await ticketService.addInternalNote(103, 'Internal check');
  await ticketService.updatePriority(103, 'High');
  await faqService.suggestFaq(103, { question: 'Exam record check', answer: 'Contact Examination Cell.' });

  assert.deepEqual(
    recordedRequests.map((r) => `${r.method} ${r.url}`),
    [
      'GET /staff/dashboard',
      'GET /staff/queries',
      'GET /staff/queries/103',
      'POST /staff/queries/103/claim',
      'POST /staff/queries/103/internal-notes',
      'PATCH /staff/queries/103/priority',
      'POST /staff/queries/103/suggest-faq',
    ],
  );

  recordedRequests.length = 0;
  setAuthStorage('tok-principal', { id: 13, role: 'principal', name: 'Dr. Rupal Shah' });
  await ticketService.listAllTickets({ critical_only: true });
  await adminService.getReports();
  assert.deepEqual(
    recordedRequests.map((r) => `${r.method} ${r.url}`),
    ['GET /principal/queries', 'GET /principal/reports'],
  );

  recordedRequests.length = 0;
  await chatService.createSession('gu');
  await chatService.sendMessage({ session_id: 9, message: 'શિષ્યવૃત્તિ' });
  await chatService.confirmTicket(9, 12, true);
  await notificationService.getNotifications();
  await notificationService.markAsRead('all');
  assert.deepEqual(
    recordedRequests.map((r) => `${r.method} ${r.url}`),
    [
      'POST /v1/agent/sessions',
      'POST /v1/agent/chat',
      'POST /v1/agent/sessions/9/confirm-ticket',
      'GET /notifications',
      'PATCH /notifications/all/read',
    ],
  );
});

test('errorMessage and extractValidationErrors surface Laravel 422 validation messages', () => {
  const err = {
    response: {
      status: 422,
      data: {
        message: 'The given data was invalid.',
        errors: { subject: ['Enter a subject between 5 and 150 characters.'] },
      },
    },
  };
  assert.equal(errorMessage(err), 'Enter a subject between 5 and 150 characters.');
  assert.deepEqual(extractValidationErrors(err), { subject: 'Enter a subject between 5 and 150 characters.' });
});

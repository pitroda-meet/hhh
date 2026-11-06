import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/services/authService.js';
import { adminService } from '../src/services/adminService.js';
import { ticketService } from '../src/services/ticketService.js';
import { faqService } from '../src/services/faqService.js';
import { presentationService } from '../src/services/presentationService.js';
import { AUTH_KEY, DATABASE_KEY, getDatabase, getDatabaseStorageKey, resetDatabase, switchDatabaseNamespace } from '../src/mock/database.js';
import { AudioPitchClock } from '../src/presentation/AudioPitchClock.js';
import { PITCH_MODULES, PITCH_ROUTES } from '../src/presentation/routes.js';
import { PITCH_SCENES, validatePitchPlan } from '../src/presentation/steps.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
beforeEach(() => { localStorage.clear(); switchDatabaseNamespace('main'); resetDatabase(); });

test('the actual router and pitch share all 29 routes in 16 module families', () => {
  const plan = validatePitchPlan();
  assert.equal(plan.routes, 29);
  assert.equal(PITCH_MODULES.length, 16);
  assert.equal(new Set(PITCH_ROUTES.map((route) => route.path)).size, 29);
  assert.equal(plan.seconds, 300);
  assert.ok(plan.actions > 100);
  for (const role of ['student', 'staff', 'admin', 'principal']) assert.ok(PITCH_ROUTES.some((route) => route.path === `/${role}/profile`));
});

test('round-robin alternates eligible staff and preserves department restrictions', async () => {
  await authService.demoLogin('admin');
  const extra = (await adminService.saveRecord('users', { name: 'Ravi Vyas', email: 'rotation@iti.demo', role: 'staff', active: true, department_ids: [2] })).data;
  await adminService.setRoutingStrategy('round_robin');
  await authService.demoLogin('student');
  const input = { subject: 'Examination registration support', description: 'Please verify my examination registration details.', category_id: 2 };
  const first = (await ticketService.createTicket(input)).data;
  const second = (await ticketService.createTicket(input)).data;
  const third = (await ticketService.createTicket(input)).data;
  assert.deepEqual([first.assigned_to, second.assigned_to, third.assigned_to], [5, extra.id, 5]);
  assert.equal(first.routing_method, 'round_robin');
});

test('claiming is idempotent and internal notes never enter the student response', async () => {
  await authService.demoLogin('student');
  const ticket = (await ticketService.createTicket({ subject: 'Examination form error', description: 'My examination form is showing a duplicate record.', category_id: 2 })).data;
  await authService.demoLogin('staff');
  await ticketService.claimTicket(ticket.id);
  await ticketService.claimTicket(ticket.id);
  await ticketService.addInternalNote(ticket.id, 'Staff-only verification details.');
  const staffView = (await ticketService.getTicket(ticket.id)).data;
  assert.equal(staffView.claimed_by, 5);
  assert.equal(staffView.history.filter((event) => event.note.includes('accepted ownership')).length, 1);
  assert.equal(staffView.internal_notes.length, 1);
  assert.equal(staffView.first_response_at, null);
  await authService.demoLogin('student');
  const studentView = (await ticketService.getTicket(ticket.id)).data;
  assert.equal(studentView.internal_notes, undefined);
  assert.ok(!JSON.stringify(studentView).includes('Staff-only verification'));
  await assert.rejects(() => ticketService.addInternalNote(ticket.id, 'Not allowed'), /access/);
});

test('FAQ center feedback is per user, idempotent and published-only', async () => {
  await authService.demoLogin('student');
  const before = (await faqService.getFaqs()).data.find((faq) => faq.id === 1);
  await faqService.setFaqFeedback(1, 'up');
  await faqService.setFaqFeedback(1, 'up');
  const after = (await faqService.getFaqs()).data.find((faq) => faq.id === 1);
  assert.equal(after.helpful, before.helpful + 1);
  assert.equal(after.feedback, 'up');
  await faqService.setFaqFeedback(1, 'down');
  assert.equal((await faqService.getFaqs()).data.find((faq) => faq.id === 1).helpful, before.helpful);
  await assert.rejects(() => faqService.setFaqFeedback(31, 'up'), /not found/);
});

test('presentation data and authentication are isolated from the normal workspace', async () => {
  await authService.demoLogin('student');
  await ticketService.createTicket({ subject: 'A saved normal-workspace query', description: 'This saved query must survive a presentation reset.', category_id: 8 });
  const originalDatabase = localStorage.getItem(DATABASE_KEY);
  const originalAuth = localStorage.getItem(AUTH_KEY);
  await presentationService.beginPresentation();
  assert.equal(getDatabaseStorageKey(), `${DATABASE_KEY}.pitch`);
  await authService.demoLogin('student');
  assert.equal((await authService.getCurrentUser()).data.enrollment_number, 'GTI-2026-0042');
  const ticket = (await ticketService.createTicket({ subject: 'A sandbox examination query', description: 'This ticket belongs only to the presentation session.', category_id: 2 })).data;
  assert.equal(ticket.ticket_number, 'ITI-2026-00125');
  assert.equal(localStorage.getItem(DATABASE_KEY), originalDatabase);
  const restored = (await presentationService.endPresentation()).data;
  assert.equal(restored.user.role, 'student');
  assert.equal(localStorage.getItem(DATABASE_KEY), originalDatabase);
  assert.equal(localStorage.getItem(AUTH_KEY), originalAuth);
  assert.match((await ticketService.getTicket(125)).data.subject, /saved normal-workspace/);
});

test('requests from a disposed demo cannot mutate the restored database', async () => {
  await presentationService.beginPresentation();
  await authService.demoLogin('student');
  const pending = ticketService.createTicket({ subject: 'Late presentation operation', description: 'This request must be cancelled when the namespace changes.', category_id: 2 });
  switchDatabaseNamespace('main');
  await assert.rejects(pending, (error) => error.name === 'AbortError');
  assert.equal(getDatabase().tickets.length, 25);
});

class FakeAudio extends EventTarget {
  currentTime = 0;
  paused = true;
  async play() { this.paused = false; }
  pause() { this.paused = true; }
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('the audio clock dispatches once, pauses, seeks and never invents route coverage', async () => {
  const audio = new FakeAudio();
  const called = [];
  const steps = [0, 10, 20].map((at, index) => ({ id: `step-${index}`, at, label: `Step ${index}`, scene: 1 }));
  const clock = new AudioPitchClock({ audio, scenes: PITCH_SCENES, steps, execute: async (step) => called.push(step.id), getContext: () => ({ app: {}, pathname: '/login' }) });
  await clock.play(); clock.tick(); await flush();
  clock.tick(); await flush();
  assert.deepEqual(called, ['step-0']);
  clock.pause(); audio.currentTime = 11; clock.tick(); await flush();
  assert.equal(called.length, 1);
  await clock.play(); clock.tick(); await flush();
  assert.deepEqual(called, ['step-0', 'step-1']);
  clock.seek(20); await clock.play(); clock.tick(); await flush();
  assert.deepEqual(called, ['step-0', 'step-1', 'step-2']);
  assert.equal(clock.report().visitedRoutes.length, 0);
  audio.currentTime = 300; clock.tick();
  assert.equal(clock.status, 'completed');
  assert.equal(clock.report().duration, 300);
  clock.dispose();
});

test('overlapping asynchronous actions hold the audio clock until ready', async () => {
  const audio = new FakeAudio();
  let finish;
  const blocker = new Promise((resolve) => { finish = resolve; });
  const clock = new AudioPitchClock({ audio, scenes: PITCH_SCENES, steps: [{ id: 'slow', at: 0 }, { id: 'next', at: 1 }], execute: (step) => step.id === 'slow' ? blocker : Promise.resolve(), getContext: () => ({ app: {} }) });
  await clock.play(); clock.tick();
  audio.currentTime = 1; clock.tick();
  assert.equal(clock.status, 'buffering');
  assert.equal(audio.paused, true);
  finish(); await flush();
  assert.equal(clock.status, 'playing');
  assert.equal(audio.paused, false);
  clock.tick(); await flush();
  assert.equal(clock.report().actions.filter((step) => step.status === 'completed').length, 2);
  clock.dispose();
});

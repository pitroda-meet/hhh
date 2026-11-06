import document from '../../docs/PITCH_5_MIN_SCENES.json' with { type: 'json' };
import { PITCH_ROUTES } from './routes.js';
import { PITCH_CONTENT as demo } from './demoContent.js';

export const PITCH_SCENES = document.scenes;
const raw = [];
const add = (at, command, label, options = {}) => raw.push({ at, command, label, ...options });
const visit = (at, route, label) => add(at, 'visit', label || PITCH_ROUTES.find((item) => item.key === route).label, { route });
const click = (at, selector, label) => add(at, 'click', label, { selector });
const type = (at, selector, text, label, speed = 35) => add(at, 'type', label, { selector, text, speed });

visit(0, 'login');
add(.4, 'overlay', 'The student support problem', { overlay: 'problem' });
add(17, 'overlay', 'Four role-based demo accounts', { overlay: null });
add(17.3, 'highlight', 'Student, staff, administrator and principal access', { selector: '[data-testid="demo-student"]' });
add(20, 'overlay', 'One integrated support platform', { overlay: 'intro' });
add(24, 'overlay', 'Multilingual interface', { overlay: null });
add(24.2, 'language', 'Gujarati interface', { language: 'gu' });
add(26.2, 'language', 'Hindi interface', { language: 'hi' });
add(28.2, 'language', 'English interface', { language: 'en' });
visit(30, 'register');
add(32, 'highlight', 'Institute and trade selection', { selector: '[data-pitch="register-institute"]' });
add(34, 'highlight', 'Enrollment details', { selector: '[data-pitch="register-enrollment_number"]' });
visit(37, 'login');

visit(40, 'studentDashboard');
add(42.2, 'highlight', 'Active queries and dashboard KPIs', { selector: '[data-pitch="stat-card"]' });
visit(44.2, 'studentProfile');
add(46.2, 'highlight', 'Enrollment, trade and preferred language', { selector: '[data-pitch="profile-language"]' });
visit(48.5, 'studentFaqs');
add(50, 'faq-search', 'Search the multilingual knowledge base');
click(52, '[data-pitch-faq-category="3"]', 'Filter scholarship FAQs');
click(53.5, '[data-pitch-faq-open="1"]', 'Read the approved scholarship answer');
add(55, 'scroll', 'FAQ source and helpfulness controls', { selector: '[data-pitch-faq-up="1"]', duration: 450 });
click(56, '[data-pitch-faq-up="1"]', 'Record FAQ helpfulness feedback');
visit(58, 'studentDashboard');

add(60, 'language', 'Gujarati conversation', { language: 'gu' });
visit(60.1, 'studentChat');
type(62, '[data-testid="chat-input"]', demo.gujaratiQuestion, 'Type the Gujarati scholarship question');
add(64.5, 'chat-send', 'Retrieve an answer from approved FAQs');
add(67, 'faq-answer', 'Verified FAQ source attribution');
click(69, '[data-pitch="chat-helpful"]', 'Student feedback on the AI answer');
add(71, 'chat-actions', 'Show the search_faq tool call');
add(75, 'remember-chat', 'Save the conversation context');
click(75.2, '[data-pitch="faq-source"]', 'Open the original FAQ source');
visit(79, 'studentChat');
add(82, 'highlight-human', 'Human assistance remains available');

add(85, 'language', 'Hindi intent recognition', { language: 'hi' });
type(86, '[data-testid="chat-input"]', demo.hindiQuestion, 'Type the Hindi examination problem');
add(88.5, 'chat-send', 'Search for a verified examination answer');
add(91, 'confirmation-ready', 'No approved answer: request missing details');
type(94, '[data-testid="chat-input"]', demo.hindiDetails, 'Add enrollment and registration-error details', 25);
add(97.5, 'chat-send', 'Preserve the issue and its follow-up context');
add(100, 'confirm-ticket', 'Student confirms ticket creation');
add(104, 'ticket-card', 'ITI-2026-00125 → Examination → Mehul Joshi');
type(108, '[data-testid="chat-input"]', `status of ${demo.ticketNumber}`, 'Track the newly created ticket', 25);
add(110, 'chat-send', 'Call get_ticket_status');
add(112, 'chat-actions', 'Inspect the ticket-tracking tool call');
add(115.5, 'language', 'Manual query submission', { language: 'en' });
visit(116, 'studentNewQuery');
add(117.1, 'manual-form', 'Category, priority, description and attachment');
add(120.3, 'manual-submit', 'Create a second, manually submitted ticket');
visit(123, 'studentQueries');

visit(125, 'staffDashboard');
visit(127.2, 'staffProfile');
visit(128.8, 'staffFaqs');
visit(130.4, 'staffInbox');
add(131.5, 'staff-inbox', 'Priority sorting and ticket claiming');
visit(133.2, 'staffTicket');
click(134, '[data-pitch="internal-note-tab"]', 'Private internal staff notes');
type(134.4, '[data-pitch="internal-note-input"]', demo.internalNote, 'Record staff-only verification context', 8);
click(135.3, '[data-pitch="send-ticket-message"]', 'Save the internal note');
click(136.1, '[data-pitch="reply-tab"]', 'Reply to the student');
type(136.4, '[data-pitch="reply-input"]', demo.resolution, 'Write the student-facing resolution', 17);
click(138.9, '[data-pitch="send-ticket-message"]', 'Send the resolution reply');
click(140.1, '[data-testid="resolve-ticket"]', 'Mark the ticket resolved');
click(140.8, '[data-pitch="dialog-confirm"]', 'Confirm the status transition');
click(142.1, '[data-pitch="suggest-faq"]', 'Turn the resolution into a reusable FAQ');
add(142.8, 'suggestion-form', 'Draft the staff FAQ contribution');
click(144, '[data-pitch="submit-suggestion"]', 'Send the suggestion for administrator review');
add(146.1, 'visit-active-staff-ticket', 'Forwarding and escalation controls on an active query');
click(148, '[data-pitch="forward-ticket"]', 'Open the department handover dialog');
add(149, 'forward-active', 'Forward the active case to Technical / IT');
visit(152.4, 'staffInbox');

add(155, 'student-notification', 'Notify the student of the resolution');
add(159, 'open-resolution-notification', 'Open the same resolved ticket');
add(161, 'scroll', 'Review staff response and the full audit timeline', { selector: '[data-pitch="ticket-timeline"]', duration: 600 });
click(164, '[data-pitch="open-rating"]', 'Open the student rating modal');
add(165, 'rating-form', 'Five-star feedback and student comments');
click(168, '[data-pitch="submit-feedback"]', 'Submit the student feedback');
add(171, 'highlight', 'Student review saved on the ticket', { selector: '[data-pitch="feedback-card"]' });

visit(175, 'adminDashboard');
visit(177, 'users');
visit(178.6, 'departments');
visit(180.2, 'categories');
visit(181.8, 'assignments');
add(182.7, 'highlight', 'Category → department → round-robin staff routing', { selector: '[data-pitch="routing-rules"]' });
visit(183.4, 'escalationRules');
visit(185, 'adminFaqs');
add(186, 'review-suggestion', 'Review the new staff-suggested FAQ');
add(186.6, 'curate-hi', 'Hindi FAQ translation');
add(187.3, 'curate-gu', 'Gujarati FAQ translation');
add(188.1, 'publish-faq', 'Approve and publish the three-language answer');
visit(189.3, 'aiMonitoring');
visit(191.2, 'adminTickets');
visit(193, 'adminTicket');
add(194.2, 'admin-priority', 'Administrative priority override');
visit(195.4, 'adminProfile');
visit(197.4, 'adminDashboard');

visit(200, 'principalDashboard');
visit(202, 'principalProfile');
visit(204, 'principalDashboard');
add(205.5, 'scroll-executive', 'Department response-time rankings and staff performance');
click(208, '[data-testid="simulate-time"]', 'Simulate overdue SLA escalation');
click(209.3, '[data-testid="advance-clock"]', 'Advance the demonstration clock by 24 hours');
add(211, 'close-simulation', 'Observe escalated tickets and notifications');
visit(212, 'principalTickets');
add(214.2, 'visit-critical-ticket', 'Executive intervention on an overdue query');
click(216, '[data-pitch="forward-ticket"]', 'Re-route an escalated query');
add(216.7, 'principal-reassign', 'Assign the escalated case back to Examination');
visit(219.8, 'principalTicket', 'Inspect the original resolved student ticket');
visit(222.5, 'principalDashboard');

add(225, 'overlay', 'Planned production architecture and trust boundaries', { overlay: 'architecture' });
add(255, 'overlay', 'WhatsApp, mobile, voice and Gujarat ITI expansion', { overlay: 'roadmap' });
add(280, 'overlay', 'One connected student support system', { overlay: 'closing' });

export const PITCH_STEPS = raw.map((step, index) => ({ ...step, id: `pitch-${String(index + 1).padStart(3, '0')}`, scene: PITCH_SCENES.find((scene) => step.at >= scene.start && step.at < scene.end).id }));

export function validatePitchPlan() {
  if (PITCH_SCENES.length !== 12 || PITCH_SCENES.at(-1).end !== 300) throw new Error('The pitch must contain twelve scenes totaling 300 seconds.');
  const declared = new Set(PITCH_SCENES.flatMap((scene) => scene.routes || []));
  const visited = new Set(PITCH_STEPS.filter((step) => step.route).map((step) => PITCH_ROUTES.find((route) => route.key === step.route)?.path));
  // The student ticket is opened through its real notification, not a fake route visit.
  visited.add('/student/queries/:id');
  const missing = PITCH_ROUTES.filter((route) => !declared.has(route.path) || !visited.has(route.path));
  if (missing.length) throw new Error(`Presentation routes are missing: ${missing.map((route) => route.path).join(', ')}`);
  return { routes: PITCH_ROUTES.length, scenes: PITCH_SCENES.length, seconds: 300, actions: PITCH_STEPS.length };
}

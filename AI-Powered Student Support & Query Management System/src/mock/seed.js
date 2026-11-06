import { buildFaqSeed } from './faqSeed.js';
import { DEMO_PASSWORD } from '../utils/constants.js';

export const DATABASE_VERSION = 1;

export function createSeed() {
  const now = Date.now();
  const ago = (hours) => new Date(now - hours * 3600000).toISOString();
  const roles = [{ id: 1, name: 'student' }, { id: 2, name: 'staff' }, { id: 3, name: 'admin' }, { id: 4, name: 'principal' }];
  const departments = [
    { id: 1, name: 'Academic', description: 'Curriculum, attendance & learning resources', code: 'ACAD', sla_hours: 24, active: true },
    { id: 2, name: 'Examination', description: 'Registration, hall tickets & results', code: 'EXAM', sla_hours: 24, active: true },
    { id: 3, name: 'Scholarship', description: 'Digital Gujarat applications & student aid', code: 'SCHL', sla_hours: 24, active: true },
    { id: 4, name: 'Administration', description: 'Admissions, certificates & student welfare', code: 'ADMIN', sla_hours: 24, active: true },
    { id: 5, name: 'Technical / IT', description: 'Student portal, networks & computer labs', code: 'TECH', sla_hours: 12, active: true },
    { id: 6, name: 'Workshop & Trade', description: 'Practical training, equipment & safety', code: 'WORK', sla_hours: 12, active: true },
  ];
  const categories = ['Academic', 'Examination', 'Scholarship', 'Administrative', 'Technical', 'Workshop/Trade', 'Student Welfare', 'General'].map((name, i) => ({ id: i + 1, name, department_id: [1, 2, 3, 4, 5, 6, 4, 4][i], description: `Queries related to ${name.toLowerCase()}`, active: true }));
  const names = ['Aarav Patel', 'Nidhi Shah', 'Dhruv Solanki', 'Kavya Vyas', 'Mehul Joshi', 'Kavita Trivedi', 'Hitesh Makwana', 'Jignesh Parmar', 'Drashti Desai', 'Chirag Shah', 'Bhavika Mehta', 'Parth Vora', 'Dr. Rupal Shah', 'Dr. Sanjay Vyas', 'Minal Bhatt', 'Prakash Dholakia'];
  const users = names.map((name, index) => {
    const role = roles[Math.floor(index / 4)];
    return { id: index + 1, name, email: index % 4 === 0 ? `${role.name}@iti.demo` : `${name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.')}@iti.demo`, password: DEMO_PASSWORD, role_id: role.id, role: role.name, department_ids: role.name === 'staff' ? [[2, 4], [1, 3], [5], [6]][index - 4] : [], phone: `98765${String(43210 + index).slice(-5)}`, institute: index === 2 || index === 3 ? 'Government ITI, Rajkot' : 'Government ITI, Junagadh', trade: ['Electrician', 'Computer Operator & Programming Assistant', 'Fitter', 'Welder'][index % 4], year: '2nd year', enrollment_number: `GTI-2026-${String(142 + index).padStart(4, '0')}`, language: 'en', active: true, created_at: ago(24 * 65) };
  });
  const ticketSpecs = [
    ['Scholarship application verification', 'My Digital Gujarat application DGJ-2026-1842 is awaiting institute verification. I have uploaded the income certificate and bank passbook.', 3, 'In Progress', 'Medium', 1, 20],
    ['Correction in practical attendance', 'My attendance for the electrician workshop on Monday was marked absent even though I attended the full session.', 1, 'Open', 'Medium', 1, 4],
    ['Bonafide certificate for bus pass', 'I need an enrollment certificate to renew my GSRTC student bus pass for Junagadh–Vanthali.', 4, 'Resolved', 'Low', 1, 96],
    ['Hall ticket name correction', 'My hall ticket shows Patel Arav instead of Aarav Patel. My enrollment record has the correct name.', 2, 'Assigned', 'High', 1, 10],
    ['Student portal password reset', 'I cannot receive the password reset OTP on my registered mobile number.', 5, 'Resolved', 'Medium', 1, 168],
    ['Workshop practical batch change', 'I request a change to the morning practical batch due to my transport schedule.', 6, 'Waiting for Student', 'Low', 1, 28],
    ['Examination fee receipt not generated', 'The exam fee payment was deducted from my bank account but the acknowledgement is still missing.', 2, 'In Progress', 'High', 1, 17],
    ['Apprenticeship profile verification', 'Please verify my Apprenticeship India profile for an electrician opportunity in Rajkot.', 7, 'Resolved', 'Medium', 1, 240],
    ['Request for trade syllabus', 'Please share the approved second-year electrician syllabus and learning material.', 1, 'Closed', 'Low', 1, 336],
    ['Scholarship bank verification delayed', 'My scholarship payment is on hold after verification. I submitted the corrected IFSC details last week.', 3, 'Escalated', 'High', 1, 78],
    ['Library membership activation', 'My library card is not yet active. I have completed the enrollment process.', 8, 'Resolved', 'Low', 1, 480],
    ['Computer lab access request', 'Could I use the computer lab for apprenticeship applications after my regular classes?', 5, 'Resolved', 'Low', 1, 600],
    ['Examination registration record mismatch', 'My trainee record is linked to an incorrect trade on the examination registration screen. The deadline is approaching.', 2, 'Open', 'Critical', 2, 31],
    ['Workshop lathe safety guard damaged', 'The safety guard on lathe machine L-03 is loose. We have stopped using the machine and informed the instructor.', 6, 'In Progress', 'Critical', 3, 39],
    ['Digital Gujarat income document rejected', 'The portal rejected my updated income certificate. Please help verify the correct document.', 3, 'Waiting for Student', 'Medium', 2, 45],
    ['Request for transfer certificate', 'I need a transfer certificate and would like to know the pending formalities.', 4, 'Assigned', 'Medium', 4, 16],
    ['Internet unavailable in COPA lab', 'The student network in computer lab 2 has not been available since yesterday morning.', 5, 'Escalated', 'High', 2, 64],
    ['Supplementary exam eligibility', 'Please confirm whether I can appear for the supplementary engineering drawing paper this session.', 2, 'Resolved', 'Medium', 3, 144],
    ['Welding workshop PPE request', 'Our practical group needs replacement safety gloves before the next session.', 6, 'Assigned', 'High', 4, 8],
    ['Incorrect attendance percentage', 'The monthly attendance statement differs from my instructor’s register by two sessions.', 1, 'In Progress', 'Medium', 3, 22],
    ['Hostel accommodation request', 'I travel from a village near Keshod and would like to know if accommodation is currently available.', 7, 'Open', 'Medium', 4, 11],
    ['NCVT marksheet collection', 'I would like to collect my verified first-year NCVT marksheet.', 2, 'Closed', 'Low', 2, 264],
    ['Fee concession clarification', 'Please confirm which documents are needed for the applicable fee concession.', 4, 'Resolved', 'Medium', 3, 384],
    ['Placement drive registration', 'I would like to register for the next local apprenticeship and placement drive.', 7, 'Resolved', 'Low', 4, 528],
    ['Electrical drawing resource access', 'The recommended learning resource link is unavailable. Could you share an approved copy?', 1, 'Resolved', 'Low', 2, 648],
  ];
  const tickets = [];
  const ticket_replies = [];
  const ticket_status_history = [];
  ticketSpecs.forEach(([subject, description, category_id, status, priority, student_id, age], index) => {
    const id = 100 + index;
    const department_id = categories.find((c) => c.id === category_id).department_id;
    const assigned_to = users.find((u) => u.role === 'staff' && u.department_ids.includes(department_id)).id;
    const resolved = ['Resolved', 'Closed'].includes(status);
    const created_at = ago(age);
    const responseHours = 1.2 + (index % 5) * .7;
    const resolved_at = resolved ? ago(age - 8 - (index % 6)) : null;
    tickets.push({ id, ticket_number: `ITI-2026-${String(id).padStart(5, '0')}`, student_id, category_id, department_id, assigned_to, subject, description, priority, status, source: index % 3 === 0 ? 'ai' : 'manual', attachments: index % 4 === 0 ? [{ name: 'supporting-document.pdf', size: 245760, type: 'application/pdf', mock: true }] : [], rating: resolved && index % 3 !== 0 ? 4 + (index % 2) : null, feedback: '', created_at, updated_at: resolved_at || ago(Math.max(.2, age - responseHours)), first_response_at: ['Open', 'Assigned'].includes(status) ? null : ago(age - responseHours), resolved_at, closed_at: status === 'Closed' ? ago(age - 20) : null, due_at: ago(age - departments.find((d) => d.id === department_id).sla_hours), escalation_level: status === 'Escalated' ? 1 : 0 });
    ticket_status_history.push({ id: ticket_status_history.length + 1, ticket_id: id, actor_id: student_id, previous_status: null, status: 'Open', note: 'Support request received.', created_at });
    if (status !== 'Open') ticket_status_history.push({ id: ticket_status_history.length + 1, ticket_id: id, actor_id: null, previous_status: 'Open', status: 'Assigned', note: `Automatically routed to ${departments.find((d) => d.id === department_id).name}.`, created_at: ago(age - .1) });
    if (!['Open', 'Assigned'].includes(status)) {
      ticket_replies.push({ id: ticket_replies.length + 1, ticket_id: id, user_id: assigned_to, message: resolved ? 'Your request has been verified and completed. Please review the update and let us know if you need any further assistance. Thank you for using Sahay.' : 'Thank you for sharing the details. I am reviewing your request with the department and will keep you updated here.', attachments: [], created_at: ago(age - responseHours) });
      ticket_status_history.push({ id: ticket_status_history.length + 1, ticket_id: id, actor_id: assigned_to, previous_status: 'Assigned', status: resolved ? 'Resolved' : status, note: resolved ? 'Request completed and student notified.' : status === 'Escalated' ? 'Response SLA exceeded. Supervisor notified.' : 'The department is reviewing your query.', created_at: resolved_at || ago(age - responseHours) });
      if (status === 'Closed') ticket_status_history.push({ id: ticket_status_history.length + 1, ticket_id: id, actor_id: student_id, previous_status: 'Resolved', status: 'Closed', note: 'Student confirmed the resolution.', created_at: ago(age - 20) });
    }
  });
  const notifications = [
    { user_id: 1, ticket_id: 102, type: 'resolved', title: 'Your certificate is ready', message: 'Your bonafide certificate request has been resolved. Tell us how we did.', created_at: ago(1), read_at: null },
    { user_id: 1, ticket_id: 100, type: 'reply', title: 'An update on your scholarship query', message: 'Kavita Trivedi replied to your scholarship verification request.', created_at: ago(2), read_at: null },
    { user_id: 1, ticket_id: 103, type: 'assigned', title: 'Your query is in the right hands', message: 'Mehul Joshi from the Examination Cell is handling your hall ticket query.', created_at: ago(10), read_at: null },
    { user_id: 5, ticket_id: 112, type: 'assigned', title: 'Critical examination query', message: 'Nidhi Shah needs help with an examination registration record mismatch.', created_at: ago(2), read_at: null },
    { user_id: 9, ticket_id: null, type: 'faq', title: 'Two FAQs need your review', message: 'Staff have suggested new answers for the approved knowledge base.', created_at: ago(3), read_at: null },
    { user_id: 13, ticket_id: 116, type: 'escalated', title: 'Technical support needs attention', message: 'The COPA lab network query has exceeded its response window.', created_at: ago(1), read_at: null },
  ].map((n, index) => ({ id: index + 1, ...n }));
  const ai_action_logs = Array.from({ length: 18 }, (_, i) => ({ id: i + 1, session_id: null, student_id: (i % 4) + 1, tool: ['search_faq', 'get_departments', 'create_ticket', 'search_faq', 'get_ticket_status', 'request_human_support'][i % 6], input: { query: ['How do I apply for scholarship?', 'Exam registration help', 'Workshop timetable'][i % 3] }, result: i === 7 ? 'No approved answer matched. Human support offered.' : ['Approved FAQ matched', 'Department resolved', 'Ticket created with consent', 'Approved FAQ matched', 'Ticket status returned', 'Confirmation requested'][i % 6], status: i === 7 ? 'no_match' : 'success', duration_ms: 315 + (i * 31) % 380, language: ['en', 'gu', 'hi'][i % 3], created_at: ago(i * .8 + .1) }));
  return {
    meta: { version: DATABASE_VERSION, seeded_at: new Date(now).toISOString(), time_offset_hours: 0, next_ticket_number: 125 },
    roles, users, departments, categories, tickets, ticket_replies, ticket_status_history,
    ...buildFaqSeed(now),
    chat_sessions: [], chat_messages: [], ai_action_logs, notifications,
    escalation_rules: [
      { id: 1, name: 'Supervisor review', threshold_hours: 24, target_role: 'supervisor', priority: 'All', enabled: true },
      { id: 2, name: 'Principal & administrator', threshold_hours: 48, target_role: 'principal_admin', priority: 'All', enabled: true },
    ],
  };
}

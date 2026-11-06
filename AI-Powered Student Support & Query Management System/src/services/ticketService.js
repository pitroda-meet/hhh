import { ApiError, mockRequest, paginate, requireUser } from './api.js';
import { dbNow, enrichTicket, getDatabase, isoNow, mutateDatabase, nextId, notify, publicUser } from '../mock/database.js';
import { addStatusHistory, findAssignee, routeCategory } from '../mock/routingEngine.js';
import { ACTIVE_STATUSES, PRIORITIES, STATUSES } from '../utils/constants.js';

export function canAccessTicket(user, ticket) {
  return user.role === 'student' ? ticket.student_id === user.id : user.role === 'staff' ? user.department_ids.includes(ticket.department_id) : ['admin', 'principal'].includes(user.role);
}

function findTicket(db, id, user) {
  const ticket = db.tickets.find((t) => String(t.id) === String(id) || t.ticket_number.toLowerCase() === String(id).toLowerCase());
  if (!ticket || !canAccessTicket(user, ticket)) throw new ApiError('This ticket was not found or is not accessible to your account.', 404);
  return ticket;
}

function listForUser(user, params) {
  const db = getDatabase();
  let tickets = db.tickets.filter((t) => canAccessTicket(user, t));
  if (params.assigned_to === 'me') tickets = tickets.filter((t) => t.assigned_to === user.id);
  if (params.assigned_to === 'unassigned') tickets = tickets.filter((t) => !t.assigned_to);
  if (params.critical_only) tickets = tickets.filter((t) => ACTIVE_STATUSES.includes(t.status) && (t.priority === 'Critical' || t.status === 'Escalated'));
  if (params.status && params.status !== 'All') tickets = tickets.filter((t) => params.status === 'Active' ? ACTIVE_STATUSES.includes(t.status) : t.status === params.status);
  if (params.category_id) tickets = tickets.filter((t) => t.category_id === Number(params.category_id));
  if (params.department_id) tickets = tickets.filter((t) => t.department_id === Number(params.department_id));
  if (params.priority && params.priority !== 'All') tickets = tickets.filter((t) => t.priority === params.priority);
  if (params.search?.trim()) {
    const search = params.search.trim().toLowerCase();
    tickets = tickets.filter((t) => `${t.ticket_number} ${t.subject} ${t.description} ${db.users.find((u) => u.id === t.student_id)?.name}`.toLowerCase().includes(search));
  }
  tickets.sort((a, b) => params.sort === 'priority' ? PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || new Date(b.created_at) - new Date(a.created_at) : new Date(b.created_at) - new Date(a.created_at));
  return { ...paginate(tickets.map((t) => enrichTicket(db, t)), params), now: dbNow(db) };
}

export async function listStudentQueries(params = {}) { return mockRequest('GET', '/api/student/queries', () => listForUser(requireUser(['student']), params)); }
export async function listStaffQueries(params = {}) { return mockRequest('GET', '/api/staff/queries', () => listForUser(requireUser(['staff']), params)); }
export async function listAllTickets(params = {}) { return mockRequest('GET', '/api/admin/queries', () => listForUser(requireUser(['admin', 'principal']), params)); }
export async function listQueries(params = {}) {
  const user = requireUser();
  return user.role === 'student' ? listStudentQueries(params) : user.role === 'staff' ? listStaffQueries(params) : listAllTickets(params);
}

export async function getTicket(id) {
  const role = requireUser().role;
  return mockRequest('GET', `/api/${role}/queries/${id}`, () => {
    const user = requireUser();
    const db = getDatabase();
    const ticket = findTicket(db, id, user);
    const internal = user.role === 'student' ? {} : { internal_notes: db.ticket_internal_notes.filter((note) => note.ticket_id === ticket.id).map((note) => ({ ...note, user: publicUser(db.users.find((u) => u.id === note.user_id)) })) };
    return { ...enrichTicket(db, ticket), ...internal, replies: db.ticket_replies.filter((r) => r.ticket_id === ticket.id).map((r) => ({ ...r, user: publicUser(db.users.find((u) => u.id === r.user_id)) })), history: db.ticket_status_history.filter((h) => h.ticket_id === ticket.id).map((h) => ({ ...h, actor: publicUser(db.users.find((u) => u.id === h.actor_id)) })), now: dbNow(db) };
  });
}

export async function createTicket(input) {
  return mockRequest('POST', '/api/student/queries', () => {
    const user = requireUser(['student']);
    const subject = input.subject?.trim();
    const description = input.description?.trim();
    if (!subject || subject.length < 5 || subject.length > 150) throw new ApiError('Enter a subject between 5 and 150 characters.');
    if (!description || description.length < 10 || description.length > 5000) throw new ApiError('Please describe your query in 10–5,000 characters.');
    if (input.priority && !PRIORITIES.includes(input.priority)) throw new ApiError('Choose a valid priority.');
    return mutateDatabase((db) => {
      // Idempotency protects a confirmation from duplicate clicks or retries.
      if (input.idempotency_key) {
        const existing = db.tickets.find((t) => t.student_id === user.id && t.idempotency_key === input.idempotency_key);
        if (existing) return enrichTicket(db, existing);
      }
      const { category, department, staff, strategy } = routeCategory(db, input.category_id);
      const sequence = db.meta.next_ticket_number++;
      const ticket = { id: nextId(db.tickets), ticket_number: `ITI-2026-${String(sequence).padStart(5, '0')}`, student_id: user.id, category_id: category.id, department_id: department.id, assigned_to: staff?.id || null, subject, description, priority: input.priority || 'Medium', source: input.source === 'ai' ? 'ai' : 'manual', status: 'Open', created_at: isoNow(db), updated_at: isoNow(db), due_at: new Date(dbNow(db) + department.sla_hours * 3600000).toISOString(), first_response_at: null, resolved_at: null, closed_at: null, escalation_level: 0, attachments: (input.attachments || []).map(({ name, size, type }) => ({ name, size, type, mock: true })), rating: null, feedback: '', idempotency_key: input.idempotency_key || null };
      db.tickets.push(ticket);
      db.ticket_status_history.push({ id: nextId(db.ticket_status_history), ticket_id: ticket.id, actor_id: user.id, previous_status: null, status: 'Open', note: input.source === 'ai' ? 'Created by the AI assistant after student confirmation.' : 'Student submitted a support query.', created_at: isoNow(db) });
      ticket.routing_method = strategy;
      if (staff) addStatusHistory(db, ticket, 'Assigned', null, `Auto-routed: ${category.name} → ${department.name} → ${staff.name} (${strategy === 'round_robin' ? 'round-robin' : 'least active tickets'}).`);
      const recipients = staff ? [staff.id, user.id] : [user.id, ...db.users.filter((u) => u.role === 'admin' && u.active).map((u) => u.id)];
      notify(db, recipients, { ticket_id: ticket.id, type: 'assigned', title: `${ticket.ticket_number} ${staff ? 'assigned' : 'created'}`, message: `${subject} — ${staff ? `${staff.name}, ${department.name}` : `${department.name}; awaiting staff assignment`}.` });
      return enrichTicket(db, ticket);
    });
  });
}

export async function replyToTicket(id, input) {
  const user = requireUser();
  return mockRequest('POST', `/api/${user.role}/queries/${id}/reply`, () => {
    const actor = requireUser();
    if (!input.message?.trim() && !input.attachments?.length) throw new ApiError('Write a reply or add an attachment.');
    if ((input.message || '').length > 5000) throw new ApiError('Keep your reply within 5,000 characters.');
    return mutateDatabase((db) => {
      const ticket = findTicket(db, id, actor);
      if (ticket.status === 'Closed') throw new ApiError('This ticket is closed. Please create a new query for further help.');
      const reply = { id: nextId(db.ticket_replies), ticket_id: ticket.id, user_id: actor.id, message: input.message?.trim() || 'Attachment shared.', attachments: input.attachments || [], created_at: isoNow(db) };
      db.ticket_replies.push(reply);
      ticket.updated_at = isoNow(db);
      if (actor.role !== 'student' && !ticket.first_response_at) ticket.first_response_at = isoNow(db);
      if (['Open', 'Assigned', 'Waiting for Student', 'Resolved'].includes(ticket.status)) addStatusHistory(db, ticket, 'In Progress', actor.id, ticket.status === 'Resolved' ? 'Reopened with a new reply.' : 'A reply was added to the conversation.');
      notify(db, actor.role === 'student' ? [ticket.assigned_to] : [ticket.student_id], { ticket_id: ticket.id, type: 'reply', title: `New reply on ${ticket.ticket_number}`, message: `${actor.name}: ${reply.message.slice(0, 140)}` });
      return { ...reply, user: publicUser(actor) };
    });
  });
}

export async function updateTicketStatus(id, status, note = '') {
  const user = requireUser(['staff', 'admin', 'principal']);
  return mockRequest('PATCH', `/api/${user.role}/queries/${id}/status`, () => {
    const actor = requireUser(['staff', 'admin', 'principal']);
    if (!STATUSES.includes(status)) throw new ApiError('Choose a valid ticket status.');
    return mutateDatabase((db) => {
      const ticket = findTicket(db, id, actor);
      if (ticket.status === status) return enrichTicket(db, ticket);
      if (status === 'Assigned' && !ticket.assigned_to) throw new ApiError('Assign a staff member before setting this ticket to Assigned.');
      if (status === 'Resolved' && !db.ticket_replies.some((r) => r.ticket_id === ticket.id && r.user_id !== ticket.student_id)) throw new ApiError('Please send the student a resolution reply before marking the ticket resolved.');
      addStatusHistory(db, ticket, status, actor.id, note.trim() || `Status updated to ${status} by ${actor.name}.`);
      const supervisors = status === 'Escalated' ? db.users.filter((u) => ['admin', 'principal'].includes(u.role) && u.active).map((u) => u.id) : [];
      notify(db, [ticket.student_id, ...supervisors], { ticket_id: ticket.id, type: status === 'Resolved' ? 'resolved' : status === 'Escalated' ? 'escalated' : 'status', title: `${ticket.ticket_number} · ${status}`, message: status === 'Resolved' ? 'Your query has been resolved. Please share your feedback.' : `${ticket.subject}: ${note || `The status is now ${status}.`}` });
      return enrichTicket(db, ticket);
    });
  });
}

export async function forwardTicket(id, input) {
  const user = requireUser(['staff', 'admin', 'principal']);
  return mockRequest('POST', `/api/${user.role}/queries/${id}/forward`, () => {
    const actor = requireUser(['staff', 'admin', 'principal']);
    return mutateDatabase((db) => {
      const ticket = findTicket(db, id, actor);
      const department = db.departments.find((d) => d.id === Number(input.department_id) && d.active);
      if (!department) throw new ApiError('Choose an active department.');
      if (['Resolved', 'Closed'].includes(ticket.status)) throw new ApiError('Reopen this ticket before reassigning it.');
      const staff = findAssignee(db, department.id, input.staff_id);
      if (input.staff_id && !staff) throw new ApiError('The selected staff member is not assigned to this department.');
      ticket.department_id = department.id;
      ticket.assigned_to = staff?.id || null;
      addStatusHistory(db, ticket, ticket.status === 'Escalated' ? 'Escalated' : staff ? 'Assigned' : 'Open', actor.id, `Forwarded to ${department.name}${staff ? ` / ${staff.name}` : ''}. ${input.note?.trim() || 'Routed to the responsible department.'}`);
      notify(db, [ticket.student_id, staff?.id], { ticket_id: ticket.id, type: 'assigned', title: `${ticket.ticket_number} reassigned`, message: `${staff?.name || department.name} will handle your query. ${input.note || ''}` });
      return enrichTicket(db, ticket);
    });
  });
}

export async function rateTicket(id, { rating, feedback }) {
  return mockRequest('POST', `/api/student/queries/${id}/feedback`, () => {
    const user = requireUser(['student']);
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) throw new ApiError('Choose a rating from 1 to 5 stars.');
    return mutateDatabase((db) => {
      const ticket = findTicket(db, id, user);
      if (!['Resolved', 'Closed'].includes(ticket.status)) throw new ApiError('Feedback is available once your ticket is resolved.');
      ticket.rating = Number(rating);
      ticket.feedback = String(feedback || '').trim().slice(0, 1000);
      notify(db, [ticket.assigned_to], { ticket_id: ticket.id, type: 'feedback', title: 'A student shared their feedback', message: `${user.name} rated ${ticket.ticket_number} ${ticket.rating}/5 stars.` });
      return enrichTicket(db, ticket);
    });
  });
}

export async function getDashboard() {
  const role = requireUser().role;
  return mockRequest('GET', `/api/${role}/dashboard`, () => {
    const user = requireUser();
    const db = getDatabase();
    const tickets = db.tickets.filter((t) => canAccessTicket(user, t));
    const counts = Object.fromEntries(STATUSES.map((status) => [status, tickets.filter((t) => t.status === status).length]));
    const activity = db.ticket_status_history.filter((h) => tickets.some((t) => t.id === h.ticket_id)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map((h) => ({ ...h, ticket: enrichTicket(db, db.tickets.find((t) => t.id === h.ticket_id)) }));
    const queue = [...tickets].filter((t) => ACTIVE_STATUSES.includes(t.status)).sort((a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map((t) => enrichTicket(db, t));
    return { total: tickets.length, counts, active: tickets.filter((t) => ACTIVE_STATUSES.includes(t.status)).length, assigned_to_me: tickets.filter((t) => t.assigned_to === user.id).length, recent: [...tickets].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5).map((t) => enrichTicket(db, t)), activity, queue, now: dbNow(db) };
  });
}

export async function claimTicket(id) {
  return mockRequest('POST', `/api/staff/queries/${id}/claim`, () => {
    const user = requireUser(['staff']);
    return mutateDatabase((db) => {
      const ticket = findTicket(db, id, user);
      if (!ACTIVE_STATUSES.includes(ticket.status)) throw new ApiError('Only active tickets can be claimed.');
      if (ticket.assigned_to && ticket.assigned_to !== user.id) throw new ApiError('This ticket belongs to another staff member. Ask an administrator to reassign it.', 409);
      if (ticket.claimed_by === user.id) return enrichTicket(db, ticket);
      ticket.assigned_to = user.id;
      ticket.claimed_by = user.id;
      ticket.claimed_at = isoNow(db);
      addStatusHistory(db, ticket, ticket.status === 'Escalated' ? 'Escalated' : 'In Progress', user.id, `${user.name} accepted ownership of the query.`);
      notify(db, [ticket.student_id], { ticket_id: ticket.id, type: 'assigned', title: `${ticket.ticket_number} accepted`, message: `${user.name} is now reviewing your query.` });
      return enrichTicket(db, ticket);
    });
  });
}

export async function addInternalNote(id, message) {
  return mockRequest('POST', `/api/staff/queries/${id}/internal-notes`, () => {
    const user = requireUser(['staff', 'admin', 'principal']);
    if (!message?.trim() || message.length > 5000) throw new ApiError('Write an internal note of up to 5,000 characters.');
    return mutateDatabase((db) => {
      const ticket = findTicket(db, id, user);
      const note = { id: nextId(db.ticket_internal_notes), ticket_id: ticket.id, user_id: user.id, message: message.trim(), created_at: isoNow(db) };
      db.ticket_internal_notes.push(note);
      return { ...note, user: publicUser(user) };
    });
  });
}

export async function updatePriority(id, priority) {
  return mockRequest('PATCH', `/api/staff/queries/${id}/priority`, () => {
    const user = requireUser(['staff', 'admin', 'principal']);
    if (!PRIORITIES.includes(priority)) throw new ApiError('Choose a valid priority.');
    return mutateDatabase((db) => {
      const ticket = findTicket(db, id, user);
      if (ticket.priority === priority) return enrichTicket(db, ticket);
      const previous = ticket.priority;
      ticket.priority = priority;
      addStatusHistory(db, ticket, ticket.status, user.id, `Priority changed from ${previous} to ${priority}.`);
      return enrichTicket(db, ticket);
    });
  });
}

export const ticketService = { listQueries, listStudentQueries, listStaffQueries, listAllTickets, getTicket, createTicket, replyToTicket, updateTicketStatus, forwardTicket, rateTicket, getDashboard, claimTicket, addInternalNote, updatePriority };

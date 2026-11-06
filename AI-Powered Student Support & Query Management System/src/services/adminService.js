import { ApiError, mockRequest, paginate, requireUser } from './api.js';
import { getAuthStorageKey, dbNow, enrichTicket, getDatabase, isoNow, mutateDatabase, nextId, publicUser, resetDatabase } from '../mock/database.js';
import { runEscalation } from '../mock/routingEngine.js';
import { ACTIVE_STATUSES, DEMO_PASSWORD, PRIORITIES, ROLES } from '../utils/constants.js';

export async function getReferenceData() {
  return mockRequest('GET', '/api/departments', () => {
    requireUser();
    const db = getDatabase();
    return { departments: db.departments, categories: db.categories, roles: db.roles, staff: db.users.filter((u) => u.role === 'staff').map(publicUser), routing_strategy: db.meta.routing_strategy, now: dbNow(db) };
  });
}

export async function getManagementData(entity) {
  return mockRequest('GET', `/api/admin/${entity}`, () => {
    requireUser(['admin']);
    const db = getDatabase();
    if (entity === 'assignments') return db.users.filter((u) => u.role === 'staff').map((u) => ({ ...publicUser(u), workload: db.tickets.filter((t) => t.assigned_to === u.id && ACTIVE_STATUSES.includes(t.status)).length }));
    if (!['users', 'departments', 'categories', 'escalation_rules'].includes(entity)) throw new ApiError('Unknown management resource.', 404);
    return entity === 'users' ? db.users.map(publicUser) : db[entity];
  });
}

export async function saveRecord(entity, input) {
  return mockRequest(input.id ? 'PUT' : 'POST', `/api/admin/${entity}${input.id ? `/${input.id}` : ''}`, () => {
    const actor = requireUser(['admin']);
    if (!['users', 'departments', 'categories', 'assignments', 'escalation_rules'].includes(entity)) throw new ApiError('Unknown management resource.', 404);
    return mutateDatabase((db) => {
      const table = entity === 'assignments' ? 'users' : entity;
      let record = input.id ? db[table].find((r) => r.id === Number(input.id)) : null;
      if (input.id && !record) throw new ApiError('The record no longer exists.', 404);
      let fields;
      if (entity === 'users') {
        if (!input.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email || '')) throw new ApiError('A name and valid email address are required.');
        if (!ROLES.includes(input.role)) throw new ApiError('Choose a valid role.');
        if (db.users.some((u) => u.id !== input.id && u.email.toLowerCase() === input.email.trim().toLowerCase())) throw new ApiError('This email address is already in use.');
        if (record?.id === actor.id && (input.role !== 'admin' || !input.active)) throw new ApiError('Keep your current administrator account active.');
        if (record && input.role !== record.role && db.tickets.some((t) => t.student_id === record.id || t.assigned_to === record.id)) throw new ApiError('This user has ticket history. Keep their role and create a separate account for a different role.');
        const department_ids = input.role === 'staff' ? (input.department_ids || []).map(Number) : [];
        if (department_ids.some((id) => !db.departments.some((d) => d.id === id && d.active))) throw new ApiError('Choose active departments for this staff member.');
        if (record && !input.active && db.tickets.some((t) => t.assigned_to === record.id && ACTIVE_STATUSES.includes(t.status))) throw new ApiError('Reassign this staff member’s active tickets before deactivating them.');
        if (record?.role === 'staff' && db.tickets.some((t) => t.assigned_to === record.id && ACTIVE_STATUSES.includes(t.status) && !department_ids.includes(t.department_id))) throw new ApiError('Reassign active tickets before removing their department from this staff member.');
        fields = { name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, role_id: db.roles.find((r) => r.name === input.role).id, active: Boolean(input.active), department_ids, institute: input.institute || 'Government ITI, Junagadh', phone: input.phone || '', language: record?.language || 'en', trade: input.trade || record?.trade || 'Electrician', year: record?.year || '1st year', enrollment_number: record?.enrollment_number || `GTI-2026-${String(200 + nextId(db.users)).padStart(4, '0')}` };
        if (input.password) { if (input.password.length < 8) throw new ApiError('Password must contain at least 8 characters.'); fields.password = input.password; }
        if (!record) fields.password = input.password || DEMO_PASSWORD;
      } else if (entity === 'assignments') {
        if (!record || record.role !== 'staff') throw new ApiError('Choose an existing staff member.');
        const ids = (input.department_ids || []).map(Number);
        if (ids.some((id) => !db.departments.some((d) => d.id === id && d.active))) throw new ApiError('Choose active departments.');
        if (db.tickets.some((t) => t.assigned_to === record.id && ACTIVE_STATUSES.includes(t.status) && !ids.includes(t.department_id))) throw new ApiError('Reassign active tickets before removing their department from this staff member.');
        fields = { department_ids: ids };
      } else if (entity === 'departments') {
        if (!input.name?.trim() || !input.code?.trim()) throw new ApiError('Department name and code are required.');
        if (db.departments.some((d) => d.id !== input.id && d.code.toLowerCase() === input.code.trim().toLowerCase())) throw new ApiError('Department codes must be unique.');
        if (Number(input.sla_hours) < 1 || Number(input.sla_hours) > 168) throw new ApiError('SLA must be between 1 and 168 hours.');
        if (record && !input.active && db.categories.some((c) => c.department_id === record.id && c.active)) throw new ApiError('Remap active categories before deactivating this department.');
        fields = { name: input.name.trim(), code: input.code.trim().toUpperCase(), description: input.description || '', sla_hours: Number(input.sla_hours), active: Boolean(input.active) };
      } else if (entity === 'categories') {
        if (!input.name?.trim()) throw new ApiError('A category name is required.');
        if (!db.departments.some((d) => d.id === Number(input.department_id) && d.active)) throw new ApiError('Map this category to an active department.');
        fields = { name: input.name.trim(), description: input.description || '', department_id: Number(input.department_id), active: Boolean(input.active) };
      } else {
        if (!input.name?.trim()) throw new ApiError('Give the escalation rule a name.');
        if (Number(input.threshold_hours) < 1 || Number(input.threshold_hours) > 720) throw new ApiError('Threshold must be between 1 and 720 hours.');
        if (!['supervisor', 'principal_admin'].includes(input.target_role)) throw new ApiError('Choose a valid escalation target.');
        if (!['All', ...PRIORITIES].includes(input.priority)) throw new ApiError('Choose a valid priority filter.');
        fields = { name: input.name.trim(), threshold_hours: Number(input.threshold_hours), target_role: input.target_role, priority: input.priority, enabled: Boolean(input.enabled) };
      }
      if (!record) { record = { id: nextId(db[table]), created_at: isoNow(db) }; db[table].push(record); }
      Object.assign(record, fields, { updated_at: isoNow(db) });
      return table === 'users' ? publicUser(record) : record;
    });
  });
}

export async function deleteRecord(entity, id) {
  return mockRequest('DELETE', `/api/admin/${entity}/${id}`, () => {
    const actor = requireUser(['admin']);
    return mutateDatabase((db) => {
      if (!['users', 'departments', 'categories', 'escalation_rules'].includes(entity)) throw new ApiError('This resource cannot be deleted.');
      const used = entity === 'users' ? id === actor.id || db.tickets.some((t) => t.student_id === id || t.assigned_to === id) || db.ticket_replies.some((r) => r.user_id === id) || db.faqs.some((f) => f.suggested_by === id || f.approved_by === id)
        : entity === 'departments' ? db.tickets.some((t) => t.department_id === id) || db.categories.some((c) => c.department_id === id) || db.users.some((u) => u.department_ids.includes(id))
          : entity === 'categories' ? db.tickets.some((t) => t.category_id === id) || db.faqs.some((f) => f.category_id === id) : false;
      if (used) throw new ApiError('This record is linked to existing activity. Update or deactivate it instead to preserve history.');
      db[entity] = db[entity].filter((r) => r.id !== id);
      return { deleted: true };
    });
  });
}

export async function getReports() {
  return mockRequest('GET', '/api/admin/reports', () => {
    requireUser(['admin', 'principal']);
    const db = getDatabase();
    const active = db.tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
    const resolved = db.tickets.filter((t) => ['Resolved', 'Closed'].includes(t.status));
    const average = (values) => values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;
    const responseHours = (tickets) => tickets.filter((t) => t.first_response_at).map((t) => (new Date(t.first_response_at) - new Date(t.created_at)) / 3600000);
    const trend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(dbNow(db));
      date.setDate(date.getDate() - 29 + i);
      const day = date.toLocaleDateString('en-CA');
      const onDay = (value) => value && new Date(value).toLocaleDateString('en-CA') === day;
      return { date: date.toISOString(), label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), created: db.tickets.filter((t) => onDay(t.created_at)).length, resolved: db.tickets.filter((t) => onDay(t.resolved_at)).length };
    });
    const departments = db.departments.map((d) => {
      const tickets = db.tickets.filter((t) => t.department_id === d.id);
      return { id: d.id, name: d.name, short: d.code, total: tickets.length, resolved: tickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length, pending: tickets.filter((t) => ACTIVE_STATUSES.includes(t.status)).length, average_response: average(responseHours(tickets)) };
    });
    const staffPerformance = db.users.filter((u) => u.role === 'staff' && u.active).map((u) => {
      const tickets = db.tickets.filter((t) => t.assigned_to === u.id);
      const completed = tickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length;
      return { ...publicUser(u), department_names: db.departments.filter((d) => u.department_ids.includes(d.id)).map((d) => d.name).join(', '), assigned: tickets.length, pending: tickets.length - completed, resolved: completed, average_response: average(responseHours(tickets)), satisfaction: average(tickets.filter((t) => t.rating).map((t) => t.rating)), resolution_rate: tickets.length ? Math.round(completed / tickets.length * 100) : 0 };
    });
    const searches = db.ai_action_logs.filter((l) => l.tool === 'search_faq');
    return { summary: { students: db.users.filter((u) => u.role === 'student' && u.active).length, staff: staffPerformance.length, departments: db.departments.filter((d) => d.active).length, total: db.tickets.length, pending: active.length, resolved: resolved.length, escalated: db.tickets.filter((t) => t.status === 'Escalated').length, resolution_rate: db.tickets.length ? Math.round(resolved.length / db.tickets.length * 100) : 0, average_response: average(responseHours(db.tickets)), satisfaction: average(db.tickets.filter((t) => t.rating).map((t) => t.rating)), ai_resolution_rate: searches.length ? Math.round(searches.filter((l) => l.status === 'success').length / searches.length * 100) : 0, faqs_pending: db.faqs.filter((f) => f.status === 'suggested').length, faqs_published: db.faqs.filter((f) => f.status === 'published').length }, categories: db.categories.map((c) => ({ name: c.name, value: db.tickets.filter((t) => t.category_id === c.id).length })).filter((c) => c.value), departments, trend, staff_performance: staffPerformance, critical: active.filter((t) => t.priority === 'Critical' || t.status === 'Escalated').sort((a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority)).map((t) => enrichTicket(db, t)), recent: [...db.tickets].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5).map((t) => enrichTicket(db, t)), now: dbNow(db), time_offset_hours: db.meta.time_offset_hours };
  });
}

export async function getAiLogs(params = {}) {
  return mockRequest('GET', '/api/admin/ai-action-logs', () => {
    requireUser(['admin']);
    const db = getDatabase();
    let logs = [...db.ai_action_logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
    if (params.tool && params.tool !== 'All') logs = logs.filter((l) => l.tool === params.tool);
    if (params.status && params.status !== 'All') logs = logs.filter((l) => l.status === params.status);
    if (params.search) logs = logs.filter((l) => `${l.tool} ${l.result} ${db.users.find((u) => u.id === l.student_id)?.name}`.toLowerCase().includes(params.search.toLowerCase()));
    const searches = db.ai_action_logs.filter((log) => log.tool === 'search_faq');
    const sessions = new Set(db.ai_action_logs.filter((log) => log.session_id).map((log) => log.session_id));
    const handoffs = new Set(db.ai_action_logs.filter((log) => log.tool === 'create_ticket' && log.session_id).map((log) => log.session_id));
    return { ...paginate(logs.map((l) => ({ ...l, student_name: db.users.find((u) => u.id === l.student_id)?.name || 'Student' })), params), summary: { total: db.ai_action_logs.length, success: db.ai_action_logs.filter((l) => l.status === 'success').length, no_match: db.ai_action_logs.filter((l) => l.status === 'no_match').length, errors: db.ai_action_logs.filter((l) => l.status === 'error').length, faq_match_rate: searches.length ? Math.round(searches.filter((log) => log.status === 'success').length / searches.length * 100) : 0, handoff_rate: sessions.size ? Math.round(handoffs.size / sessions.size * 100) : 0 }, tools: [...new Set(db.ai_action_logs.map((l) => l.tool))] };
  });
}

export async function simulateTime(hours = 24) {
  return mockRequest('POST', '/api/admin/escalations/simulate', () => {
    const user = requireUser(['admin', 'principal']);
    if (!Number.isFinite(Number(hours)) || Number(hours) < 1 || Number(hours) > 168) throw new ApiError('Advance the demo clock by 1–168 hours.');
    return mutateDatabase((db) => runEscalation(db, Number(hours), user.id));
  });
}

export async function resetDemo() {
  return mockRequest('POST', '/api/demo/reset', () => {
    let role = null;
    try { role = requireUser().role; } catch { /* Reset is also available from the demo login screen. */ }
    const db = resetDatabase();
    const user = role ? db.users.find((u) => u.role === role) : null;
    if (user) localStorage.setItem(getAuthStorageKey(), JSON.stringify({ user_id: user.id, token: `demo-${user.id}-${Date.now()}` }));
    else localStorage.removeItem(getAuthStorageKey());
    return { user: publicUser(user), reset_at: db.meta.seeded_at };
  });
}

export async function setRoutingStrategy(strategy) {
  return mockRequest('PUT', '/api/admin/routing-rules/strategy', () => {
    requireUser(['admin']);
    if (!['least_open', 'round_robin'].includes(strategy)) throw new ApiError('Choose a supported routing strategy.');
    return mutateDatabase((db) => { db.meta.routing_strategy = strategy; return { routing_strategy: strategy }; });
  });
}

export const adminService = { getReferenceData, getManagementData, saveRecord, deleteRecord, getReports, getAiLogs, simulateTime, resetDemo, setRoutingStrategy };

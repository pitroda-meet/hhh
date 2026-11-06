import { ACTIVE_STATUSES } from '../utils/constants.js';
import { dbNow, isoNow, nextId, notify } from './database.js';

export function findAssignee(db, departmentId, preferredStaffId) {
  const candidates = db.users.filter((u) => u.role === 'staff' && u.active && u.department_ids.includes(Number(departmentId)));
  if (preferredStaffId) return candidates.find((u) => u.id === Number(preferredStaffId)) || null;
  if (db.meta.routing_strategy === 'round_robin') {
    const ordered = candidates.sort((a, b) => a.id - b.id);
    if (!ordered.length) return null;
    db.meta.routing_cursors ||= {};
    const previous = ordered.findIndex((staff) => staff.id === db.meta.routing_cursors[departmentId]);
    const selected = ordered[(previous + 1) % ordered.length];
    db.meta.routing_cursors[departmentId] = selected.id;
    return selected;
  }
  const workload = (id) => db.tickets.filter((t) => t.assigned_to === id && ACTIVE_STATUSES.includes(t.status)).length;
  return candidates.sort((a, b) => workload(a.id) - workload(b.id) || a.id - b.id)[0] || null;
}

export function routeCategory(db, categoryId) {
  const category = db.categories.find((c) => c.id === Number(categoryId) && c.active);
  if (!category) throw new Error('Please choose an active query category.');
  const department = db.departments.find((d) => d.id === category.department_id && d.active);
  if (!department) throw new Error('The mapped department is unavailable. Please choose another category or contact an administrator.');
  return { category, department, staff: findAssignee(db, department.id), strategy: db.meta.routing_strategy || 'least_open' };
}

export function addStatusHistory(db, ticket, status, actorId, note) {
  const previous_status = ticket.status;
  ticket.status = status;
  ticket.updated_at = isoNow(db);
  if (status === 'Resolved') ticket.resolved_at = isoNow(db);
  if (status === 'Closed') ticket.closed_at = isoNow(db);
  if (ACTIVE_STATUSES.includes(status) && !ACTIVE_STATUSES.includes(previous_status)) {
    ticket.resolved_at = null;
    ticket.closed_at = null;
    ticket.rating = null;
    ticket.feedback = '';
    ticket.escalation_level = 0;
    ticket.reopened_at = isoNow(db);
    ticket.due_at = new Date(dbNow(db) + (db.departments.find((d) => d.id === ticket.department_id)?.sla_hours || 24) * 3600000).toISOString();
  }
  db.ticket_status_history.push({ id: nextId(db.ticket_status_history), ticket_id: ticket.id, actor_id: actorId, previous_status, status, note, created_at: isoNow(db) });
}

export function runEscalation(db, hours = 24, actorId = null) {
  db.meta.time_offset_hours += hours;
  const changed = [];
  const rules = db.escalation_rules.filter((r) => r.enabled).sort((a, b) => a.threshold_hours - b.threshold_hours);
  db.tickets.filter((t) => ACTIVE_STATUSES.includes(t.status)).forEach((ticket) => {
    const ageHours = (dbNow(db) - new Date(ticket.reopened_at || ticket.created_at).getTime()) / 3600000;
    const rule = [...rules].reverse().find((r) => ageHours >= r.threshold_hours && (r.priority === 'All' || r.priority === ticket.priority));
    if (!rule || ticket.escalation_level >= rule.threshold_hours) return;
    ticket.escalation_level = rule.threshold_hours;
    addStatusHistory(db, ticket, 'Escalated', actorId, `${rule.name}: unresolved for ${Math.floor(ageHours)} hours (threshold ${rule.threshold_hours}h).`);
    const targets = db.users.filter((u) => u.active && (u.role === 'principal' || (rule.target_role === 'principal_admin' && u.role === 'admin'))).map((u) => u.id);
    notify(db, [ticket.student_id, ticket.assigned_to, ...targets], { ticket_id: ticket.id, type: 'escalated', title: `${ticket.ticket_number} escalated`, message: `${ticket.subject} — ${rule.name}. Your department has been notified.` });
    changed.push(ticket);
  });
  return { hours_advanced: hours, escalated_count: changed.length, ticket_ids: changed.map((t) => t.id), current_time: isoNow(db), time_offset_hours: db.meta.time_offset_hours };
}

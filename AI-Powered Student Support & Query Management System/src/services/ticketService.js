import { apiClient, emitDatabaseChange, getStoredUser } from './api.js';

function currentRole() {
  return getStoredUser()?.role || 'student';
}

function buildTicketPayload(input) {
  const files = (input.attachments || []).map((a) => a.file).filter(Boolean);
  if (!files.length) return input;
  const form = new FormData();
  if (input.subject !== undefined) form.append('subject', input.subject);
  if (input.description !== undefined) form.append('description', input.description);
  if (input.message !== undefined) form.append('message', input.message);
  if (input.category_id !== undefined) form.append('category_id', String(input.category_id));
  if (input.priority !== undefined) form.append('priority', input.priority);
  if (input.source !== undefined) form.append('source', input.source);
  if (input.idempotency_key) form.append('idempotency_key', input.idempotency_key);
  files.forEach((file) => form.append('files[]', file));
  return form;
}

export async function listStudentQueries(params = {}) {
  return (await apiClient.get('/student/queries', { params })).data;
}

export async function listStaffQueries(params = {}) {
  return (await apiClient.get('/staff/queries', { params })).data;
}

export async function listAllTickets(params = {}) {
  const role = currentRole();
  const path = role === 'principal' ? '/principal/queries' : '/admin/queries';
  return (await apiClient.get(path, { params })).data;
}

export async function listQueries(params = {}) {
  const role = currentRole();
  return role === 'student' ? listStudentQueries(params) : role === 'staff' ? listStaffQueries(params) : listAllTickets(params);
}

export async function getTicket(id) {
  const role = currentRole();
  return (await apiClient.get(`/${role}/queries/${id}`)).data;
}

export async function createTicket(input) {
  const payload = buildTicketPayload(input);
  const response = await apiClient.post('/student/queries', payload);
  emitDatabaseChange();
  return response.data;
}

export async function replyToTicket(id, input) {
  const role = currentRole();
  const payload = buildTicketPayload(input);
  const response = await apiClient.post(`/${role}/queries/${id}/reply`, payload);
  emitDatabaseChange();
  return response.data;
}

export async function updateTicketStatus(id, status, note = '') {
  const role = currentRole();
  const response = await apiClient.patch(`/${role}/queries/${id}/status`, { status, note });
  emitDatabaseChange();
  return response.data;
}

export async function forwardTicket(id, input) {
  const role = currentRole();
  const response = await apiClient.post(`/${role}/queries/${id}/forward`, {
    ...input,
    staff_id: input.staff_id || null,
  });
  emitDatabaseChange();
  return response.data;
}

export async function rateTicket(id, { rating, feedback }) {
  const response = await apiClient.post(`/student/queries/${id}/feedback`, { rating, feedback });
  emitDatabaseChange();
  return response.data;
}

export async function getDashboard() {
  const role = currentRole();
  return (await apiClient.get(`/${role}/dashboard`)).data;
}

export async function claimTicket(id) {
  const response = await apiClient.post(`/staff/queries/${id}/claim`);
  emitDatabaseChange();
  return response.data;
}

export async function addInternalNote(id, message) {
  const response = await apiClient.post(`/staff/queries/${id}/internal-notes`, { message });
  emitDatabaseChange();
  return response.data;
}

export async function updatePriority(id, priority) {
  const response = await apiClient.patch(`/staff/queries/${id}/priority`, { priority });
  emitDatabaseChange();
  return response.data;
}

export async function downloadAttachment(attachment) {
  if (!attachment?.id) {
    throw new Error('This sample attachment has no uploaded file stored on the server.');
  }
  const response = await apiClient.get(`/attachments/${attachment.id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = attachment.name || 'attachment';
  anchor.click();
  URL.revokeObjectURL(url);
}

export const ticketService = {
  listQueries,
  listStudentQueries,
  listStaffQueries,
  listAllTickets,
  getTicket,
  createTicket,
  replyToTicket,
  updateTicketStatus,
  forwardTicket,
  rateTicket,
  getDashboard,
  claimTicket,
  addInternalNote,
  updatePriority,
  downloadAttachment,
};

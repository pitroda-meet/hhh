import { apiClient, emitDatabaseChange, getStoredUser } from './api.js';

export async function getReferenceData() {
  return (await apiClient.get('/departments')).data;
}

export async function getManagementData(entity) {
  return (await apiClient.get(`/admin/${entity}`)).data;
}

export async function saveRecord(entity, input) {
  const response = input.id
    ? await apiClient.put(`/admin/${entity}/${input.id}`, input)
    : await apiClient.post(`/admin/${entity}`, input);
  emitDatabaseChange();
  return response.data;
}

export async function deleteRecord(entity, id) {
  const response = await apiClient.delete(`/admin/${entity}/${id}`);
  emitDatabaseChange();
  return response.data;
}

export async function getReports() {
  const role = getStoredUser()?.role;
  const path = role === 'principal' ? '/principal/reports' : '/admin/reports';
  return (await apiClient.get(path)).data;
}

export async function getAiLogs(params = {}) {
  return (await apiClient.get('/admin/ai-action-logs', { params })).data;
}

export async function getAiStatus() {
  return (await apiClient.get('/admin/ai-status')).data;
}

export async function setRoutingStrategy(strategy) {
  const response = await apiClient.put('/admin/routing-rules/strategy', { routing_strategy: strategy });
  emitDatabaseChange();
  return response.data;
}

export async function simulateEscalation(hours = 24) {
  const response = await apiClient.post('/admin/simulate-escalation', { hours });
  emitDatabaseChange();
  return response.data;
}

export async function demoReset() {
  const response = await apiClient.post('/demo/reset');
  emitDatabaseChange();
  return response.data;
}

export const adminService = {
  getReferenceData,
  getManagementData,
  saveRecord,
  deleteRecord,
  getReports,
  getAiLogs,
  getAiStatus,
  setRoutingStrategy,
  simulateEscalation,
  demoReset,
};

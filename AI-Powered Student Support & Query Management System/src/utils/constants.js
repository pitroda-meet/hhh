export const ROLES = ['student', 'staff', 'admin', 'principal'];
export const ROLE_LABELS = { student: 'Student', staff: 'Staff / Instructor', admin: 'Administrator', principal: 'Principal / Supervisor' };
export const STATUSES = ['Open', 'Assigned', 'In Progress', 'Waiting for Student', 'Escalated', 'Resolved', 'Closed'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const ACTIVE_STATUSES = STATUSES.filter((status) => !['Resolved', 'Closed'].includes(status));
export const LANGUAGES = [{ code: 'en', label: 'English', short: 'EN' }, { code: 'hi', label: 'हिन्दी', short: 'HI' }, { code: 'gu', label: 'ગુજરાતી', short: 'GU' }];
export const CATEGORY_LABELS = { 1: 'Academic', 2: 'Examination', 3: 'Scholarship', 4: 'Administrative', 5: 'Technical', 6: 'Workshop/Trade', 7: 'Student Welfare', 8: 'General' };
export const CATEGORY_COLORS = ['#0b3954', '#ea580c', '#4c9c91', '#709ac3', '#a696cc', '#e9bc68', '#ad798e', '#94a3b8'];
export const STATUS_STYLES = {
  Open: { color: '#3576bc', background: '#edf4fe' },
  Assigned: { color: '#6555a7', background: '#f0edfc' },
  'In Progress': { color: '#b3710b', background: '#fff5df' },
  'Waiting for Student': { color: '#926c42', background: '#f8f0e8' },
  Escalated: { color: '#c44545', background: '#fff0ee' },
  Resolved: { color: '#16815b', background: '#eaf7f0' },
  Closed: { color: '#68798b', background: '#eef2f6' },
};
export const PRIORITY_STYLES = {
  Low: { color: '#64748b', background: '#f1f5f9' },
  Medium: { color: '#317bab', background: '#eaf5fa' },
  High: { color: '#c37316', background: '#fff4e4' },
  Critical: { color: '#c44545', background: '#fff0ee' },
};
export const DEMO_PASSWORD = 'Demo@2026';
export const DEMO_EMAILS = { student: 'student@iti.demo', staff: 'staff@iti.demo', admin: 'admin@iti.demo', principal: 'principal@iti.demo' };

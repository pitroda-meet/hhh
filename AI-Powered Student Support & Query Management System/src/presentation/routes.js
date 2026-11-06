// This inventory drives BOTH React Router and the presentation coverage ledger.
// A newly added application route therefore cannot silently disappear from coverage.
export const PITCH_ROUTES = [
  { key: 'login', path: '/login', role: 'public', module: 'authentication', label: 'Multi-role login', scene: 1, load: () => import('../pages/auth/LoginPage.jsx') },
  { key: 'register', path: '/register', role: 'public', module: 'authentication', label: 'Student registration', scene: 2, load: () => import('../pages/auth/RegisterPage.jsx') },
  { key: 'studentDashboard', path: '/student', role: 'student', module: 'student-overview', label: 'Student dashboard', scene: 3, load: () => import('../pages/student/DashboardPage.jsx') },
  { key: 'studentFaqs', path: '/student/faqs', role: 'student', module: 'knowledge-base', label: 'Student FAQ center', scene: 3, load: () => import('../pages/student/FaqPage.jsx') },
  { key: 'studentChat', path: '/student/chat', role: 'student', module: 'ai-support', label: 'Multilingual AI agent', scene: 4, load: () => import('../pages/student/ChatPage.jsx') },
  { key: 'studentNewQuery', path: '/student/queries/new', role: 'student', module: 'manual-queries', label: 'Manual query submission', scene: 5, load: () => import('../pages/student/NewQueryPage.jsx') },
  { key: 'studentQueries', path: '/student/queries', role: 'student', module: 'student-tracking', label: 'My Queries registry', scene: 5, load: () => import('../pages/student/MyQueriesPage.jsx') },
  { key: 'studentTicket', path: '/student/queries/:id', role: 'student', module: 'student-tracking', label: 'Student ticket timeline & rating', scene: 7, load: () => import('../pages/student/TicketDetailPage.jsx') },
  { key: 'studentProfile', path: '/student/profile', role: 'student', module: 'profiles', label: 'Student profile', scene: 3, load: () => import('../pages/student/ProfilePage.jsx') },
  { key: 'staffDashboard', path: '/staff', role: 'staff', module: 'staff-operations', label: 'Staff workload dashboard', scene: 6, load: () => import('../pages/staff/DashboardPage.jsx') },
  { key: 'staffInbox', path: '/staff/inbox', role: 'staff', module: 'staff-operations', label: 'Department inbox & claiming', scene: 6, load: () => import('../pages/staff/InboxPage.jsx') },
  { key: 'staffTicket', path: '/staff/queries/:id', role: 'staff', module: 'staff-operations', label: 'Staff resolution studio', scene: 6, load: () => import('../pages/staff/TicketDetailPage.jsx') },
  { key: 'staffFaqs', path: '/staff/faqs', role: 'staff', module: 'knowledge-base', label: 'Staff reference FAQs', scene: 6, load: () => import('../pages/staff/FaqPage.jsx') },
  { key: 'staffProfile', path: '/staff/profile', role: 'staff', module: 'profiles', label: 'Staff credentials', scene: 6, load: () => import('../pages/staff/ProfilePage.jsx') },
  { key: 'adminDashboard', path: '/admin', role: 'admin', module: 'admin-overview', label: 'Institute administration dashboard', scene: 8, load: () => import('../pages/admin/DashboardPage.jsx') },
  { key: 'users', path: '/admin/users', role: 'admin', module: 'user-management', label: 'User master', scene: 8, entity: 'users', load: () => import('../pages/admin/ManagementPage.jsx') },
  { key: 'departments', path: '/admin/departments', role: 'admin', module: 'organization-masters', label: 'Department master', scene: 8, entity: 'departments', load: () => import('../pages/admin/ManagementPage.jsx') },
  { key: 'categories', path: '/admin/categories', role: 'admin', module: 'organization-masters', label: 'Query category mapping', scene: 8, entity: 'categories', load: () => import('../pages/admin/ManagementPage.jsx') },
  { key: 'assignments', path: '/admin/assignments', role: 'admin', module: 'routing', label: 'Routing & staff assignment rules', scene: 8, entity: 'assignments', load: () => import('../pages/admin/ManagementPage.jsx') },
  { key: 'escalationRules', path: '/admin/escalation', role: 'admin', module: 'sla-escalation', label: 'SLA escalation rules', scene: 8, entity: 'escalation_rules', load: () => import('../pages/admin/ManagementPage.jsx') },
  { key: 'adminFaqs', path: '/admin/faqs', role: 'admin', module: 'knowledge-governance', label: 'Multilingual FAQ curation', scene: 8, load: () => import('../pages/admin/FaqManagementPage.jsx') },
  { key: 'aiMonitoring', path: '/admin/ai-monitoring', role: 'admin', module: 'knowledge-governance', label: 'AI trace & confidence logs', scene: 8, load: () => import('../pages/admin/AiMonitoringPage.jsx') },
  { key: 'adminTickets', path: '/admin/tickets', role: 'admin', module: 'ticket-administration', label: 'Global ticket repository', scene: 8, load: () => import('../pages/admin/AllTicketsPage.jsx') },
  { key: 'adminTicket', path: '/admin/queries/:id', role: 'admin', module: 'ticket-administration', label: 'Administrative ticket override', scene: 8, load: () => import('../pages/admin/TicketDetailPage.jsx') },
  { key: 'adminProfile', path: '/admin/profile', role: 'admin', module: 'profiles', label: 'Administrator profile', scene: 8, load: () => import('../pages/admin/ProfilePage.jsx') },
  { key: 'principalDashboard', path: '/principal', role: 'principal', module: 'executive-oversight', label: 'Executive analytics', scene: 9, load: () => import('../pages/principal/DashboardPage.jsx') },
  { key: 'principalTickets', path: '/principal/tickets', role: 'principal', module: 'executive-oversight', label: 'Critical & escalated watchlist', scene: 9, load: () => import('../pages/principal/TicketsPage.jsx') },
  { key: 'principalTicket', path: '/principal/queries/:id', role: 'principal', module: 'executive-oversight', label: 'Executive ticket intervention', scene: 9, load: () => import('../pages/principal/TicketDetailPage.jsx') },
  { key: 'principalProfile', path: '/principal/profile', role: 'principal', module: 'profiles', label: 'Principal profile', scene: 9, load: () => import('../pages/principal/ProfilePage.jsx') },
];

export const PITCH_MODULES = [...new Set(PITCH_ROUTES.map((route) => route.module))];
export function matchPitchRoute(pathname) {
  return PITCH_ROUTES.find((route) => route.path === pathname) || PITCH_ROUTES.find((route) => route.path.includes(':') && new RegExp(`^${route.path.replace(/:[^/]+/g, '[^/]+')}$`).test(pathname));
}
export async function preloadPitchRoutes() { await Promise.all(PITCH_ROUTES.map((route) => route.load())); }

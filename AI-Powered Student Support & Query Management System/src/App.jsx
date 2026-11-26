import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import ProtectedRoute, { HomeRedirect } from './components/ProtectedRoute.jsx';
import { LoadingPage } from './components/ui.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import PrincipalLayout from './layouts/PrincipalLayout.jsx';

const APP_ROUTES = [
  { key: 'login', path: '/login', role: 'public', load: () => import('./pages/auth/LoginPage.jsx') },
  { key: 'register', path: '/register', role: 'public', load: () => import('./pages/auth/RegisterPage.jsx') },
  { key: 'studentDashboard', path: '/student', role: 'student', load: () => import('./pages/student/DashboardPage.jsx') },
  { key: 'studentFaqs', path: '/student/faqs', role: 'student', load: () => import('./pages/student/FaqPage.jsx') },
  { key: 'studentChat', path: '/student/chat', role: 'student', load: () => import('./pages/student/ChatPage.jsx') },
  { key: 'studentNewQuery', path: '/student/queries/new', role: 'student', load: () => import('./pages/student/NewQueryPage.jsx') },
  { key: 'studentQueries', path: '/student/queries', role: 'student', load: () => import('./pages/student/MyQueriesPage.jsx') },
  { key: 'studentTicket', path: '/student/queries/:id', role: 'student', load: () => import('./pages/student/TicketDetailPage.jsx') },
  { key: 'studentProfile', path: '/student/profile', role: 'student', load: () => import('./pages/student/ProfilePage.jsx') },
  { key: 'staffDashboard', path: '/staff', role: 'staff', load: () => import('./pages/staff/DashboardPage.jsx') },
  { key: 'staffInbox', path: '/staff/inbox', role: 'staff', load: () => import('./pages/staff/InboxPage.jsx') },
  { key: 'staffTicket', path: '/staff/queries/:id', role: 'staff', load: () => import('./pages/staff/TicketDetailPage.jsx') },
  { key: 'staffFaqs', path: '/staff/faqs', role: 'staff', load: () => import('./pages/staff/FaqPage.jsx') },
  { key: 'staffProfile', path: '/staff/profile', role: 'staff', load: () => import('./pages/staff/ProfilePage.jsx') },
  { key: 'adminDashboard', path: '/admin', role: 'admin', load: () => import('./pages/admin/DashboardPage.jsx') },
  { key: 'users', path: '/admin/users', role: 'admin', entity: 'users', load: () => import('./pages/admin/ManagementPage.jsx') },
  { key: 'departments', path: '/admin/departments', role: 'admin', entity: 'departments', load: () => import('./pages/admin/ManagementPage.jsx') },
  { key: 'categories', path: '/admin/categories', role: 'admin', entity: 'categories', load: () => import('./pages/admin/ManagementPage.jsx') },
  { key: 'assignments', path: '/admin/assignments', role: 'admin', entity: 'assignments', load: () => import('./pages/admin/ManagementPage.jsx') },
  { key: 'escalationRules', path: '/admin/escalation', role: 'admin', entity: 'escalation_rules', load: () => import('./pages/admin/ManagementPage.jsx') },
  { key: 'adminFaqs', path: '/admin/faqs', role: 'admin', load: () => import('./pages/admin/FaqManagementPage.jsx') },
  { key: 'aiMonitoring', path: '/admin/ai-monitoring', role: 'admin', load: () => import('./pages/admin/AiMonitoringPage.jsx') },
  { key: 'adminTickets', path: '/admin/tickets', role: 'admin', load: () => import('./pages/admin/AllTicketsPage.jsx') },
  { key: 'adminTicket', path: '/admin/queries/:id', role: 'admin', load: () => import('./pages/admin/TicketDetailPage.jsx') },
  { key: 'adminProfile', path: '/admin/profile', role: 'admin', load: () => import('./pages/admin/ProfilePage.jsx') },
  { key: 'principalDashboard', path: '/principal', role: 'principal', load: () => import('./pages/principal/DashboardPage.jsx') },
  { key: 'principalTickets', path: '/principal/tickets', role: 'principal', load: () => import('./pages/principal/TicketsPage.jsx') },
  { key: 'principalTicket', path: '/principal/queries/:id', role: 'principal', load: () => import('./pages/principal/TicketDetailPage.jsx') },
  { key: 'principalProfile', path: '/principal/profile', role: 'principal', load: () => import('./pages/principal/ProfilePage.jsx') },
];

const pages = Object.fromEntries(APP_ROUTES.map((route) => [route.key, lazy(route.load)]));
const layouts = { student: StudentLayout, staff: StaffLayout, admin: AdminLayout, principal: PrincipalLayout };
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function routeElement(route) {
  const Page = pages[route.key];
  return <Page entity={route.entity} />;
}

export default function App() {
  return <div id="sahay-app"><Suspense fallback={<LoadingPage />}><Routes>
    <Route path="/" element={<HomeRedirect />} />
    {APP_ROUTES.filter((route) => route.role === 'public').map((route) => <Route key={route.key} path={route.path} element={routeElement(route)} />)}
    {Object.entries(layouts).map(([role, Layout]) => <Route key={role} element={<ProtectedRoute role={role} />}>
      <Route path={`/${role}`} element={<Layout />}>
        {APP_ROUTES.filter((route) => route.role === role).map((route) => {
          const relative = route.path.slice(role.length + 2);
          return relative ? <Route key={route.key} path={relative} element={routeElement(route)} /> : <Route key={route.key} index element={routeElement(route)} />;
        })}
      </Route>
    </Route>)}
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense>
  <ToastContainer
    position="top-right"
    autoClose={4000}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="light"
  />
  </div>;
}

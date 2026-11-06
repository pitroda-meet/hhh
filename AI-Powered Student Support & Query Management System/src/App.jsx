import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute, { HomeRedirect } from './components/ProtectedRoute.jsx';
import { LoadingPage } from './components/ui.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import PrincipalLayout from './layouts/PrincipalLayout.jsx';
import DemoMode from './components/DemoMode.jsx';

const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'));
const StudentDashboard = lazy(() => import('./pages/student/DashboardPage.jsx'));
const ChatPage = lazy(() => import('./pages/student/ChatPage.jsx'));
const MyQueriesPage = lazy(() => import('./pages/student/MyQueriesPage.jsx'));
const NewQueryPage = lazy(() => import('./pages/student/NewQueryPage.jsx'));
const StudentTicketDetail = lazy(() => import('./pages/student/TicketDetailPage.jsx'));
const FaqPage = lazy(() => import('./pages/student/FaqPage.jsx'));
const ProfilePage = lazy(() => import('./pages/student/ProfilePage.jsx'));
const StaffDashboard = lazy(() => import('./pages/staff/DashboardPage.jsx'));
const InboxPage = lazy(() => import('./pages/staff/InboxPage.jsx'));
const StaffTicketDetail = lazy(() => import('./pages/staff/TicketDetailPage.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage.jsx'));
const ManagementPage = lazy(() => import('./pages/admin/ManagementPage.jsx'));
const FaqManagementPage = lazy(() => import('./pages/admin/FaqManagementPage.jsx'));
const AiMonitoringPage = lazy(() => import('./pages/admin/AiMonitoringPage.jsx'));
const AllTicketsPage = lazy(() => import('./pages/admin/AllTicketsPage.jsx'));
const AdminTicketDetail = lazy(() => import('./pages/admin/TicketDetailPage.jsx'));
const PrincipalDashboard = lazy(() => import('./pages/principal/DashboardPage.jsx'));
const PrincipalTickets = lazy(() => import('./pages/principal/TicketsPage.jsx'));
const PrincipalTicketDetail = lazy(() => import('./pages/principal/TicketDetailPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

export default function App() {
  return <><Suspense fallback={<LoadingPage />}><Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute role="student" />}><Route path="/student" element={<StudentLayout />}>
      <Route index element={<StudentDashboard />} />
      <Route path="chat" element={<ChatPage />} />
      <Route path="queries" element={<MyQueriesPage />} />
      <Route path="queries/new" element={<NewQueryPage />} />
      <Route path="queries/:id" element={<StudentTicketDetail />} />
      <Route path="faqs" element={<FaqPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route></Route>
    <Route element={<ProtectedRoute role="staff" />}><Route path="/staff" element={<StaffLayout />}>
      <Route index element={<StaffDashboard />} />
      <Route path="inbox" element={<InboxPage />} />
      <Route path="queries/:id" element={<StaffTicketDetail />} />
      <Route path="faqs" element={<FaqPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route></Route>
    <Route element={<ProtectedRoute role="admin" />}><Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<ManagementPage key="users" entity="users" />} />
      <Route path="departments" element={<ManagementPage key="departments" entity="departments" />} />
      <Route path="categories" element={<ManagementPage key="categories" entity="categories" />} />
      <Route path="assignments" element={<ManagementPage key="assignments" entity="assignments" />} />
      <Route path="escalation" element={<ManagementPage key="escalation" entity="escalation_rules" />} />
      <Route path="faqs" element={<FaqManagementPage />} />
      <Route path="ai-monitoring" element={<AiMonitoringPage />} />
      <Route path="tickets" element={<AllTicketsPage />} />
      <Route path="queries/:id" element={<AdminTicketDetail />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route></Route>
    <Route element={<ProtectedRoute role="principal" />}><Route path="/principal" element={<PrincipalLayout />}>
      <Route index element={<PrincipalDashboard />} />
      <Route path="tickets" element={<PrincipalTickets />} />
      <Route path="queries/:id" element={<PrincipalTicketDetail />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route></Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense><DemoMode /></>;
}

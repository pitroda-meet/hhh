import { lazy, Suspense, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import ProtectedRoute, { HomeRedirect } from './components/ProtectedRoute.jsx';
import { LoadingPage } from './components/ui.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import PrincipalLayout from './layouts/PrincipalLayout.jsx';
import DemoMode from './components/DemoMode.jsx';
import AutoPitchRunner from './components/AutoPitchRunner.jsx';
import { useApp } from './context/appContext.js';
import { PITCH_ROUTES } from './presentation/routes.js';

const pages = Object.fromEntries(PITCH_ROUTES.map((route) => [route.key, lazy(route.load)]));
const layouts = { student: StudentLayout, staff: StaffLayout, admin: AdminLayout, principal: PrincipalLayout };
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function routeElement(route) {
  const Page = pages[route.key];
  return <Page entity={route.entity} />;
}

export default function App() {
  const { presentationActive } = useApp();
  const baseTheme = useTheme();
  const theme = useMemo(() => presentationActive ? createTheme(baseTheme, {
    components: {
      MuiModal: { defaultProps: { disableEnforceFocus: true } },
      MuiDialog: { defaultProps: { disableEnforceFocus: true, disableAutoFocus: true } },
    },
  }) : baseTheme, [baseTheme, presentationActive]);

  return <ThemeProvider theme={theme}>
    <div id="sahay-app"><Suspense fallback={<LoadingPage />}><Routes>
      <Route path="/" element={<HomeRedirect />} />
      {PITCH_ROUTES.filter((route) => route.role === 'public').map((route) => <Route key={route.key} path={route.path} element={routeElement(route)} />)}
      {Object.entries(layouts).map(([role, Layout]) => <Route key={role} element={<ProtectedRoute role={role} />}>
        <Route path={`/${role}`} element={<Layout />}>
          {PITCH_ROUTES.filter((route) => route.role === role).map((route) => {
            const relative = route.path.slice(role.length + 2);
            return relative ? <Route key={route.key} path={relative} element={routeElement(route)} /> : <Route key={route.key} index element={routeElement(route)} />;
          })}
        </Route>
      </Route>)}
      <Route path="*" element={<NotFoundPage />} />
    </Routes></Suspense></div>
    <DemoMode />
    <AutoPitchRunner />
  </ThemeProvider>;
}

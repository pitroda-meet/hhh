import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useApp } from '../context/appContext.js';
import Brand from './Brand.jsx';

export function AppLoading() { return <Stack alignItems="center" justifyContent="center" spacing={3} sx={{ minHeight: '100vh', bgcolor: '#f5f8fa' }}><Brand large /><CircularProgress size={23} thickness={3} /><Typography variant="body2" color="text.secondary">A little help is on its way.</Typography></Stack>; }

export default function ProtectedRoute({ role }) {
  const { user, ready } = useApp();
  const location = useLocation();
  if (!ready) return <AppLoading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, ready } = useApp();
  if (!ready) return <Box><AppLoading /></Box>;
  return <Navigate to={user ? `/${user.role}` : '/login'} replace />;
}

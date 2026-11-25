import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { ArrowForwardRounded, LockOutlined, MailOutlineRounded, VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/appContext.js';
import { errorMessage } from '../../utils/format.js';
import AuthLayout from '../../layouts/AuthLayout.jsx';

export default function LoginPage() {
  const { user, ready, login, t, authError } = useApp();
  const [form, setForm] = useState({ email: '', password: '' });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  if (ready && user) return <Navigate to={`/${user.role}`} replace />;
  const submit = async (event) => {
    event.preventDefault();
    setError(null); setBusy(true);
    try {
      const account = await login(form);
      const target = location.state?.from;
      navigate(target?.startsWith(`/${account.role}/`) ? target : `/${account.role}`, { replace: true });
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <AuthLayout>
    <Typography variant="overline" color="secondary.main" sx={{ mb: 1.5 }}>HELLO, FUTURE MAKER</Typography>
    <Typography variant="h2" sx={{ fontSize: { xs: '1.85rem', lg: '2rem' }, letterSpacing: '-1px' }}>{t('loginTitle')}</Typography>
    <Typography color="text.secondary" sx={{ mt: 1, mb: 3.5, fontSize: '.85rem' }}>{t('loginSubtitle')}</Typography>
    {(error || authError) && <Alert severity="error" sx={{ mb: 2 }}>{error || authError}</Alert>}
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2.3}>
        <TextField fullWidth required label={t('email')} type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><MailOutlineRounded sx={{ fontSize: 19, color: '#94a4b0' }} /></InputAdornment> }} />
        <TextField fullWidth required label={t('password')} type={visible ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlined sx={{ fontSize: 19, color: '#94a4b0' }} /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} size="small">{visible ? <VisibilityOffOutlined sx={{ fontSize: 18 }} /> : <VisibilityOutlined sx={{ fontSize: 18 }} />}</IconButton></InputAdornment> }} />
        <Button type="submit" fullWidth variant="contained" size="large" disabled={busy} endIcon={busy ? <CircularProgress size={17} color="inherit" /> : <ArrowForwardRounded />} sx={{ py: 1.5 }}>{t('signIn')}</Button>
      </Stack>
    </Box>
    <Stack direction="row" spacing={.6} justifyContent="center" alignItems="center" sx={{ mt: 2 }}><Typography variant="body2" color="text.secondary">{t('noAccount')}</Typography><Button component={Link} to="/register" size="small" sx={{ px: .5, fontSize: '.76rem' }}>{t('createAccount')}</Button></Stack>
  </AuthLayout>;
}

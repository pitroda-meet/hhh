import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Grid, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { ArrowForwardRounded, LockOutlined, MailOutlineRounded, VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/appContext.js';
import { errorMessage } from '../../utils/format.js';
import { roleIcons } from '../../layouts/navigation.js';
import AuthLayout from '../../layouts/AuthLayout.jsx';

export default function LoginPage() {
  const { user, ready, login, demoLogin, t, authError } = useApp();
  const [form, setForm] = useState({ email: 'student@iti.demo', password: 'Demo@2026' });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  if (ready && user) return <Navigate to={`/${user.role}`} replace />;
  const submit = async (event, role) => {
    event?.preventDefault();
    setError(null); setBusy(role || 'login');
    try {
      const account = role ? await demoLogin(role) : await login(form);
      const target = location.state?.from;
      navigate(target?.startsWith(`/${account.role}/`) ? target : `/${account.role}`, { replace: true });
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(null); }
  };
  const tones = { student: ['#edf4f8', '#396b86'], staff: ['#fff2e8', '#cc763c'], admin: ['#f1edfa', '#8068ae'], principal: ['#edf6f1', '#4b8f70'] };
  return <AuthLayout>
    <Typography variant="overline" color="secondary.main" sx={{ mb: 1.5 }}>HELLO, FUTURE MAKER</Typography>
    <Typography variant="h2" sx={{ fontSize: { xs: '1.85rem', lg: '2rem' }, letterSpacing: '-1px' }}>{t('loginTitle')}</Typography>
    <Typography color="text.secondary" sx={{ mt: 1, mb: 3.5, fontSize: '.85rem' }}>{t('loginSubtitle')}</Typography>
    {(error || authError) && <Alert severity="error" sx={{ mb: 2 }}>{error || authError}</Alert>}
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2.3}>
        <TextField fullWidth required label={t('email')} type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><MailOutlineRounded sx={{ fontSize: 19, color: '#94a4b0' }} /></InputAdornment> }} />
        <TextField fullWidth required label={t('password')} type={visible ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlined sx={{ fontSize: 19, color: '#94a4b0' }} /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} size="small">{visible ? <VisibilityOffOutlined sx={{ fontSize: 18 }} /> : <VisibilityOutlined sx={{ fontSize: 18 }} />}</IconButton></InputAdornment> }} />
        <Button type="submit" fullWidth variant="contained" size="large" disabled={Boolean(busy)} endIcon={busy === 'login' ? <CircularProgress size={17} color="inherit" /> : <ArrowForwardRounded />} sx={{ py: 1.5 }}>{t('signIn')}</Button>
      </Stack>
    </Box>
    <Stack direction="row" spacing={.6} justifyContent="center" alignItems="center" sx={{ mt: 2 }}><Typography variant="body2" color="text.secondary">{t('noAccount')}</Typography><Button component={Link} to="/register" size="small" sx={{ px: .5, fontSize: '.76rem' }}>{t('createAccount')}</Button></Stack>
    <Divider sx={{ my: 3.5 }}><Typography variant="caption" sx={{ color: '#99a6b0', px: .8 }}>EXPLORE SAHAY</Typography></Divider>
    <Typography variant="h5">{t('demoLogin')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 2 }}>{t('demoLoginHint')}</Typography>
    <Grid container spacing={1.3}>{Object.keys(roleIcons).map((role) => { const Icon = roleIcons[role]; return <Grid item xs={6} key={role}><Button fullWidth onClick={(event) => submit(event, role)} disabled={Boolean(busy)} data-testid={`demo-${role}`} aria-label={`Demo ${role}`} variant="outlined" sx={{ justifyContent: 'flex-start', borderColor: '#e3eaf0', p: 1.3, borderRadius: '10px', color: '#314d60', '&:hover': { bgcolor: tones[role][0], borderColor: tones[role][1] } }}><Box sx={{ width: 35, height: 35, mr: 1.2, borderRadius: '9px', bgcolor: tones[role][0], color: tones[role][1], display: 'grid', placeItems: 'center', flexShrink: 0 }}>{busy === role ? <CircularProgress size={16} color="inherit" /> : <Icon sx={{ fontSize: 20 }} />}</Box><Typography variant="body2" fontWeight={600} sx={{ textAlign: 'left', fontSize: '.72rem' }}>{t(role)}</Typography></Button></Grid>; })}</Grid>
    <Typography data-pitch="demo-password-hint" variant="caption" textAlign="center" color="text.secondary" sx={{ mt: 1.7, fontSize: '.66rem' }}>{t('demoCredentials')}</Typography>
  </AuthLayout>;
}

import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ArrowForwardRounded } from '@mui/icons-material';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import { useApp } from '../../context/appContext.js';
import { errorMessage } from '../../utils/format.js';
import { extractValidationErrors, validateRegister } from '../../utils/validation.js';

export default function RegisterPage() {
  const { user, register, t, language, toast } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    institute: 'Government ITI, Junagadh',
    trade: 'Electrician',
    enrollment_number: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    error: Boolean(fieldErrors[key]),
  });

  const submit = async (event) => {
    event.preventDefault();
    const check = validateRegister(form);
    if (!check.valid) {
      setFieldErrors(check.errors);
      const firstMsg = Object.values(check.errors)[0];
      setError(firstMsg);
      toast(firstMsg, 'warning');
      return;
    }

    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await register({ ...form, language });
      toast(`Account created! Welcome to Sahay, ${created.name}.`, 'success');
      navigate('/student', { replace: true });
    } catch (reason) {
      const msg = errorMessage(reason);
      setFieldErrors(extractValidationErrors(reason));
      setError(msg);
      if (!reason?._toasted) toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout wide>
      <Typography variant="overline" color="secondary.main" sx={{ mb: 1.5 }}>YOUR JOURNEY, SUPPORTED</Typography>
      <Typography variant="h2">{t('registerTitle')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>{t('registerSubtitle')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" noValidate onSubmit={submit}>
        <Grid container spacing={2.2}>
          <Grid item xs={12}><TextField fullWidth required label={t('fullName')} autoComplete="name" helperText={fieldErrors.name} {...field('name')} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth required type="email" label={t('email')} autoComplete="email" helperText={fieldErrors.email} {...field('email')} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label={t('phone')} type="tel" autoComplete="tel" helperText={fieldErrors.phone} {...field('phone')} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label={t('instituteLabel')} helperText={fieldErrors.institute} {...field('institute')}>{['Government ITI, Junagadh', 'Government ITI, Rajkot'].map((institute) => <MenuItem key={institute} value={institute}>{institute}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label={t('trade')} helperText={fieldErrors.trade} {...field('trade')}>{['Electrician', 'Fitter', 'Welder', 'Computer Operator & Programming Assistant', 'Mechanic Diesel', 'Draughtsman Civil'].map((trade) => <MenuItem key={trade} value={trade}>{trade}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12}><TextField fullWidth label={t('enrollment')} {...field('enrollment_number')} helperText={fieldErrors.enrollment_number || 'Optional — an enrollment number will be generated if left empty.'} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth required type="password" label={t('password')} autoComplete="new-password" inputProps={{ minLength: 8 }} helperText={fieldErrors.password || 'At least 8 characters'} {...field('password')} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth required type="password" label={t('confirmPassword')} autoComplete="new-password" inputProps={{ minLength: 8 }} helperText={fieldErrors.confirm_password} {...field('confirm_password')} /></Grid>
          <Grid item xs={12}><Button type="submit" fullWidth variant="contained" size="large" disabled={busy} endIcon={busy ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRounded />}>{t('createAccount')}</Button></Grid>
        </Grid>
      </Box>
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">{t('alreadyAccount')}</Typography>
        <Button component={Link} to="/login">{t('signIn')}</Button>
      </Stack>
    </AuthLayout>
  );
}

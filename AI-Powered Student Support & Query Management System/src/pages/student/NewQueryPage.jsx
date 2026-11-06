import { useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ArrowForwardRounded, AutoAwesomeRounded, CheckCircleRounded, HubOutlined, PersonOutlineRounded, SendRounded } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/appContext.js';
import { useAsync } from '../../hooks/useAsync.js';
import { adminService } from '../../services/adminService.js';
import { ticketService } from '../../services/ticketService.js';
import { PRIORITIES } from '../../utils/constants.js';
import { errorMessage } from '../../utils/format.js';
import { ErrorState, PageHeader } from '../../components/ui.jsx';
import { TicketSummary } from '../../components/TicketTable.jsx';
import AttachmentInput from '../../components/AttachmentInput.jsx';

export default function NewQueryPage() {
  const { t, toast } = useApp();
  const refs = useAsync(adminService.getReferenceData, []);
  const [form, setForm] = useState({ subject: '', category_id: '', priority: 'Medium', description: '', attachments: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const category = refs.data?.categories.find((c) => c.id === Number(form.category_id));
  const department = refs.data?.departments.find((d) => d.id === category?.department_id);
  const field = (key) => ({ 'data-pitch': `query-${key}`, value: form[key], onChange: (event) => { const value = event.target.value; setForm((current) => ({ ...current, [key]: value })); } });
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(null); try { const { data } = await ticketService.createTicket(form); setCreated(data); toast(`${data.ticket_number} created successfully.`); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  if (refs.error) return <ErrorState error={refs.error} onRetry={refs.reload} />;
  if (created) return <Box sx={{ maxWidth: 560, mx: 'auto', mt: 5 }}><Card><CardContent sx={{ p: '36px !important' }}><Avatar sx={{ width: 65, height: 65, bgcolor: '#eaf7f0', color: '#2d906b', mx: 'auto', mb: 2.5 }}><CheckCircleRounded sx={{ fontSize: 34 }} /></Avatar><Typography variant="h2" textAlign="center">{t('queryCreated')}</Typography><Typography color="text.secondary" textAlign="center" sx={{ mt: 1, mb: 3 }}>{t('queryCreatedHint')}</Typography><TicketSummary ticket={created} /><Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 3 }}><Button component={Link} to="/student/queries">{t('myQueries')}</Button><Button variant="contained" onClick={() => { setCreated(null); setForm({ subject: '', category_id: '', priority: 'Medium', description: '', attachments: [] }); }}>{t('newQuery')}</Button></Stack></CardContent></Card></Box>;
  return <>
    <PageHeader title={t('newQueryTitle')} subtitle={t('newQuerySubtitle')} />
    <Grid container spacing={3}><Grid item xs={12} md={8}><Card><CardContent><Typography variant="h5" sx={{ mb: 3 }}>{t('queryDetails')}</Typography>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Box component="form" onSubmit={submit}><Stack spacing={2.8}>
      <TextField required fullWidth label={t('subject')} placeholder={t('subjectPlaceholder')} inputProps={{ minLength: 5, maxLength: 150 }} {...field('subject')} />
      <Grid container spacing={2} sx={{ width: 'calc(100% + 16px) !important', ml: '-16px !important' }}><Grid item xs={12} sm={7}><TextField select required fullWidth label={t('category')} disabled={refs.loading} {...field('category_id')}>{refs.data?.categories.filter((c) => c.active).map((c) => <MenuItem key={c.id} value={c.id}>{t(c.name)}</MenuItem>)}</TextField></Grid><Grid item xs={12} sm={5}><TextField select fullWidth label={t('priority')} {...field('priority')}>{PRIORITIES.map((p) => <MenuItem key={p} value={p}>{t(p)}</MenuItem>)}</TextField></Grid></Grid>
      <TextField fullWidth required multiline minRows={6} label={t('description')} placeholder={t('descriptionPlaceholder')} inputProps={{ minLength: 10, maxLength: 5000 }} helperText={`${form.description.length}/5,000`} {...field('description')} />
      <Box><Typography variant="subtitle2" sx={{ mb: 1.2 }}>{t('attachments')}</Typography><AttachmentInput value={form.attachments} onChange={(attachments) => setForm((current) => ({ ...current, attachments }))} disabled={busy} /></Box>
      <Stack direction="row" justifyContent="flex-end" spacing={1.5}><Button component={Link} to="/student/queries" disabled={busy}>{t('cancel')}</Button><Button type="submit" variant="contained" disabled={busy || refs.loading} startIcon={busy ? <CircularProgress size={17} color="inherit" /> : <SendRounded sx={{ fontSize: 18 }} />}>{t('submitQuery')}</Button></Stack>
    </Stack></Box></CardContent></Card></Grid><Grid item xs={12} md={4}>
      <Card sx={{ bgcolor: '#f8fbfc' }}><CardContent><Avatar sx={{ bgcolor: '#e7f0f5', color: '#547f98', mb: 2 }}><HubOutlined /></Avatar><Typography variant="h4">{t('routingTitle')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1.2, mb: 3 }}>{t(refs.data?.routing_strategy === 'round_robin' ? 'roundRobinHint' : 'routingHint')}</Typography><Stack spacing={2.3}>{['routingStep1', 'routingStep2', 'routingStep3'].map((key, i) => <Stack key={key} direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ width: 26, height: 26, bgcolor: '#e9eff3', color: '#698697', fontSize: 11 }}>{i + 1}</Avatar><Typography variant="body2">{t(key)}</Typography></Stack>)}</Stack>{department && <Box sx={{ mt: 3, p: 2, bgcolor: '#eaf3ee', borderRadius: 2 }}><Typography variant="caption" color="text.secondary">{t('department')}</Typography><Typography variant="subtitle2" sx={{ mt: .5 }}>{t(department.name)}</Typography><Stack direction="row" alignItems="center" spacing={.5} sx={{ mt: 1 }}><PersonOutlineRounded sx={{ fontSize: 15, color: '#739888' }} /><Typography variant="caption" color="text.secondary">{t(refs.data?.routing_strategy === 'round_robin' ? 'round_robin' : 'automaticAssignment')}</Typography></Stack></Box>}</CardContent></Card>
      <Box sx={{ p: 2.5, mt: 2.5, borderRadius: '14px', bgcolor: '#fff5ed', border: '1px solid #f4e4d8' }}><AutoAwesomeRounded sx={{ color: '#d5854e', fontSize: 22, mb: 1.2 }} /><Typography variant="subtitle2">{t('stillNeedHelp')}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('stillNeedHelpHint')}</Typography><Button component={Link} to="/student/chat" endIcon={<ArrowForwardRounded />} size="small" sx={{ mt: 1, pl: 0 }}>{t('askSahay')}</Button></Box>
    </Grid></Grid>
  </>;
}

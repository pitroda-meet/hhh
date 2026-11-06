import { Avatar, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded, AutoAwesomeOutlined, CheckCircleOutlineRounded, DescriptionOutlined, GroupsOutlined, HubOutlined, MenuBookOutlined, SchoolOutlined } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/appContext.js';
import { useAsync } from '../../hooks/useAsync.js';
import { adminService } from '../../services/adminService.js';
import { ErrorState, LoadingPage, PageHeader, SectionTitle, StatCard, ViewAllButton } from '../../components/ui.jsx';
import { CategoryChart, ResolutionChart } from '../../components/AnalyticsCharts.jsx';
import SimulateTimeButton from '../../components/SimulateTimeButton.jsx';
import TicketTable from '../../components/TicketTable.jsx';

export default function DashboardPage() {
  const { t, revision } = useApp();
  const { data, loading, error, reload } = useAsync(adminService.getReports, [revision]);
  const navigate = useNavigate();
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <LoadingPage />;
  const s = data.summary;
  return <>
    <PageHeader title={t('adminDashboardTitle')} subtitle={t('adminDashboardSubtitle')} action={<SimulateTimeButton />} />
    <Stack data-pitch="admin-response-metrics" direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}><Chip icon={<CheckCircleOutlineRounded />} label={`${t('resolutionRate')}: ${s.resolution_rate}%`} sx={{ bgcolor: '#eaf6ef', color: '#458768' }} /><Chip label={`${t('avgResponse')}: ${s.average_response}h`} sx={{ bgcolor: '#edf4fa', color: '#507c9c' }} /><Chip label={`${t('studentSatisfaction')}: ${s.satisfaction}/5`} sx={{ bgcolor: '#fff4e6', color: '#a77d46' }} /></Stack>
    <Grid container spacing={2} sx={{ mb: 2.5 }}>{[['totalStudents', s.students, SchoolOutlined, 'primary'], ['totalStaff', s.staff, GroupsOutlined, 'info'], ['departments', s.departments, HubOutlined, 'purple'], ['totalTickets', s.total, DescriptionOutlined, 'secondary']].map(([label, value, icon, color]) => <Grid item xs={6} md={3} key={label}><StatCard title={t(label)} value={value} icon={icon} color={color} hint={t('institute')} /></Grid>)}</Grid>
    <Grid container spacing={2} sx={{ mb: 3 }}>{[['pending', s.pending, '#c58e42', '#fff5e6', 'Active'], ['resolved', s.resolved, '#4f9476', '#edf7f1', 'Resolved'], ['Escalated', s.escalated, '#c56a5e', '#fff1ee', 'Escalated']].map(([label, value, color, bg, status]) => <Grid item xs={12} sm={4} key={label}><Button component={Link} to={`/admin/tickets?status=${status}`} fullWidth sx={{ justifyContent: 'flex-start', gap: 1.3, py: 1.5, px: 2, border: '1px solid #e3eaf0', bgcolor: '#fff', color: 'text.primary', borderRadius: '12px' }}><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 0 5px ${bg}` }} /><Typography variant="body2" fontWeight={550}>{t(label)}</Typography><Typography variant="h4" sx={{ ml: 'auto' }}>{value}</Typography><ArrowForwardRounded sx={{ color: '#a5b5bf', fontSize: 16, ml: .5 }} /></Button></Grid>)}</Grid>
    {loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}
    <Grid container spacing={2.5} sx={{ mb: 3 }}><Grid item xs={12} lg={8}><ResolutionChart data={data.trend} /></Grid><Grid item xs={12} lg={4}><CategoryChart data={data.categories} /></Grid></Grid>
    <Grid container spacing={2.5}><Grid item xs={12} lg={8}><Card><Box sx={{ px: 3, pt: 2.5 }}><SectionTitle title={t('recentQueries')} action={<ViewAllButton onClick={() => navigate('/admin/tickets')} />} /></Box><TicketTable tickets={data.recent} compact /></Card></Grid><Grid item xs={12} lg={4}>
      <Card sx={{ bgcolor: '#0b3954', color: '#fff', borderColor: '#0b3954' }}><CardContent><Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ bgcolor: '#ffffff12', color: '#eeb686', width: 39, height: 39 }}><MenuBookOutlined sx={{ fontSize: 21 }} /></Avatar><Typography variant="h5" sx={{ color: '#fff' }}>{t('knowledgeHealth')}</Typography></Stack><Stack direction="row" spacing={4} sx={{ my: 3 }}><Box><Typography sx={{ fontSize: '1.9rem', fontWeight: 750, lineHeight: 1.4 }}>{s.faqs_published}</Typography><Typography variant="caption" sx={{ color: '#a7c4d4' }}>{t('publishedFaqs')}</Typography></Box><Box><Typography sx={{ fontSize: '1.9rem', fontWeight: 750, lineHeight: 1.4, color: '#f3b17e' }}>{s.faqs_pending}</Typography><Typography variant="caption" sx={{ color: '#a7c4d4' }}>{t('pendingApproval')}</Typography></Box></Stack><Button component={Link} to="/admin/faqs?status=suggested" variant="contained" color="secondary" fullWidth endIcon={<ArrowForwardRounded sx={{ fontSize: 17 }} />}>{t('reviewSuggestions')}</Button></CardContent></Card>
      <Card sx={{ mt: 2.5 }}><CardContent><Stack direction="row" spacing={1.3} alignItems="center"><AutoAwesomeOutlined sx={{ color: '#b58357', fontSize: 23 }} /><Box><Typography variant="subtitle2">{t('aiMonitoring')}</Typography><Typography variant="caption" color="text.secondary">Search, route, create. Every action visible.</Typography></Box><Chip label={`${s.ai_resolution_rate}%`} size="small" sx={{ ml: 'auto !important', bgcolor: '#edf6f0', color: '#5a9075' }} /></Stack><Button component={Link} to="/admin/ai-monitoring" size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />} sx={{ mt: 1.5, pl: 0 }}>{t('viewAll')}</Button></CardContent></Card>
    </Grid></Grid>
    <Stack direction="row" spacing={.7} alignItems="center" sx={{ mt: 3, color: '#8fa3b1' }}><CheckCircleOutlineRounded sx={{ fontSize: 14 }} /><Typography variant="caption" sx={{ fontSize: '.63rem' }}>All systems connected · Local demo database{data.time_offset_hours > 0 ? ` · Simulated clock +${data.time_offset_hours}h` : ''}</Typography></Stack>
  </>;
}

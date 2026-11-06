import { Avatar, Box, Button, Card, CardContent, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded, AssignmentIndOutlined, CheckCircleOutlineRounded, FlagOutlined, ForumOutlined, PendingActionsRounded, WavingHandOutlined } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/appContext.js';
import { useAsync } from '../../hooks/useAsync.js';
import { ticketService } from '../../services/ticketService.js';
import { EmptyState, ErrorState, LoadingPage, PageHeader, PriorityChip, SectionTitle, SlaBadge, StatCard, ViewAllButton } from '../../components/ui.jsx';
import TicketTable from '../../components/TicketTable.jsx';

export default function DashboardPage() {
  const { user, t, revision } = useApp();
  const { data, loading, error, reload } = useAsync(ticketService.getDashboard, [user.id, revision]);
  const navigate = useNavigate();
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <LoadingPage />;
  const stats = [
    ['assignedTickets', data.assigned_to_me, AssignmentIndOutlined, 'primary'],
    ['pending', data.counts.Open + data.counts.Assigned + data.counts['Waiting for Student'], ForumOutlined, 'info'],
    ['inProgress', data.counts['In Progress'], PendingActionsRounded, 'warning'],
    ['resolved', data.counts.Resolved + data.counts.Closed, CheckCircleOutlineRounded, 'success'],
    ['Escalated', data.counts.Escalated, FlagOutlined, 'error'],
  ];
  return <>
    <PageHeader eyebrow={`${t('welcomeBack')}, ${user.name}`} title={t('staffDashboardTitle')} subtitle={t('staffDashboardSubtitle')} action={<Button component={Link} to="/staff/inbox" variant="contained" endIcon={<ArrowForwardRounded />}>{t('ticketInbox')}</Button>} />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>{stats.map(([title, value, icon, color]) => <StatCard key={title} title={t(title)} value={value} icon={icon} color={color} hint={t('staffPortal')} />)}</Box>
    {loading && <LinearProgress sx={{ mb: 2, height: 2 }} />}
    <Box sx={{ bgcolor: '#edf4f5', border: '1px solid #dce9e9', borderRadius: '14px', p: 2.5, display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}><Avatar sx={{ bgcolor: '#fff', color: '#578984' }}><WavingHandOutlined /></Avatar><Box><Typography variant="subtitle1">Every reply is a little reassurance.</Typography><Typography variant="body2" color="text.secondary">Prioritize critical queries, keep students informed, and turn reusable answers into approved FAQs.</Typography></Box></Box>
    <Grid container spacing={3}><Grid item xs={12} xl={8}><Card><Box sx={{ px: 3, pt: 2.5 }}><SectionTitle title={t('recentQueries')} subtitle="New requests and the latest department updates." action={<ViewAllButton onClick={() => navigate('/staff/inbox')} />} /></Box><TicketTable tickets={data.recent} showStudent showSla now={data.now} /></Card></Grid><Grid item xs={12} xl={4}><Card><CardContent><SectionTitle title={t('priorityQueue')} action={<FlagOutlined sx={{ fontSize: 19, color: '#c2895d' }} />} /><Stack spacing={2.3}>{data.queue.length ? data.queue.slice(0, 4).map((ticket) => <Box key={ticket.id} sx={{ pb: 2, borderBottom: '1px solid #edf1f5', '&:last-child': { border: 0, pb: 0 } }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="caption" sx={{ color: '#6b8da3', fontSize: '.65rem' }}>{ticket.ticket_number}</Typography><PriorityChip priority={ticket.priority} /></Stack><Button component={Link} to={`/staff/queries/${ticket.id}`} sx={{ p: 0, my: .9, fontSize: '.78rem', textAlign: 'left', justifyContent: 'flex-start', fontWeight: 600 }}>{ticket.subject}</Button><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="caption" color="text.secondary">{ticket.student?.name}</Typography><SlaBadge ticket={ticket} now={data.now} /></Stack></Box>) : <EmptyState compact title={t('noTickets')} description={t('noNotificationsHint')} />}</Stack></CardContent></Card></Grid></Grid>
  </>;
}

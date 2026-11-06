import { Avatar, Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { AddRounded, ArrowForwardRounded, AutoAwesomeOutlined, AutoAwesomeRounded, CalendarTodayOutlined, CheckCircleOutlineRounded, DescriptionOutlined, ForumOutlined, MenuBookOutlined, NotificationsNoneRounded, PendingActionsRounded, SearchRounded, VerifiedOutlined } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/appContext.js';
import { useAsync } from '../../hooks/useAsync.js';
import { ticketService } from '../../services/ticketService.js';
import { formatDate, relativeTime } from '../../utils/format.js';
import { STATUS_STYLES } from '../../utils/constants.js';
import { EmptyState, ErrorState, LoadingPage, PageHeader, SectionTitle, StatCard, ViewAllButton } from '../../components/ui.jsx';
import SupportIllustration from '../../components/SupportIllustration.jsx';
import TicketTable from '../../components/TicketTable.jsx';

export default function DashboardPage() {
  const { user, t, revision, notifications } = useApp();
  const { data, loading, error, reload } = useAsync(ticketService.getDashboard, [user.id, revision]);
  const navigate = useNavigate();
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <LoadingPage />;
  const quickActions = [
    { title: 'askAI', hint: 'askAIHint', icon: AutoAwesomeOutlined, color: '#c67b46', bg: '#fff3e9', route: '/student/chat' },
    { title: 'raiseQuery', hint: 'raiseQueryHint', icon: AddRounded, color: '#547d9a', bg: '#edf4fb', route: '/student/queries/new' },
    { title: 'trackTicket', hint: 'trackTicketHint', icon: SearchRounded, color: '#8a79ae', bg: '#f2effa', route: '/student/queries' },
    { title: 'browseFAQs', hint: 'browseFAQsHint', icon: MenuBookOutlined, color: '#578f7d', bg: '#edf6f1', route: '/student/faqs' },
  ];
  return <>
    <PageHeader title={<>{t('welcomeBack')}, {user.name.split(' ')[0]} <Box component="span" sx={{ fontSize: '1.55rem', display: 'inline-block', ml: .5 }}>👋</Box></>} subtitle={t('studentSubtitle')} action={<Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#728797', bgcolor: '#fff', border: '1px solid #e4eaf0', borderRadius: '8px', px: 1.5, py: 1 }}><CalendarTodayOutlined sx={{ fontSize: 15 }} /><Typography variant="caption" fontWeight={550}>{formatDate(data.now, { weekday: 'short', year: 'numeric' })}</Typography></Stack>} />
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={6} md={3}><StatCard title={t('totalQueries')} value={data.total} hint={t('allTime')} icon={DescriptionOutlined} /></Grid>
      <Grid item xs={6} md={3}><StatCard title={t('openQueries')} value={data.counts.Open + data.counts.Assigned} hint={t('waitingForReview')} color="info" icon={ForumOutlined} /></Grid>
      <Grid item xs={6} md={3}><StatCard title={t('inProgress')} value={data.counts['In Progress'] + data.counts['Waiting for Student']} hint={t('beingWorkedOn')} color="warning" icon={PendingActionsRounded} /></Grid>
      <Grid item xs={6} md={3}><StatCard title={t('resolved')} value={data.counts.Resolved + data.counts.Closed} hint={t('successfullyHelped')} color="success" icon={CheckCircleOutlineRounded} /></Grid>
    </Grid>
    <Box sx={{ borderRadius: '16px', bgcolor: '#0b3954', backgroundImage: 'linear-gradient(110deg, #0b3954 35%, #154d68)', color: '#fff', p: { xs: 3, md: '29px 34px' }, mb: 3.5, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', minHeight: 245 }}>
      <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#ffffff18 1px, transparent 1px)', backgroundSize: '20px 20px', maskImage: 'linear-gradient(90deg, transparent 30%, black)' }} />
      <Box sx={{ position: 'relative', zIndex: 1, width: { xs: '100%', md: '65%' } }}><Stack direction="row" alignItems="center" spacing={.8} sx={{ mb: 1.3 }}><AutoAwesomeRounded sx={{ color: '#f7bb8c', fontSize: 15 }} /><Typography variant="overline" sx={{ color: '#f0c49f', fontSize: '.6rem', letterSpacing: '1.4px' }}>{t('heroEyebrow')}</Typography></Stack><Typography variant="h3" sx={{ fontSize: { xs: '1.55rem', md: '1.8rem' }, lineHeight: 1.4, color: '#fff', whiteSpace: 'pre-line' }}>{t('heroTitle')}</Typography><Typography sx={{ color: '#b4cdda', fontSize: '.79rem', lineHeight: 1.8, mt: 1.1, maxWidth: 440 }}>{t('heroDescription')}</Typography><Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 2.5 }}><Button component={Link} to="/student/chat" variant="contained" color="secondary" endIcon={<ArrowForwardRounded sx={{ fontSize: 17 }} />} sx={{ py: 1 }}>{t('startConversation')}</Button><Stack direction="row" alignItems="center" spacing={.7} sx={{ display: { xs: 'none', sm: 'flex' } }}><Box sx={{ width: 5, height: 5, bgcolor: '#80c4a5', borderRadius: '50%' }} /><Typography variant="caption" sx={{ color: '#b3cbd9', fontSize: '.64rem' }}>{t('available247')}</Typography></Stack></Stack></Box>
      <Box sx={{ width: '35%', position: 'absolute', right: '1%', top: 2, height: '100%', display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center' }}><SupportIllustration /></Box>
    </Box>
    <SectionTitle title={t('quickActions')} subtitle={t('quickActionsHint')} />
    <Grid container spacing={1.8} sx={{ mb: 3.5 }}>{quickActions.map((item) => <Grid item xs={6} md={3} key={item.title}><Card component={Button} onClick={() => navigate(item.route)} sx={{ width: '100%', p: 2, justifyContent: 'flex-start', textAlign: 'left', color: 'text.primary', '&:hover': { borderColor: '#c9d9e4', bgcolor: '#fff', transform: 'translateY(-2px)' } }}><Stack spacing={1.4} sx={{ width: '100%' }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Avatar variant="rounded" sx={{ width: 35, height: 35, bgcolor: item.bg, color: item.color, borderRadius: '10px' }}><item.icon sx={{ fontSize: 20 }} /></Avatar><ArrowForwardRounded sx={{ color: '#b1bec8', fontSize: 15 }} /></Stack><Box><Typography variant="subtitle2" sx={{ fontSize: '.79rem' }}>{t(item.title)}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontSize: '.65rem', display: 'block', mt: .3 }}>{t(item.hint)}</Typography></Box></Stack></Card></Grid>)}</Grid>
    <Grid container spacing={2.5}>
      <Grid item xs={12} lg={8}><Card><Box sx={{ p: '21px 24px 3px' }}><SectionTitle title={t('recentQueries')} action={<ViewAllButton onClick={() => navigate('/student/queries')} />} /></Box><TicketTable tickets={data.recent} compact /></Card>
        <Box sx={{ mt: 2.5, display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 2.1, bgcolor: '#edf4f8', border: '1px solid #dfeaf1', borderRadius: '12px' }}><VerifiedOutlined sx={{ color: '#5b849c', fontSize: 21, mt: .2 }} /><Box><Typography variant="subtitle2" sx={{ fontSize: '.76rem' }}>{t('threeLanguages')}</Typography><Typography variant="caption" color="text.secondary">{t('chatFootnote')}</Typography></Box><Button component={Link} to="/student/faqs" size="small" sx={{ ml: 'auto', flexShrink: 0 }}>{t('browseFAQs')}</Button></Box>
      </Grid>
      <Grid item xs={12} lg={4}><Card><CardContent><SectionTitle title={t('recentActivity')} action={<NotificationsNoneRounded sx={{ color: '#9baebb', fontSize: 19 }} />} />
        {data.activity.length ? <Stack spacing={0}>{data.activity.slice(0, 4).map((activity, i) => <Stack key={activity.id} direction="row" spacing={1.5} sx={{ position: 'relative', pb: i === 3 ? 0 : 2.6 }}><Box sx={{ pt: .6, position: 'relative', width: 10, flexShrink: 0 }}>{i < 3 && <Box sx={{ position: 'absolute', top: 13, bottom: -3, left: 3, width: 1, bgcolor: '#e6edf2' }} />}<Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: STATUS_STYLES[activity.status]?.color || '#8196a4', position: 'relative' }} /></Box><Box><Typography variant="body2" sx={{ fontSize: '.72rem', fontWeight: 550 }}>{activity.ticket.subject}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontSize: '.65rem', display: 'block', mt: .4 }}>{t(activity.status)} <Box component="span" sx={{ mx: .6 }}>·</Box> {relativeTime(activity.created_at, data.now)}</Typography></Box></Stack>)}</Stack> : <EmptyState compact title={t('noNotifications')} description={t('noNotificationsHint')} />}
      </CardContent></Card>
      <Box sx={{ mt: 2.2, p: 2.3, bgcolor: '#fffbf4', border: '1px solid #f1e8d8', borderRadius: '14px' }}><Stack direction="row" spacing={.8} alignItems="center" sx={{ mb: 1.1 }}><NotificationsNoneRounded sx={{ color: '#bc8c43', fontSize: 17 }} /><Typography variant="overline" sx={{ color: '#aa854c', fontSize: '.58rem' }}>{t('noticeBoard')}</Typography>{notifications.filter((n) => !n.read_at).length > 0 && <Box sx={{ ml: 'auto !important', width: 5, height: 5, bgcolor: 'secondary.main', borderRadius: '50%' }} />}</Stack><Typography variant="subtitle2" sx={{ fontSize: '.76rem' }}>{t('campusNotice')}</Typography><Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .7 }}>{t('campusNoticeBody')}</Typography><Typography sx={{ fontSize: 9, color: '#aa9c83', mt: 1.2 }}>{t('demoNotice')}</Typography></Box>
      </Grid>
    </Grid>
  </>;
}

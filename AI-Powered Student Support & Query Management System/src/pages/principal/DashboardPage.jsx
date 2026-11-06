import { useState } from 'react';
import { Avatar, Box, Button, Card, Chip, Grid, LinearProgress, Rating, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { CheckCircleOutlineRounded, DescriptionOutlined, DownloadRounded, ScheduleOutlined, StarOutlineRounded, WarningAmberRounded } from '@mui/icons-material';
import { useApp } from '../../context/appContext.js';
import { useAsync } from '../../hooks/useAsync.js';
import { adminService } from '../../services/adminService.js';
import { initials } from '../../utils/format.js';
import { downloadReport } from '../../utils/exportReport.js';
import { CategoryChart, DepartmentChart, ResolutionChart } from '../../components/AnalyticsCharts.jsx';
import { EmptyState, ErrorState, LoadingPage, PageHeader, SectionTitle, StatCard } from '../../components/ui.jsx';
import SimulateTimeButton from '../../components/SimulateTimeButton.jsx';
import ReassignDialog from '../../components/ReassignDialog.jsx';
import TicketTable from '../../components/TicketTable.jsx';

export default function DashboardPage() {
  const { t, revision, toast } = useApp();
  const { data, loading, error, reload } = useAsync(adminService.getReports, [revision]);
  const [reassign, setReassign] = useState(null);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <LoadingPage />;
  const s = data.summary;
  return <>
    <PageHeader eyebrow="INSTITUTE HEALTH, AT A GLANCE" title={t('principalTitle')} subtitle={t('principalSubtitle')} action={<Stack spacing={1.1} direction={{ xs: 'column', xl: 'row' }}><Button variant="outlined" startIcon={<DownloadRounded sx={{ fontSize: 18 }} />} sx={{ bgcolor: '#fff' }} onClick={() => { downloadReport(data); toast('Your report has been downloaded.'); }}>{t('exportReport')}</Button><SimulateTimeButton /></Stack>} />
    <Grid container spacing={2} sx={{ mb: 3 }}>{[['totalTickets', s.total, DescriptionOutlined, 'primary', `${s.pending} ${t('pending').toLowerCase()}`], ['resolutionRate', `${s.resolution_rate}%`, CheckCircleOutlineRounded, 'success', `${s.resolved} ${t('resolved').toLowerCase()}`], ['avgResponse', `${s.average_response}h`, ScheduleOutlined, 'info', 'Measured from actual staff replies'], ['studentSatisfaction', `${s.satisfaction}/5`, StarOutlineRounded, 'warning', 'Based on student ticket feedback']].map(([label, value, icon, color, hint]) => <Grid item xs={6} md={3} key={label}><StatCard title={t(label)} value={value} icon={icon} color={color} hint={hint} /></Grid>)}</Grid>
    {loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}
    <Grid container spacing={2.5} sx={{ mb: 3 }}><Grid item xs={12} lg={4}><CategoryChart data={data.categories} /></Grid><Grid item xs={12} lg={8}><DepartmentChart data={data.departments} /></Grid><Grid item xs={12} lg={8}><ResolutionChart data={data.trend} /></Grid><Grid item xs={12} lg={4}><DepartmentChart data={data.departments} responseTimes /></Grid></Grid>
    <Card sx={{ mb: 3 }}><Box sx={{ p: '24px 24px 2px' }}><SectionTitle title={t('staffPerformance')} subtitle="A balanced view of workload, responsiveness, and student feedback." /></Box><TableContainer><Table sx={{ minWidth: 850 }} aria-label="Staff performance"><TableHead><TableRow>{['staff', 'departments', 'Assigned', 'resolved', 'avgResponse', 'rating', 'resolution'].map((key) => <TableCell key={key}>{t(key)}</TableCell>)}</TableRow></TableHead><TableBody>{data.staff_performance.map((person) => <TableRow hover key={person.id}><TableCell><Stack direction="row" spacing={1.3} alignItems="center"><Avatar sx={{ width: 34, height: 34, bgcolor: '#edf3f6', color: '#6e8c9d', fontSize: 11 }}>{initials(person.name)}</Avatar><Typography variant="subtitle2" sx={{ fontSize: '.74rem', whiteSpace: 'nowrap' }}>{person.name}</Typography></Stack></TableCell><TableCell><Typography variant="caption" color="text.secondary">{person.department_names}</Typography></TableCell><TableCell>{person.assigned}</TableCell><TableCell>{person.resolved}</TableCell><TableCell>{person.average_response}h</TableCell><TableCell><Stack direction="row" alignItems="center" spacing={.5}><Rating readOnly value={person.satisfaction} precision={.1} size="small" sx={{ fontSize: 13 }} /><Typography variant="caption" color="text.secondary">{person.satisfaction || '—'}</Typography></Stack></TableCell><TableCell sx={{ minWidth: 130 }}><Stack direction="row" spacing={1} alignItems="center"><LinearProgress variant="determinate" value={person.resolution_rate} sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: '#edf3f7', '& .MuiLinearProgress-bar': { bgcolor: '#80aa9b', borderRadius: 3 } }} /><Typography variant="caption">{person.resolution_rate}%</Typography></Stack></TableCell></TableRow>)}</TableBody></Table></TableContainer></Card>
    <Card sx={{ borderColor: '#eadcd5' }}><Box sx={{ p: '24px 24px 3px' }}><SectionTitle title={<Stack direction="row" alignItems="center" spacing={1}><WarningAmberRounded sx={{ color: '#ca8b60', fontSize: 21 }} /><span>{t('criticalTickets')}</span><Chip size="small" label={data.critical.length} sx={{ bgcolor: '#fff0e8', color: '#c08056' }} /></Stack>} subtitle={t('criticalHint')} /></Box>{data.critical.length ? <TicketTable tickets={data.critical} showStudent onReassign={setReassign} /> : <EmptyState compact title="Every query is on track" description="No critical or escalated tickets need your attention." />}</Card>
    <ReassignDialog ticket={reassign} open={Boolean(reassign)} onClose={() => setReassign(null)} onSaved={reload} />
  </>;
}

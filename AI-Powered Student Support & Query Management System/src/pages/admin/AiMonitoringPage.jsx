import { useState } from 'react';
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { CheckCircleOutlineRounded, CodeRounded, ErrorOutlineRounded, SearchRounded, SupportAgentRounded } from '@mui/icons-material';
import { useApp } from '../../context/appContext.js';
import { useAsync, useDebouncedValue } from '../../hooks/useAsync.js';
import { adminService } from '../../services/adminService.js';
import { formatDateTime } from '../../utils/format.js';
import { EmptyState, ErrorState, PageHeader, StatCard } from '../../components/ui.jsx';

export default function AiMonitoringPage() {
  const { t, revision } = useApp();
  const [search, setSearch] = useState('');
  const [tool, setTool] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(0);
  const [trace, setTrace] = useState(null);
  const query = useDebouncedValue(search);
  const request = useAsync(() => adminService.getAiLogs({ search: query, tool, status, page: page + 1, page_size: 10 }), [query, tool, status, page, revision]);
  const colors = { success: ['#ecf7f0', '#438666'], no_match: ['#fff5e5', '#b18545'], error: ['#fff0ed', '#c26455'] };
  return <>
    <PageHeader ready={!request.loading} eyebrow="TRANSPARENT BY DESIGN" title={t('aiMonitoring')} subtitle={t('aiMonitoringSubtitle')} />
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {[['totalActions', 'total', CodeRounded, 'primary'], ['successfulActions', 'success', CheckCircleOutlineRounded, 'success'], ['fallbacks', 'no_match', SupportAgentRounded, 'warning'], ['errors', 'errors', ErrorOutlineRounded, 'error']].map(([label, key, icon, color]) => <Grid item xs={6} md={3} key={key}><StatCard title={t(label)} value={request.data?.summary[key]} icon={icon} color={color} hint="Mock agent tool execution logs" loading={!request.data} /></Grid>)}
    </Grid>
    <Stack data-pitch="ai-quality-metrics" direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
      <Chip label={`${t('faqMatchRate')}: ${request.data?.summary.faq_match_rate || 0}%`} variant="outlined" />
      <Chip label={`${t('handoffRate')}: ${request.data?.summary.handoff_rate || 0}%`} variant="outlined" />
      <Chip label="Approved FAQ policy · consent-gated ticket creation" sx={{ bgcolor: '#edf7f1', color: '#4c8b6d' }} />
    </Stack>
    <Card>
      <Box sx={{ p: 2.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField data-pitch="ai-log-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search student, tool, or result…" inputProps={{ 'aria-label': t('search') }} sx={{ flex: 1 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 20, color: '#91a7b6' }} /></InputAdornment> }} />
        <TextField data-pitch="ai-tool-filter" select label={t('toolCalled')} value={tool} onChange={(event) => { setTool(event.target.value); setPage(0); }} sx={{ minWidth: 200 }}><MenuItem value="All">{t('allTools')}</MenuItem>{request.data?.tools.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}</TextField>
        <TextField select label={t('status')} value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} sx={{ minWidth: 155 }}><MenuItem value="All">{t('allStatuses')}</MenuItem>{['success', 'no_match', 'error'].map((name) => <MenuItem key={name} value={name}>{t(name)}</MenuItem>)}</TextField>
      </Stack></Box>
      {request.loading && <LinearProgress sx={{ height: 2 }} />}
      {request.error ? <ErrorState error={request.error} onRetry={request.reload} /> : request.data?.items.length === 0 ? <EmptyState title={t('noRecords')} description={t('noRecordsHint')} /> : <TableContainer data-pitch="ai-action-logs"><Table sx={{ minWidth: 980 }} aria-label="AI action logs">
        <TableHead><TableRow>{['timestamp', 'student', 'toolCalled', 'aiIntent', 'aiConfidence', 'result', 'status', 'actions'].map((key) => <TableCell key={key}>{t(key)}</TableCell>)}</TableRow></TableHead>
        <TableBody>{request.data?.items.map((log) => <TableRow hover key={log.id} data-pitch-ai-tool={log.tool}>
          <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="caption">{formatDateTime(log.created_at)}</Typography><Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '.61rem' }}>{log.duration_ms}ms · {log.language.toUpperCase()}</Typography></TableCell>
          <TableCell><Typography variant="body2" noWrap>{log.student_name}</Typography></TableCell>
          <TableCell><Box component="code" sx={{ fontSize: '.65rem', color: '#517b95', px: 1, py: .6, bgcolor: '#edf3f7', borderRadius: 1.2 }}>{log.tool}</Box></TableCell>
          <TableCell><Typography variant="caption">{log.intent || log.input.intent || '—'}</Typography></TableCell>
          <TableCell><Typography variant="caption">{Number.isFinite(log.confidence) ? `${Math.round(log.confidence * 100)}%` : '—'}</Typography></TableCell>
          <TableCell sx={{ maxWidth: 280 }}><Typography variant="body2" sx={{ fontSize: '.7rem', overflowWrap: 'anywhere' }}>{log.result}</Typography></TableCell>
          <TableCell><Chip label={t(log.status)} size="small" sx={{ bgcolor: colors[log.status][0], color: colors[log.status][1] }} /></TableCell>
          <TableCell><Button data-pitch="open-ai-trace" size="small" onClick={() => setTrace(log)}>{t('viewAiTrace')}</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>}
      <TablePagination component="div" count={request.data?.total || 0} page={Math.min(page, Math.max(0, Math.ceil((request.data?.total || 0) / 10) - 1))} onPageChange={(_, value) => setPage(value)} rowsPerPage={10} rowsPerPageOptions={[10]} labelRowsPerPage={t('rowsPerPage')} />
    </Card>
    <Dialog open={Boolean(trace)} onClose={() => setTrace(null)} fullWidth maxWidth="sm"><DialogTitle>{t('viewAiTrace')} · {trace?.tool}</DialogTitle><DialogContent>
      <Alert severity="info" sx={{ mb: 2 }}>{t('aiSourcePolicy')}: {trace?.knowledge_policy || 'Legacy mock activity'}</Alert>
      <Typography variant="body2" sx={{ mb: 2 }}>{trace?.result}</Typography>
      <Box component="pre" sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '.75rem' }}>{JSON.stringify({ input: trace?.input, intent: trace?.intent, confidence: trace?.confidence, source_faq: trace?.faq_id, latency_ms: trace?.duration_ms, status: trace?.status }, null, 2)}</Box>
    </DialogContent><DialogActions><Button data-pitch="dialog-cancel" onClick={() => setTrace(null)}>{t('close')}</Button></DialogActions></Dialog>
  </>;
}

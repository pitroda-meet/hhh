import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { ArrowForwardRounded, ArrowOutwardRounded, CheckRounded, InboxRounded, RefreshRounded, ScheduleRounded } from '@mui/icons-material';
import { useApp } from '../context/appContext.js';
import { PRIORITY_STYLES, STATUS_STYLES } from '../utils/constants.js';
import { errorMessage } from '../utils/format.js';
import { useLocation } from 'react-router-dom';

export function PageHeader({ eyebrow, title, subtitle, action, children, ready = true }) {
  const { pathname } = useLocation();
  return <Stack data-pitch-page={pathname} data-pitch-ready={String(ready)} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
    <Box>{eyebrow && <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: .7 }}>{eyebrow}</Typography>}<Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '1.8rem' } }}>{title}</Typography>{subtitle && <Typography color="text.secondary" sx={{ mt: .7, fontSize: '.83rem' }}>{subtitle}</Typography>}{children}</Box>{action}
  </Stack>;
}

export function SectionTitle({ title, subtitle, action }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2.2 }}><Box><Typography variant="h5">{title}</Typography>{subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: .35 }}>{subtitle}</Typography>}</Box>{action}</Stack>;
}

export function StatusChip({ status, size = 'small' }) {
  const { t } = useApp();
  const style = STATUS_STYLES[status] || STATUS_STYLES.Open;
  return <Chip data-pitch-status={status} size={size} label={<Stack direction="row" alignItems="center" spacing={.7}><Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: style.color }} /><span>{t(status)}</span></Stack>} sx={{ bgcolor: style.background, color: style.color, whiteSpace: 'nowrap', '.MuiChip-label': { px: 1 } }} />;
}

export function PriorityChip({ priority }) {
  const { t } = useApp();
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium;
  return <Chip size="small" label={t(priority)} sx={{ bgcolor: style.background, color: style.color, fontSize: '.68rem' }} />;
}

export function StatCard({ title, value, hint, icon: Icon = InboxRounded, color = 'primary', trend, loading }) {
  const tones = { primary: ['#0b3954', '#edf3f7'], info: ['#3e7cbd', '#edf4ff'], warning: ['#cf8627', '#fff6e7'], success: ['#2c9275', '#eaf7f0'], error: ['#ca5656', '#fff0ee'], secondary: ['#d56227', '#fff1e9'], purple: ['#8166b0', '#f3eefb'] };
  const [foreground, background] = tones[color] || tones.primary;
  return <Card data-pitch="stat-card" sx={{ height: '100%', transition: 'transform .2s, box-shadow .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 22px #0b39540a' } }}><CardContent sx={{ p: '20px !important' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" fontWeight={550} color="text.secondary">{title}</Typography><Avatar variant="rounded" sx={{ width: 35, height: 35, bgcolor: background, color: foreground, borderRadius: '10px' }}><Icon sx={{ fontSize: 20 }} /></Avatar></Stack>
    {loading ? <Skeleton width="45%" height={44} /> : <Stack direction="row" alignItems="center" spacing={1.4} sx={{ mt: .2 }}><Typography sx={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 750, fontSize: '2rem', letterSpacing: '-1px', lineHeight: 1.5 }}>{value ?? 0}</Typography>{trend && <Chip label={trend} size="small" icon={<ArrowOutwardRounded sx={{ fontSize: '12px !important' }} />} sx={{ color: '#218763', bgcolor: '#eff9f3', fontSize: '.65rem' }} />}</Stack>}
    <Typography variant="caption" color="text.secondary">{hint}</Typography>
  </CardContent></Card>;
}

export function EmptyState({ title, description, action, icon: Icon = InboxRounded, compact = false }) {
  return <Stack alignItems="center" textAlign="center" spacing={1.2} sx={{ py: compact ? 3 : 6, px: 3 }}><Box sx={{ position: 'relative', mb: .7 }}><Box sx={{ width: compact ? 56 : 76, height: compact ? 56 : 76, bgcolor: '#eef4f7', borderRadius: '24px', display: 'grid', placeItems: 'center', transform: 'rotate(-7deg)' }}><Icon sx={{ color: '#86a2b3', fontSize: compact ? 27 : 37, transform: 'rotate(7deg)' }} /></Box><Box sx={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', bgcolor: '#fed8be', right: -8, top: 4 }} /></Box><Typography variant="h5">{title}</Typography><Typography variant="body2" color="text.secondary" sx={{ maxWidth: 390 }}>{description}</Typography>{action && <Box sx={{ pt: .5 }}>{action}</Box>}</Stack>;
}

export function LoadingPage() {
  return <Box data-pitch-loading="true"><Skeleton width="38%" height={42} /><Skeleton width="54%" height={26} sx={{ mb: 3 }} /><Grid container spacing={2}>{[0, 1, 2, 3].map((i) => <Grid item xs={6} md={3} key={i}><Skeleton variant="rounded" height={137} /></Grid>)}</Grid><Skeleton variant="rounded" height={230} sx={{ mt: 3 }} /><Skeleton variant="rounded" height={260} sx={{ mt: 3 }} /></Box>;
}

export function ErrorState({ error, onRetry }) {
  const { t } = useApp();
  return <Card><EmptyState title={t('loadError')} description={errorMessage(error)} action={<Button onClick={onRetry} variant="outlined" startIcon={<RefreshRounded />}>{t('retry')}</Button>} /></Card>;
}

export function ConfirmDialog({ open, title, message, onConfirm, onClose, loading, color = 'primary', children, confirmLabel }) {
  const { t } = useApp();
  return <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth><DialogTitle>{title || t('confirmAction')}</DialogTitle><DialogContent>{message && <DialogContentText sx={{ fontSize: '.87rem' }}>{message}</DialogContentText>}{children}</DialogContent><DialogActions><Button data-pitch="dialog-cancel" disabled={loading} onClick={onClose}>{t('cancel')}</Button><Button data-pitch="dialog-confirm" disabled={loading} onClick={onConfirm} color={color} variant="contained" startIcon={loading ? <CircularProgress size={15} color="inherit" /> : null}>{confirmLabel || t('confirm')}</Button></DialogActions></Dialog>;
}

export function SlaBadge({ ticket, now }) {
  const { t, now: applicationTime } = useApp();
  if (['Resolved', 'Closed'].includes(ticket.status)) return <Chip label={t('completed')} size="small" icon={<CheckRounded />} color="success" variant="outlined" />;
  const hours = (new Date(ticket.due_at).getTime() - Math.max(now || 0, applicationTime)) / 3600000;
  const label = hours < 0 ? `${Math.ceil(Math.abs(hours))}h ${t('overdue')}` : `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m ${t('remaining')}`;
  return <Chip size="small" icon={<ScheduleRounded sx={{ fontSize: '14px !important' }} />} label={label} sx={{ bgcolor: hours < 0 ? '#fff0ee' : hours < 6 ? '#fff6e5' : '#edf4f8', color: hours < 0 ? '#be4545' : hours < 6 ? '#ac7018' : '#4a6c80', '.MuiChip-icon': { color: 'inherit' } }} />;
}

export function InlineError({ error }) { return error ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(error)}</Alert> : null; }
export function ViewAllButton({ onClick, label }) { const { t } = useApp(); return <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />} onClick={onClick}>{label || t('viewAll')}</Button>; }

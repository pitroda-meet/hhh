import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { FastForwardOutlined } from '@mui/icons-material';
import { adminService } from '../services/adminService.js';
import { useApp } from '../context/appContext.js';
import { errorMessage, formatDateTime } from '../utils/format.js';

export default function SimulateTimeButton() {
  const { t, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const simulate = async () => { setBusy(true); setError(null); try { const { data } = await adminService.simulateTime(hours); setResult(data); toast(`${data.escalated_count} ticket${data.escalated_count === 1 ? '' : 's'} escalated. Relevant staff and students notified.`); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  return <>
    <Button variant="outlined" startIcon={<FastForwardOutlined sx={{ fontSize: 19 }} />} onClick={() => { setOpen(true); setResult(null); setError(null); }} sx={{ bgcolor: '#fff' }} data-testid="simulate-time">{t('simulateTime')}</Button>
    <Dialog open={open} onClose={busy ? undefined : () => setOpen(false)} maxWidth="sm" fullWidth><DialogTitle>{t('simulateTime')}</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 3 }}>{t('simulateHint')}</Typography>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}{result ? <Box><Alert severity="success">{result.escalated_count} overdue tickets escalated. Notifications and status histories have been updated.</Alert><Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Demo time: {formatDateTime(result.current_time)} · +{result.time_offset_hours}h from real time</Typography></Box> : <TextField fullWidth select label={t('hoursAdvance')} value={hours} onChange={(e) => setHours(e.target.value)}>{[24, 48, 72, 168].map((value) => <MenuItem key={value} value={value}>{value} hours</MenuItem>)}</TextField>}</DialogContent><DialogActions><Button onClick={() => setOpen(false)} disabled={busy}>{t(result ? 'close' : 'cancel')}</Button>{!result && <Button variant="contained" onClick={simulate} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <FastForwardOutlined />} data-testid="advance-clock">{t('advanceClock')}</Button>}</DialogActions></Dialog>
  </>;
}

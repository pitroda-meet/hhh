import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { RestartAltRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/appContext.js';
import { adminService } from '../services/adminService.js';
import { errorMessage } from '../utils/format.js';

export default function DemoMode() {
  const { setUser, setLanguage, toast } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(() => localStorage.getItem('sahay.demoMode') === 'true');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const listener = (event) => { if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') { event.preventDefault(); setOpen((value) => !value); } };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const reset = async () => {
    setBusy(true); setError(null);
    try { const { data } = await adminService.resetDemo(); localStorage.setItem('sahay.demoMode', 'true'); setEnabled(true); setUser(data.user); setLanguage('en'); setOpen(false); navigate(data.user ? `/${data.user.role}` : '/login'); toast('Demo reset: 25 tickets, 30 approved FAQs, 16 users. Ready to record.'); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <>
    {enabled && <Chip size="small" label="DEMO MODE · Ctrl ⇧ D" onClick={() => setOpen(true)} sx={{ position: 'fixed', bottom: 8, left: 8, zIndex: 1250, height: 20, fontSize: 8, letterSpacing: '.6px', color: '#897358', bgcolor: '#fff6e7', border: '1px solid #f0e3cb', opacity: .9 }} />}
    <Dialog open={open} onClose={busy ? undefined : () => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Recording studio <Box component="span" sx={{ color: '#bc8b4f', fontSize: 12, ml: 1 }}>DEMO MODE</Box></DialogTitle><DialogContent>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Typography color="text.secondary" sx={{ mb: 2.5 }}>Reset to a clean, realistic institute dataset for your five-minute presentation. Your current role is kept, the clock is reset, and the next ticket is ITI-2026-00125.</Typography><Alert severity="warning" sx={{ mb: 3 }}>Reset replaces all locally created users, tickets, conversations, feedback and edits with the original demo data.</Alert><Stack spacing={1.5}>{['Student → Gujarati scholarship question → approved FAQ', 'Student → Hindi examination registration issue → confirm ticket', 'Staff → open the new ticket → reply → resolve → suggest FAQ', 'Student → notification → timeline → five-star feedback', 'Admin → review a suggested FAQ → approve & publish → AI logs', 'Principal → analytics → simulate 24 hours → escalations'].map((step, i) => <Stack direction="row" spacing={1.2} key={step}><Typography variant="caption" sx={{ width: 20, height: 20, bgcolor: '#edf3f7', borderRadius: '50%', textAlign: 'center', lineHeight: '20px', flexShrink: 0 }}>{i + 1}</Typography><Typography variant="body2">{step}</Typography></Stack>)}</Stack></DialogContent><DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>{enabled && <Button onClick={() => { localStorage.setItem('sahay.demoMode', 'false'); setEnabled(false); setOpen(false); }} disabled={busy}>Hide demo mode</Button>}<Button onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button variant="contained" color="secondary" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <RestartAltRounded />} onClick={reset} disabled={busy}>Reset & start demo</Button></DialogActions></Dialog>
  </>;
}

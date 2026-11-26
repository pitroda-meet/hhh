import { useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useApp } from '../context/appContext.js';
import { useAsync } from '../hooks/useAsync.js';
import { adminService } from '../services/adminService.js';
import { ticketService } from '../services/ticketService.js';
import { errorMessage } from '../utils/format.js';
import { extractValidationErrors, validateReassign } from '../utils/validation.js';

export default function ReassignDialog({ ticket, open, onClose, onSaved }) {
  return open && ticket ? <ReassignForm key={ticket.id} ticket={ticket} onClose={onClose} onSaved={onSaved} /> : null;
}

function ReassignForm({ ticket, onClose, onSaved }) {
  const { t, toast } = useApp();
  const [form, setForm] = useState({ department_id: ticket.department_id, staff_id: '', note: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const refs = useAsync(adminService.getReferenceData, []);

  const submit = async (event) => {
    event.preventDefault();
    const check = validateReassign(form);
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
      const { data } = await ticketService.forwardTicket(ticket.id, form);
      toast(`Assigned to ${data.assigned_staff?.name || data.department.name}.`, 'success');
      onSaved?.(data);
      onClose();
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
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>{t('reassign')} · {ticket?.ticket_number}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('forwardHint')}</Typography>
          {(error || refs.error) && <Alert severity="error" sx={{ mb: 2 }}>{error || errorMessage(refs.error)}</Alert>}
          <Stack spacing={2.5}>
            <TextField
              select
              required
              label={t('department')}
              value={form.department_id}
              onChange={(event) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, department_id: value, staff_id: '' }));
                if (fieldErrors.department_id) setFieldErrors((p) => ({ ...p, department_id: undefined }));
              }}
              error={Boolean(fieldErrors.department_id)}
              helperText={fieldErrors.department_id}
              disabled={refs.loading}
            >
              {refs.data?.departments.filter((d) => d.active).map((d) => <MenuItem key={d.id} value={d.id}>{t(d.name)}</MenuItem>)
                || <MenuItem value={ticket?.department_id || ''}>{ticket?.department?.name || 'Loading…'}</MenuItem>}
            </TextField>
            <TextField
              select
              label={t('assignedTo')}
              value={form.staff_id}
              onChange={(event) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, staff_id: value }));
              }}
            >
              <MenuItem value="">{t(refs.data?.routing_strategy === 'round_robin' ? 'round_robin' : 'automaticAssignment')}</MenuItem>
              {refs.data?.staff.filter((s) => s.active && s.department_ids.includes(Number(form.department_id))).map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              required
              label={t('reason')}
              multiline
              minRows={3}
              value={form.note}
              onChange={(event) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, note: value }));
                if (fieldErrors.note) setFieldErrors((p) => ({ ...p, note: undefined }));
              }}
              error={Boolean(fieldErrors.note)}
              helperText={fieldErrors.note}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>{t('cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || refs.loading || !form.department_id} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
            {t('reassign')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

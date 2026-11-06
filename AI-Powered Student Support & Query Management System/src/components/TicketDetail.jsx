import { useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { ArrowBackRounded, AttachFileRounded, AutoAwesomeRounded, CheckCircleOutlineRounded, FlagOutlined, ForwardToInboxOutlined, MenuBookOutlined, SendRounded, StarRounded } from '@mui/icons-material';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/appContext.js';
import { useAsync } from '../hooks/useAsync.js';
import { ticketService } from '../services/ticketService.js';
import { faqService } from '../services/faqService.js';
import { downloadMockAttachment, errorMessage, formatDateTime, initials } from '../utils/format.js';
import { PRIORITIES, STATUSES, STATUS_STYLES } from '../utils/constants.js';
import { ConfirmDialog, EmptyState, ErrorState, LoadingPage, PriorityChip, SectionTitle, SlaBadge, StatusChip } from './ui.jsx';
import AttachmentInput from './AttachmentInput.jsx';
import ReassignDialog from './ReassignDialog.jsx';
import FeedbackForm from './FeedbackForm.jsx';

function Attachments({ items, number }) {
  return items?.length > 0 && <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>{items.map((file, i) => <Chip key={`${file.name}-${i}`} label={file.name} icon={<AttachFileRounded sx={{ fontSize: 14 }} />} size="small" variant="outlined" onClick={() => downloadMockAttachment(file, number)} sx={{ maxWidth: 240, color: '#537c95', borderColor: '#d9e4eb' }} />)}</Stack>;
}

export default function TicketDetail() {
  const { id } = useParams();
  const { user, t, revision, toast } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: ticket, loading, error, reload } = useAsync(() => ticketService.getTicket(id), [id, user.id, revision]);
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [composeMode, setComposeMode] = useState('reply');
  const [ratingOpen, setRatingOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [nextStatus, setNextStatus] = useState(null);
  const [handover, setHandover] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestion, setSuggestion] = useState({ question: '', answer: '' });
  const [ratingDraft, setRating] = useState(null);
  const [feedbackDraft, setFeedback] = useState(null);
  const rating = ratingDraft ?? ticket?.rating ?? 0;
  const feedback = feedbackDraft ?? ticket?.feedback ?? '';
  const student = user.role === 'student';
  const backPath = student ? '/student/queries' : user.role === 'staff' ? '/staff/inbox' : `/${user.role}/tickets`;
  const perform = async (action, success) => { setBusy(true); setActionError(null); try { const result = await action(); if (success) toast(success); return result; } catch (reason) { setActionError(errorMessage(reason)); return null; } finally { setBusy(false); } };
  const sendReply = async (event) => {
    event.preventDefault();
    const noteMode = composeMode === 'note';
    const result = await perform(() => noteMode ? ticketService.addInternalNote(id, internalNote) : ticketService.replyToTicket(id, { message: reply, attachments }), t(noteMode ? 'internalNoteSaved' : 'replySent'));
    if (result) { if (noteMode) setInternalNote(''); else { setReply(''); setAttachments([]); } }
  };
  const changeStatus = async () => { const result = await perform(() => ticketService.updateTicketStatus(id, nextStatus), `${t('status')}: ${t(nextStatus)}`); if (result) setNextStatus(null); };
  const sendFeedback = async () => { const result = await perform(() => ticketService.rateTicket(id, { rating, feedback }), t('feedbackThanks')); if (result) setRatingOpen(false); };
  const openSuggestion = () => { const latestReply = [...ticket.replies].reverse().find((r) => r.user_id !== ticket.student_id); setSuggestion({ question: ticket.subject, answer: latestReply?.message || '' }); setSuggestOpen(true); setActionError(null); };
  const submitSuggestion = async (event) => { event.preventDefault(); const result = await perform(() => faqService.suggestFaq(id, suggestion), 'FAQ suggestion sent to the administrator for review.'); if (result) setSuggestOpen(false); };
  if (error) return <><Button component={Link} to={backPath} startIcon={<ArrowBackRounded />} sx={{ mb: 2 }}>{t('back')}</Button><ErrorState error={error} onRetry={reload} /></>;
  if (!ticket) return <LoadingPage />;
  const resolved = ['Resolved', 'Closed'].includes(ticket.status);
  const feedbackForm = <FeedbackForm rating={rating} feedback={feedback} setRating={setRating} setFeedback={setFeedback} onSubmit={sendFeedback} busy={busy} />;
  return <>
    <Button component={Link} to={backPath} size="small" startIcon={<ArrowBackRounded sx={{ fontSize: 16 }} />} sx={{ mb: 2, pl: 0, color: 'text.secondary' }}>{t(student ? 'myQueries' : user.role === 'staff' ? 'ticketInbox' : 'allTickets')}</Button>
    <Stack data-pitch-page={pathname} data-pitch-ready={String(!loading)} direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1.1} sx={{ mb: 1.2 }}>
          <Typography variant="overline" sx={{ color: '#5e8197', fontSize: '.72rem', letterSpacing: '.7px' }}>{ticket.ticket_number}</Typography>
          <StatusChip status={ticket.status} /><PriorityChip priority={ticket.priority} />
        </Stack>
        <Typography variant="h2" sx={{ fontSize: { xs: '1.35rem', md: '1.7rem' }, maxWidth: 780 }}>{ticket.subject}</Typography>
        <Stack direction="row" spacing={1.3} alignItems="center" sx={{ mt: 1.2 }}>
          <Typography variant="caption" color="text.secondary">{t('created')} {formatDateTime(ticket.created_at)}</Typography>
          {ticket.source === 'ai' && <Chip size="small" label={t('aiAssistant')} icon={<AutoAwesomeRounded sx={{ fontSize: '12px !important' }} />} sx={{ height: 21, color: '#b57948', bgcolor: '#fff3e8', fontSize: '.61rem', '.MuiChip-icon': { color: 'inherit' } }} />}
        </Stack>
      </Box>
      {!student && <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
        {['staff', 'admin'].includes(user.role) && <Button data-pitch="suggest-faq" variant="outlined" onClick={openSuggestion} startIcon={<MenuBookOutlined sx={{ fontSize: 17 }} />}>{t('suggestFaq')}</Button>}
        {!resolved && <Button variant="contained" onClick={() => setNextStatus('Resolved')} startIcon={<CheckCircleOutlineRounded sx={{ fontSize: 17 }} />} data-testid="resolve-ticket">{t('Resolved')}</Button>}
      </Stack>}
    </Stack>
    {loading && <LinearProgress sx={{ height: 2, mb: 2 }} />}
    {actionError && !suggestOpen && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}
    <Grid container spacing={3}><Grid item xs={12} lg={8}>
      <Card data-pitch="ticket-description" sx={{ mb: 3 }}><CardContent><SectionTitle title={t('description')} /><Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '.86rem', color: '#465e70', lineHeight: 1.9, overflowWrap: 'anywhere' }}>{ticket.description}</Typography><Attachments items={ticket.attachments} number={ticket.ticket_number} /></CardContent></Card>
      <Card><CardContent><SectionTitle title={t('conversation')} action={<Chip label={`${ticket.replies.length} ${t('actions').toLowerCase()}`} size="small" sx={{ bgcolor: '#f3f6f9', color: 'text.secondary', fontSize: '.63rem' }} />} />
        {!ticket.replies.length && <EmptyState compact title={t('notYet')} description={t('routingStep3')} />}
        <Stack spacing={2.5}>{ticket.replies.map((message) => <Stack key={message.id} direction="row" spacing={1.4}><Avatar sx={{ width: 33, height: 33, bgcolor: message.user_id === ticket.student_id ? '#f3e9dd' : '#e7f0f5', color: message.user_id === ticket.student_id ? '#a0825e' : '#507c94', fontSize: 11 }}>{initials(message.user?.name)}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"><Typography variant="subtitle2">{message.user?.name || t('staff')}</Typography><Typography variant="caption" sx={{ fontSize: '.59rem', bgcolor: '#f3f6f9', color: 'text.secondary', px: .7, borderRadius: 1 }}>{t(message.user?.role || 'staff')}</Typography><Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontSize: '.64rem' }}>{formatDateTime(message.created_at)}</Typography></Stack><Box sx={{ mt: .8, bgcolor: message.user_id === ticket.student_id ? '#f9fafb' : '#f1f6fa', p: 2, borderRadius: '0 12px 12px 12px', border: '1px solid #eaf0f4' }}><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.85 }}>{message.message}</Typography><Attachments items={message.attachments} number={ticket.ticket_number} /></Box></Box></Stack>)}</Stack>
      </CardContent>
      {ticket.status !== 'Closed' && <Box component="form" onSubmit={sendReply} sx={{ p: 3, borderTop: '1px solid #e8edf2', bgcolor: composeMode === 'note' ? '#fffbf3' : '#fcfdfe' }}>
        {!student && <Tabs value={composeMode} onChange={(_, value) => setComposeMode(value)} sx={{ mb: 2 }}><Tab data-pitch="reply-tab" value="reply" label={t('replyToStudent')} /><Tab data-pitch="internal-note-tab" value="note" label={t('internalNotes')} /></Tabs>}
        {composeMode === 'note' && <>
          <Alert severity="info" sx={{ mb: 2 }}>{t('internalNotesHint')}</Alert>
          {ticket.internal_notes?.map((note) => <Box key={note.id} sx={{ mb: 2, p: 1.5, bgcolor: '#fff7e7', borderRadius: 2 }}><Typography variant="subtitle2">{note.user?.name}</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{note.message}</Typography></Box>)}
        </>}
        {resolved && composeMode === 'reply' && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>A new reply will reopen this ticket so your department can follow up.</Typography>}
        <TextField data-pitch={composeMode === 'note' ? 'internal-note-input' : 'reply-input'} value={composeMode === 'note' ? internalNote : reply} onChange={(event) => composeMode === 'note' ? setInternalNote(event.target.value) : setReply(event.target.value)} label={t(composeMode === 'note' ? 'internalNotePlaceholder' : 'replyPlaceholder')} fullWidth multiline minRows={3} inputProps={{ maxLength: 5000 }} disabled={busy} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>{composeMode === 'reply' ? <AttachmentInput compact value={attachments} onChange={setAttachments} disabled={busy} /> : <Box />}<Button data-pitch="send-ticket-message" type="submit" variant="contained" startIcon={busy ? <CircularProgress size={15} color="inherit" /> : <SendRounded sx={{ fontSize: 16 }} />} disabled={busy || (composeMode === 'note' ? !internalNote.trim() : !reply.trim() && !attachments.length)}>{t(composeMode === 'note' ? 'addInternalNote' : 'sendReply')}</Button></Stack>
      </Box>}
      </Card>
      {student && resolved && <Card data-pitch="feedback-card" sx={{ mt: 3, bgcolor: '#fffcf7', borderColor: '#efe5d4' }}><CardContent><Stack direction="row" spacing={1.4} alignItems="center"><Avatar sx={{ bgcolor: '#fff1d6', color: '#c99943' }}><StarRounded /></Avatar><Box><Typography variant="h5">{t('resolutionFeedback')}</Typography><Typography variant="body2" color="text.secondary">{t('feedbackHint')}</Typography></Box></Stack>{ticket.rating && <Alert severity="success" sx={{ mt: 2 }}>{t('feedbackThanks')}</Alert>}<Button data-pitch="open-rating" onClick={() => setRatingOpen(true)} size="small" sx={{ mt: 1.5 }}>{t('openRatingForm')}</Button>{!ratingOpen && feedbackForm}</CardContent></Card>}
    </Grid><Grid item xs={12} lg={4}>
      <Card sx={{ mb: 3 }}><CardContent><SectionTitle title={t('ticketDetails')} /><Stack spacing={2.1}>{[[t('category'), t(ticket.category?.name || 'General')], [t('department'), t(ticket.department?.name || 'Administration')], [t('assignedTo'), ticket.assigned_staff?.name || t('notYet')]].map(([label, value]) => <Box key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="subtitle2" sx={{ mt: .3 }}>{value}</Typography></Box>)}<Divider /><Box><Typography variant="caption" color="text.secondary" display="block" sx={{ mb: .7 }}>{t('sla')}</Typography><SlaBadge ticket={ticket} now={ticket.now} /></Box><Box><Typography variant="caption" color="text.secondary">{t('responseTime')}</Typography><Typography variant="body2" fontWeight={600}>{ticket.first_response_at ? `${((new Date(ticket.first_response_at) - new Date(ticket.created_at)) / 3600000).toFixed(1)}h` : t('notYet')}</Typography></Box></Stack>
      {!student && <><Divider sx={{ my: 2.5 }} /><Stack spacing={2}><TextField data-pitch="ticket-status" select fullWidth label={t('changeStatus')} value={ticket.status} onChange={(event) => setNextStatus(event.target.value)} disabled={busy}>{STATUSES.map((status) => <MenuItem key={status} value={status}>{t(status)}</MenuItem>)}</TextField><TextField data-pitch="ticket-priority" select fullWidth label={t('priority')} value={ticket.priority} onChange={(event) => perform(() => ticketService.updatePriority(id, event.target.value), t('recordSaved'))} disabled={busy}>{PRIORITIES.map((priority) => <MenuItem key={priority} value={priority}>{t(priority)}</MenuItem>)}</TextField></Stack><Stack spacing={1.2} sx={{ mt: 2 }}><Button data-pitch="forward-ticket" variant="outlined" startIcon={<ForwardToInboxOutlined sx={{ fontSize: 17 }} />} onClick={() => setHandover(true)} disabled={resolved}>{t('forward')}</Button><Button data-pitch="escalate-ticket" color="error" startIcon={<FlagOutlined sx={{ fontSize: 17 }} />} onClick={() => setNextStatus('Escalated')} disabled={resolved || ticket.status === 'Escalated'}>{t('escalate')}</Button></Stack></>}
      </CardContent></Card>
      {!student && <Card sx={{ mb: 3 }}><CardContent><SectionTitle title={t('studentInfo')} /><Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ bgcolor: '#f3e9dc', color: '#9b7b53' }}>{initials(ticket.student?.name)}</Avatar><Box><Typography variant="subtitle2">{ticket.student?.name}</Typography><Typography variant="caption" color="text.secondary">{ticket.student?.enrollment_number}</Typography></Box></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{ticket.student?.trade} · {ticket.student?.year}<br />{ticket.student?.institute}<br />{ticket.student?.email}</Typography></CardContent></Card>}
      <Card data-pitch="ticket-timeline"><CardContent><SectionTitle title={t('timeline')} /><Stack>{ticket.history.map((event, i) => <Stack key={event.id} direction="row" spacing={1.5} sx={{ pb: i === ticket.history.length - 1 ? 0 : 2.8 }}><Box sx={{ width: 13, position: 'relative', flexShrink: 0, pt: .5 }}>{i < ticket.history.length - 1 && <Box sx={{ width: 1, bgcolor: '#e0e9ef', position: 'absolute', left: 4, top: 15, bottom: -4 }} />}<Box sx={{ width: 9, height: 9, bgcolor: STATUS_STYLES[event.status]?.color || '#6c8598', borderRadius: '50%' }} /></Box><Box sx={{ minWidth: 0 }}><Typography variant="subtitle2" sx={{ fontSize: '.76rem' }}>{t(event.status)}</Typography><Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .4, lineHeight: 1.8 }}>{event.note}</Typography><Typography sx={{ fontSize: '.61rem', color: '#93a3af', mt: .6 }}>{formatDateTime(event.created_at)} · {event.actor?.name || 'Sahay'}</Typography></Box></Stack>)}</Stack></CardContent></Card>
    </Grid></Grid>
    <ReassignDialog ticket={ticket} open={handover} onClose={() => setHandover(false)} onSaved={(data) => { if (user.role === 'staff' && !user.department_ids.includes(data.department_id)) navigate('/staff/inbox'); else reload(); }} />
    <ConfirmDialog open={Boolean(nextStatus)} title={`${t('changeStatus')}: ${t(nextStatus || ticket.status)}`} message={`Update ${ticket.ticket_number} to ${t(nextStatus || ticket.status)}? The student will be notified.`} onClose={() => setNextStatus(null)} onConfirm={changeStatus} loading={busy} color={nextStatus === 'Escalated' ? 'error' : 'primary'}>{actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}</ConfirmDialog>
    <Dialog open={suggestOpen} onClose={busy ? undefined : () => setSuggestOpen(false)} fullWidth maxWidth="sm"><form onSubmit={submitSuggestion}><DialogTitle>{t('suggestFaq')}</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Write a reusable answer without a student’s personal details. An administrator will review it and complete the Gujarati and Hindi translations before publication.</Typography>{actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}<Stack spacing={2.5}><TextField data-pitch="suggest-question" label={t('faqQuestion')} required value={suggestion.question} onChange={(e) => setSuggestion({ ...suggestion, question: e.target.value })} /><TextField data-pitch="suggest-answer" label={t('faqAnswer')} required multiline minRows={5} value={suggestion.answer} onChange={(e) => setSuggestion({ ...suggestion, answer: e.target.value })} /></Stack></DialogContent><DialogActions><Button data-pitch="dialog-cancel" onClick={() => setSuggestOpen(false)} disabled={busy}>{t('cancel')}</Button><Button data-pitch="submit-suggestion" type="submit" variant="contained" disabled={busy}>{t('suggestFaq')}</Button></DialogActions></form></Dialog>
    <Dialog open={ratingOpen} onClose={() => setRatingOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{t('resolutionFeedback')}</DialogTitle><DialogContent>{feedbackForm}</DialogContent><DialogActions><Button onClick={() => setRatingOpen(false)}>{t('close')}</Button></DialogActions></Dialog>
  </>;
}

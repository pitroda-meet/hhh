import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, Chip, CircularProgress, IconButton, InputBase, List, ListItemButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { AddRounded, ArrowForwardRounded, AutoAwesomeRounded, ChatBubbleOutlineRounded, CheckCircleOutlineRounded, DeleteOutlineRounded, HistoryRounded, LockOutlined, MenuBookOutlined, SchoolOutlined, SendRounded, SupportAgentRounded, TranslateRounded } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/appContext.js';
import { useAsync } from '../../hooks/useAsync.js';
import { chatService } from '../../services/chatService.js';
import { adminService } from '../../services/adminService.js';
import { errorMessage, formatDate } from '../../utils/format.js';
import { LANGUAGES } from '../../utils/constants.js';
import { BrandMark } from '../../components/Brand.jsx';
import ChatMessage from '../../components/ChatMessage.jsx';
import { ConfirmDialog, PageHeader } from '../../components/ui.jsx';

export default function ChatPage() {
  const { user, t, language, revision, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const [sessionDraft, setSession] = useState(null);
  const [input, setInput] = useState(params.get('question') || '');
  const [sending, setSending] = useState(false);
  const [optimistic, setOptimistic] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const sessions = useAsync(chatService.getSessions, [user.id, revision]);
  const refs = useAsync(adminService.getReferenceData, []);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const busyRef = useRef(false);
  const selectedId = params.get('session');
  const sessionRequest = useAsync(() => selectedId ? chatService.getSession(selectedId) : Promise.resolve({ data: null }), [selectedId, user.id]);
  const session = sessionDraft && (!selectedId || String(sessionDraft.id) === selectedId) ? sessionDraft : sessionRequest.data && String(sessionRequest.data.id) === selectedId ? sessionRequest.data : null;
  const loadingSession = Boolean(selectedId && !session && !sessionRequest.error);
  const displayError = error || (selectedId && sessionRequest.error ? errorMessage(sessionRequest.error) : null);
  useEffect(() => { if (scrollRef.current && (session?.messages.length || optimistic)) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [session?.messages.length, optimistic, sending]);

  const updateConversation = (data) => { setSession(data); setParams({ session: data.id }, { replace: true }); };
  const send = async (text = input, action) => {
    const message = text.trim();
    if (!message || busyRef.current || loadingSession) return;
    busyRef.current = true; setSending(true); setError(null); setInput('');
    setOptimistic({ id: 'pending-user', role: 'user', content: message, language, created_at: new Date().toISOString() });
    try {
      let activeSession = session;
      if (!activeSession) { const result = await chatService.createSession(language); activeSession = result.data; setSession(activeSession); }
      const { data } = await chatService.sendMessage({ session_id: activeSession.id, message, action });
      updateConversation(data.session);
    } catch (reason) { setError(errorMessage(reason)); setInput(message); }
    finally { setOptimistic(null); setSending(false); busyRef.current = false; inputRef.current?.focus(); }
  };
  const confirmTicket = async (messageId, confirmed) => {
    if (busyRef.current) return;
    busyRef.current = true; setSending(true); setError(null);
    try { const { data } = await chatService.confirmTicket(session.id, messageId, confirmed); updateConversation(data.session); if (data.ticket) toast(`${data.ticket.ticket_number} · ${data.ticket.assigned_staff?.name || data.ticket.department.name}`); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setSending(false); busyRef.current = false; }
  };
  const feedback = async (messageId, value) => {
    try { await chatService.setMessageFeedback(messageId, value); setSession({ ...session, messages: session.messages.map((message) => message.id === messageId ? { ...message, feedback: value } : message) }); toast(value === 'up' ? t('feedbackThanks') : 'Thanks for letting us know. You can request a staff member below.'); }
    catch (reason) { toast(errorMessage(reason), 'error'); }
  };
  const newConversation = () => { if (busyRef.current) return; setSession(null); setParams({}); setInput(''); setError(null); setHistoryOpen(false); inputRef.current?.focus(); };
  const removeSession = async () => { try { await chatService.deleteSession(deleteId); if (session?.id === deleteId) newConversation(); setDeleteId(null); } catch (reason) { toast(errorMessage(reason), 'error'); } };
  const suggestions = [
    { key: 'suggestGujarati', icon: AutoAwesomeRounded, color: '#be824e', label: 'ગુજરાતી', text: t('suggestGujarati') },
    { key: 'suggestHindi', icon: SchoolOutlined, color: '#5f87a4', label: 'हिन्दी', text: t('suggestHindi') },
    { key: 'suggestExam', icon: MenuBookOutlined, color: '#927cac', label: 'Examination', text: t('suggestExam') },
    { key: 'suggestWorkshop', icon: ChatBubbleOutlineRounded, color: '#609984', label: 'Workshop', text: t('suggestWorkshop') },
  ];
  const detectedLanguage = LANGUAGES.find((item) => item.code === (session?.language || language));
  const hasMessages = session?.messages.some((message) => message.role === 'user') || optimistic;
  return <>
    <PageHeader ready={!loadingSession && !refs.loading && !sessions.loading} title={t('chatTitle')} subtitle={t('chatSubtitle')} action={<Chip icon={<LockOutlined sx={{ fontSize: '12px !important' }} />} label={t('conversationSaved')} variant="outlined" sx={{ display: { xs: 'none', md: 'flex' }, borderColor: '#dde7ef', color: '#8396a4', fontSize: '.62rem' }} />} />
    <Card data-pitch="chat-shell" sx={{ display: 'flex', height: { xs: 'calc(100dvh - 236px)', md: 'calc(100vh - 220px)' }, minHeight: 570, maxHeight: 920, position: 'relative' }}>
      <Box sx={{ width: { xs: 220, xl: 245 }, flexShrink: 0, bgcolor: '#fafcfd', borderRight: '1px solid #e6edf3', display: { xs: historyOpen ? 'flex' : 'none', lg: 'flex' }, flexDirection: 'column', position: { xs: 'absolute', lg: 'relative' }, inset: { xs: '0 auto 0 0', lg: 'auto' }, zIndex: 3, boxShadow: { xs: historyOpen ? '10px 0 30px #0b39541c' : 'none', lg: 'none' } }}>
        <Box sx={{ p: 2.2 }}><Button fullWidth variant="outlined" startIcon={<AddRounded sx={{ fontSize: 17 }} />} onClick={newConversation} disabled={sending} sx={{ bgcolor: '#fff', py: 1, fontSize: '.73rem', borderColor: '#dce6ed' }}>{t('newChat')}</Button></Box>
        <Typography variant="overline" sx={{ px: 2.5, color: '#9aaab5', fontSize: '.57rem', letterSpacing: 1 }}>{t('chatHistory')}</Typography>
        <List sx={{ px: 1.3, mt: .5, flex: 1, overflowY: 'auto' }}>
          {sessions.loading && !sessions.data && [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={48} sx={{ m: 1 }} />)}
          {sessions.data?.map((item) => <Stack key={item.id} direction="row" alignItems="center" sx={{ mb: .8, borderRadius: 2, bgcolor: session?.id === item.id ? '#eaf1f6' : 'transparent', '&:hover .delete-session': { opacity: 1 } }}><ListItemButton disabled={sending} onClick={() => { setParams({ session: item.id }); setHistoryOpen(false); }} sx={{ py: 1.3, px: 1.2, borderRadius: 2, minWidth: 0 }}><ChatBubbleOutlineRounded sx={{ fontSize: 16, color: '#7995a7', mr: 1.1 }} /><Box sx={{ minWidth: 0 }}><Typography variant="caption" noWrap sx={{ fontSize: '.68rem', color: '#587287', display: 'block', fontWeight: session?.id === item.id ? 650 : 500 }}>{item.title}</Typography><Typography sx={{ fontSize: 9, color: '#a0b0bb', mt: .3 }}>{formatDate(item.updated_at)}</Typography></Box></ListItemButton><IconButton className="delete-session" size="small" aria-label={`Delete conversation ${item.title}`} onClick={() => setDeleteId(item.id)} disabled={sending} sx={{ opacity: { xs: 1, lg: 0 }, mr: .3, color: '#9aaeba' }}><DeleteOutlineRounded sx={{ fontSize: 14 }} /></IconButton></Stack>)}
          {sessions.data?.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.2, mt: 2, lineHeight: 1.9 }}>{t('noChatHistory')}</Typography>}
        </List>
        <Box sx={{ p: 2.3, borderTop: '1px solid #e8eef3' }}><Stack direction="row" alignItems="center" spacing={.8}><CheckCircleOutlineRounded sx={{ color: '#75a68f', fontSize: 16 }} /><Typography variant="caption" sx={{ fontSize: '.64rem', fontWeight: 600, color: '#668478' }}>{t('approvedAnswers')}</Typography></Stack><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .8, fontSize: '.6rem', lineHeight: 1.9 }}>{t('languageSupport')}</Typography></Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
        <Stack direction="row" alignItems="center" spacing={1.2} sx={{ px: { xs: 1.5, sm: 3 }, py: 1.8, borderBottom: '1px solid #e8eef3', flexShrink: 0 }}><IconButton onClick={() => setHistoryOpen(!historyOpen)} sx={{ display: { lg: 'none' }, color: '#7d95a6' }} aria-label="Chat history"><HistoryRounded sx={{ fontSize: 20 }} /></IconButton><Box sx={{ position: 'relative' }}><BrandMark size={37} /><Box sx={{ width: 8, height: 8, border: '2px solid #fff', bgcolor: '#58a880', borderRadius: '50%', position: 'absolute', bottom: 1, right: -1 }} /></Box><Box><Typography variant="subtitle2" sx={{ fontSize: '.85rem' }}>{t('appName')} <Box component="span" sx={{ color: '#95a8b6', fontWeight: 400, fontSize: '.71rem', ml: .6 }}>AI</Box></Typography><Typography sx={{ fontSize: '.62rem', color: '#77a18e', mt: .15 }}>{t('aiOnline')}</Typography></Box><Box sx={{ flex: 1 }} /><Tooltip title={t('autoDetect')}><Chip icon={<TranslateRounded sx={{ fontSize: '13px !important' }} />} label={detectedLanguage?.label} size="small" sx={{ bgcolor: '#f1f5f8', color: '#7690a2', fontSize: '.62rem', '.MuiChip-icon': { color: 'inherit' } }} /></Tooltip></Stack>
        <Box ref={scrollRef} role="log" aria-live="polite" aria-label="Chat conversation" sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 2, sm: 3 }, bgcolor: hasMessages ? '#fafcfe' : '#fff' }}>
          {loadingSession ? <Stack spacing={3} sx={{ p: 2 }}><Skeleton variant="rounded" height={100} width="75%" /><Skeleton variant="rounded" height={65} width="60%" sx={{ alignSelf: 'flex-end' }} /><Skeleton variant="rounded" height={140} width="80%" /></Stack> : !hasMessages ? <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '100%', maxWidth: 600, mx: 'auto', py: 2, textAlign: 'center' }}>
            <Box sx={{ position: 'relative', mb: 2.5 }}><Box sx={{ width: 82, height: 82, borderRadius: '26px', bgcolor: '#fff5ec', display: 'grid', placeItems: 'center', transform: 'rotate(-7deg)' }}><AutoAwesomeRounded sx={{ color: '#e3965e', fontSize: 37, transform: 'rotate(7deg)' }} /></Box><Box sx={{ position: 'absolute', top: -8, right: -8, width: 14, height: 14, borderRadius: '50%', bgcolor: '#edf4ed' }} /><Box sx={{ position: 'absolute', bottom: 0, left: -13, width: 8, height: 8, borderRadius: '50%', bgcolor: '#e6eef7' }} /></Box>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.65rem', md: '1.9rem' } }}>{t('chatWelcomeTitle')}</Typography><Typography color="text.secondary" sx={{ mt: 1.2, fontSize: '.81rem', lineHeight: 1.9, whiteSpace: 'pre-line' }}>{t('chatWelcomeSubtitle')}</Typography>
            <Typography variant="overline" sx={{ mt: 3.5, mb: 1.5, color: '#a4b2bd', fontSize: '.55rem', letterSpacing: 1.4 }}>{t('suggestedQuestions')}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2, width: '100%', maxWidth: 550 }}>{suggestions.map((suggestion) => <Button key={suggestion.key} onClick={() => send(suggestion.text)} disabled={sending} data-testid={suggestion.key} variant="outlined" sx={{ display: 'flex', gap: 1.1, p: 1.5, borderColor: '#e4ebf1', textAlign: 'left', justifyContent: 'flex-start', bgcolor: '#fff', borderRadius: '10px', alignItems: 'flex-start', '&:hover': { bgcolor: '#f9fbfc', borderColor: '#c8dbe7' } }}><suggestion.icon sx={{ fontSize: 18, color: suggestion.color, mt: .2, flexShrink: 0 }} /><Box><Typography sx={{ fontSize: '.71rem', fontWeight: 550, color: '#566f81', lineHeight: 1.8 }}>{suggestion.text}</Typography></Box><ArrowForwardRounded sx={{ fontSize: 13, color: '#b0c0ca', ml: 'auto', flexShrink: 0, mt: .5 }} /></Button>)}</Box>
          </Stack> : <>{session?.messages.map((message) => <ChatMessage key={message.id} message={message} onConfirm={confirmTicket} onFeedback={feedback} busy={sending} references={refs.data} />)}{optimistic && <ChatMessage message={optimistic} />}{sending && <Stack direction="row" spacing={1.3} alignItems="center" sx={{ mb: 2 }}><BrandMark size={30} /><Box sx={{ display: 'flex', alignItems: 'center', gap: .6, bgcolor: '#fff', border: '1px solid #e4ecf2', borderRadius: '0 12px 12px', px: 2, py: 1.9 }}>{[0, 1, 2].map((i) => <Box key={i} className="typing-dot" sx={{ width: 5, height: 5, bgcolor: '#86a4b6', borderRadius: '50%' }} />)}</Box><Typography variant="caption" sx={{ fontSize: '.61rem', color: '#97a9b5' }}>{t('typing')}</Typography></Stack>}</>}
        </Box>
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 1.5, pb: 1.4, borderTop: '1px solid #eef2f5', flexShrink: 0 }}>
          {displayError && <Alert severity="error" onClose={() => { setError(null); if (sessionRequest.error) newConversation(); }} sx={{ mb: 1.5 }}>{displayError}</Alert>}
          {hasMessages && !session?.context.pending_ticket && <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>{[t('suggestScholarship'), t('suggestWorkshop')].map((text) => <Chip key={text} label={text} size="small" clickable disabled={sending} onClick={() => send(text)} sx={{ bgcolor: '#fff', border: '1px solid #e2eaf0', color: '#7992a4', fontSize: '.6rem', height: 25 }} />)}</Stack>}
          <Box component="form" onSubmit={(event) => { event.preventDefault(); send(); }} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, p: .9, pl: 1.6, bgcolor: '#f9fbfc', border: '1px solid #dbe6ee', borderRadius: '12px', '&:focus-within': { borderColor: '#7fa1b7', boxShadow: '0 0 0 3px #eaf1f6' } }}><InputBase value={input} onChange={(event) => setInput(event.target.value)} inputRef={inputRef} multiline maxRows={4} placeholder={t('chatPlaceholder')} inputProps={{ 'aria-label': t('chatPlaceholder'), maxLength: 3000, 'data-testid': 'chat-input' }} disabled={sending || loadingSession} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} sx={{ flex: 1, fontSize: '.8rem', py: .55 }} /><Tooltip title={t('send')}><span><IconButton type="submit" disabled={!input.trim() || sending || loadingSession} aria-label={t('send')} sx={{ bgcolor: '#0b3954', color: '#fff', borderRadius: '8px', width: 34, height: 34, '&:hover': { bgcolor: '#164e6c' }, '&.Mui-disabled': { bgcolor: '#e5edf2', color: '#a0b4c2' } }}>{sending ? <CircularProgress size={16} color="inherit" /> : <SendRounded sx={{ fontSize: 17 }} />}</IconButton></span></Tooltip></Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: .9 }}><Typography sx={{ fontSize: '.54rem', color: '#a1b0bc', display: { xs: 'none', sm: 'block' } }}>{t('chatFootnote')}</Typography><Button startIcon={<SupportAgentRounded sx={{ fontSize: '13px !important' }} />} size="small" onClick={() => send(language === 'hi' ? 'कर्मचारी से बात करनी है' : language === 'gu' ? 'કર્મચારી સાથે વાત કરવી છે' : 'Talk to a human', 'request_human_support')} disabled={sending} sx={{ fontSize: '.6rem', color: '#7d95a6', py: .2, ml: 'auto' }}>{t('talkHuman')}</Button></Stack>
        </Box>
      </Box>
    </Card>
    <ConfirmDialog open={Boolean(deleteId)} title={t('delete')} message="Delete this conversation from this device? Any support tickets already created will remain in My Queries." onConfirm={removeSession} onClose={() => setDeleteId(null)} color="error" confirmLabel={t('delete')} />
  </>;
}

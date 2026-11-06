import { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, Chip, Grid, IconButton, InputAdornment, LinearProgress, Stack, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import { ArrowForwardRounded, AutoAwesomeRounded, ExpandMoreRounded, MenuBookOutlined, SearchRounded, ThumbDownAltOutlined, ThumbUpAltOutlined, VerifiedOutlined } from '@mui/icons-material';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/appContext.js';
import { useAsync, useDebouncedValue } from '../../hooks/useAsync.js';
import { faqService } from '../../services/faqService.js';
import { adminService } from '../../services/adminService.js';
import { EmptyState, ErrorState, PageHeader } from '../../components/ui.jsx';
import { errorMessage } from '../../utils/format.js';

export default function FaqPage() {
  const { user, t, language, revision, toast } = useApp();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [languageSelection, setLanguageSelection] = useState({ source: language, value: ['en', 'hi', 'gu'].includes(params.get('lang')) ? params.get('lang') : language });
  const faqLanguage = languageSelection.source === language ? languageSelection.value : language;
  const setFaqLanguage = (value) => setLanguageSelection({ source: language, value });
  const [expanded, setExpanded] = useState(Number(params.get('faq')) || false);
  const query = useDebouncedValue(search);
  const refs = useAsync(adminService.getReferenceData, [revision]);
  const faqs = useAsync(() => faqService.getFaqs({ search: query, category_id: category }), [query, category, revision]);
  const vote = async (id, value) => { try { await faqService.setFaqFeedback(id, value); toast(t('feedbackThanks')); } catch (error) { toast(errorMessage(error), 'error'); } };
  return <>
    <PageHeader ready={!faqs.loading && !refs.loading} eyebrow={t('verifiedKnowledge')} title={t('faqTitle')} subtitle={t('faqSubtitle')} />
    <Box sx={{ mb: 3, p: { xs: 2.5, sm: 3.5 }, bgcolor: '#eaf1f5', border: '1px solid #dce7ef', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 3 }}><Box sx={{ width: 53, height: 53, bgcolor: '#fff', borderRadius: '14px', color: '#5b8096', display: { xs: 'none', sm: 'grid' }, placeItems: 'center', flexShrink: 0 }}><MenuBookOutlined sx={{ fontSize: 26 }} /></Box><TextField fullWidth placeholder={t('searchFaqs')} value={search} onChange={(e) => setSearch(e.target.value)} inputProps={{ 'aria-label': t('searchFaqs') }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded sx={{ color: '#8aa0ae', fontSize: 22 }} /></InputAdornment> }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '11px' }, '& .MuiInputBase-input': { py: 1.8 } }} /></Box>
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card sx={{ p: 2.3 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{t('popularTopics')}</Typography>
          <Stack direction={{ xs: 'row', md: 'column' }} spacing={.7} sx={{ overflowX: { xs: 'auto', md: 'visible' }, pb: { xs: .5, md: 0 } }}>
            {[{ id: '', name: 'allTopics' }, ...(refs.data?.categories || [])].map((item) => (
              <Button data-pitch-faq-category={item.id || 'all'} key={item.id} onClick={() => { setCategory(item.id); setExpanded(false); }} sx={{ width: { xs: 'auto', md: '100%' }, flexShrink: 0, whiteSpace: 'nowrap', justifyContent: 'flex-start', px: 1.5, py: 1.2, color: category === item.id ? 'primary.main' : 'text.secondary', bgcolor: category === item.id ? '#edf3f7' : 'transparent', fontWeight: category === item.id ? 700 : 500 }}>
                {t(item.name)}{category === item.id && <ArrowForwardRounded sx={{ fontSize: 15, ml: { xs: 1, md: 'auto' } }} />}
              </Button>
            ))}
          </Stack>
        </Card>
        <Box sx={{ p: 2.5, mt: 2.5, borderRadius: '14px', bgcolor: '#fff6ed', border: '1px solid #f0e5d9', display: { xs: 'none', md: 'block' } }}>
          <AutoAwesomeRounded sx={{ color: '#d2915f', fontSize: 22, mb: 1.2 }} />
          <Typography variant="subtitle2">{t('stillNeedHelp')}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, lineHeight: 1.8 }}>{t('stillNeedHelpHint')}</Typography>
          <Button component={Link} to={user.role === 'student' ? '/student/chat' : '/staff/inbox'} size="small" endIcon={<ArrowForwardRounded />} sx={{ pl: 0, mt: 1 }}>{t(user.role === 'student' ? 'askSahay' : 'ticketInbox')}</Button>
        </Box>
      </Grid>
      <Grid item xs={12} md={9}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Typography variant="body2" color="text.secondary">{faqs.data?.length || 0} {t('approvedAnswers').toLowerCase()}</Typography><Tabs value={faqLanguage} onChange={(_, value) => setFaqLanguage(value)} aria-label="FAQ language"><Tab value="en" label="EN" /><Tab value="hi" label="हिन्दी" /><Tab value="gu" label="ગુજરાતી" /></Tabs></Stack>
        {faqs.loading && <LinearProgress sx={{ mb: 2, height: 2 }} />}
        {faqs.error ? <ErrorState error={faqs.error} onRetry={faqs.reload} /> : faqs.data?.length === 0 ? <Card><EmptyState title={t('noFaqs')} description={t('noFaqsHint')} icon={MenuBookOutlined} /></Card> : faqs.data?.map((faq) => {
          const translation = faq.translations[faqLanguage] || faq.translations.en;
          return <Accordion data-pitch-faq={faq.id} key={faq.id} expanded={expanded === faq.id} onChange={(_, open) => setExpanded(open ? faq.id : false)}>
            <AccordionSummary data-pitch-faq-open={faq.id} expandIcon={<ExpandMoreRounded sx={{ color: '#7f94a3', fontSize: 21 }} />} sx={{ py: .6, px: 2.5, '& .MuiAccordionSummary-content': { my: 1.7, gap: 1.5, alignItems: 'center' } }}><Box sx={{ flex: 1 }}><Typography lang={faqLanguage} variant="subtitle2" sx={{ fontSize: '.83rem', lineHeight: 1.8 }}>{translation.question}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontSize: '.62rem' }}>{t(faq.category?.name)}</Typography></Box></AccordionSummary>
            <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}><Typography lang={faqLanguage} sx={{ whiteSpace: 'pre-wrap', fontSize: '.85rem', lineHeight: 2, color: '#506779', borderTop: '1px solid #edf1f5', pt: 2 }}>{translation.answer}</Typography><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}><Chip size="small" icon={<VerifiedOutlined sx={{ fontSize: '13px !important' }} />} label={t('sourceFaq')} sx={{ bgcolor: '#edf7f1', color: '#4f9171', fontSize: '.62rem', '.MuiChip-icon': { color: 'inherit' } }} /><Stack direction="row"><Tooltip title={t('helpful')}><IconButton data-pitch-faq-up={faq.id} aria-label={t('helpful')} onClick={() => vote(faq.id, 'up')} size="small" sx={{ color: faq.feedback === 'up' ? 'success.main' : 'text.secondary' }}><ThumbUpAltOutlined fontSize="small" /></IconButton></Tooltip><Tooltip title={t('notHelpful')}><IconButton data-pitch-faq-down={faq.id} aria-label={t('notHelpful')} onClick={() => vote(faq.id, 'down')} size="small" sx={{ color: faq.feedback === 'down' ? 'secondary.main' : 'text.secondary' }}><ThumbDownAltOutlined fontSize="small" /></IconButton></Tooltip></Stack></Stack></AccordionDetails>
          </Accordion>;
        })}
      </Grid>
    </Grid>
  </>;
}

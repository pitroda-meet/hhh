import { Box, Chip, Stack, Typography } from '@mui/material';
import { AutoAwesomeRounded, CheckCircleRounded, VerifiedOutlined } from '@mui/icons-material';
import Brand from '../components/Brand.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import SupportIllustration from '../components/SupportIllustration.jsx';
import { useApp } from '../context/appContext.js';
import { useLocation } from 'react-router-dom';

export default function AuthLayout({ children, wide = false }) {
  const { t } = useApp();
  const { pathname } = useLocation();
  return <Box data-pitch-page={pathname} data-pitch-ready="true" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '44% 56%' }, bgcolor: '#fff' }}>
    <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: '#0b3954', color: '#fff', px: { md: 5, xl: 8 }, py: 5, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', inset: 0, opacity: .12, backgroundImage: 'radial-gradient(#a4cddd 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'linear-gradient(150deg, transparent 25%, black)' }} />
      <Box sx={{ position: 'absolute', width: 640, height: 640, border: '1px solid #ffffff0c', borderRadius: '50%', bottom: -320, left: -110 }} />
      <Box sx={{ position: 'relative' }}><Brand dark large /></Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 5, position: 'relative', maxWidth: 500, mx: 'auto' }}>
        <Chip icon={<AutoAwesomeRounded sx={{ color: '#f6b78b !important', fontSize: '15px !important' }} />} label={t('yourCompanion')} sx={{ bgcolor: '#ffffff0a', color: '#d8e9f1', border: '1px solid #ffffff16', alignSelf: 'flex-start', height: 30, fontSize: 9, letterSpacing: 1, borderRadius: '7px', mb: 3 }} />
        <Typography variant="h1" sx={{ color: '#fff', fontSize: { md: '2.55rem', lg: '3.1rem' }, lineHeight: 1.25, letterSpacing: '-1.7px', whiteSpace: 'pre-line' }}>{t('loginBrandTitle')}</Typography>
        <Typography sx={{ color: '#b2cbd8', mt: 2.2, fontSize: '.91rem', maxWidth: 375, lineHeight: 1.9 }}>{t('loginBrandBody')}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5, mb: 0 }}><SupportIllustration sx={{ maxWidth: 330 }} /></Box>
        <Box sx={{ p: 2.5, bgcolor: '#ffffff0a', border: '1px solid #ffffff18', borderRadius: '15px', mt: -1 }}><Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.2 }}><Box sx={{ width: 7, height: 7, bgcolor: '#8dc5ab', borderRadius: '50%' }} /><Typography sx={{ color: '#d0e2ec', fontSize: 11, fontWeight: 600 }}>English <Box component="span" sx={{ mx: 1.3, color: '#617f91' }}>·</Box> हिन्दी <Box component="span" sx={{ mx: 1.3, color: '#617f91' }}>·</Box> ગુજરાતી</Typography></Stack><Typography variant="body2" sx={{ color: '#e3edf3', lineHeight: 1.8 }}>{t('officialTagline')}</Typography></Box>
      </Box>
      <Stack direction="row" spacing={1.2} sx={{ position: 'relative', pt: 2 }}><VerifiedOutlined sx={{ color: '#9dbdcb', fontSize: 24 }} /><Box><Typography sx={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1.3, color: '#c9dce6' }}>{t('challenge')}</Typography><Typography sx={{ fontSize: 10, color: '#92b0c2', mt: .5 }}>{t('government')}</Typography></Box></Stack>
    </Box>
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', px: { xs: 3, sm: 5, lg: 8 }, py: { xs: 3, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center"><Box sx={{ display: { md: 'none' } }}><Brand /></Box><Stack direction="row" alignItems="center" spacing={.6} sx={{ display: { xs: 'none', md: 'flex' } }}><CheckCircleRounded sx={{ color: '#549c7b', fontSize: 14 }} /><Typography variant="caption" color="text.secondary">{t('institute')}</Typography></Stack><LanguageSwitcher /></Stack>
      <Box sx={{ flex: 1, width: '100%', maxWidth: wide ? 560 : 440, mx: 'auto', py: { xs: 5, md: 4 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{children}</Box>
      <Typography variant="caption" textAlign="center" sx={{ fontSize: 10, color: '#97a5b0' }}>AI-Powered Student Support & Query Management System<br />Seva First Innovation Challenge 2026 · Hackathon prototype</Typography>
    </Box>
  </Box>;
}

import { Box, Stack, Typography } from '@mui/material';
import { useApp } from '../context/appContext.js';

export function BrandMark({ size = 40, dark = false }) {
  return <Box component="svg" viewBox="0 0 48 48" aria-hidden="true" sx={{ width: size, height: size, flexShrink: 0 }}>
    <rect width="48" height="48" rx="14" fill={dark ? '#ffffff' : '#0b3954'} />
    <path d="M12 17a5 5 0 0 1 5-5h16a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H23l-9 6V32a5 5 0 0 1-2-4Z" fill={dark ? '#0b3954' : '#ffffff'} />
    <path d="m27 16 2.2 5.8L35 24l-5.8 2.2L27 32l-2.2-5.8L19 24l5.8-2.2Z" fill="#ea580c" />
  </Box>;
}

export default function Brand({ collapsed = false, dark = false, large = false }) {
  const { t } = useApp();
  return <Stack direction="row" alignItems="center" spacing={1.3}>
    <BrandMark size={large ? 46 : 39} dark={dark} />
    {!collapsed && <Box><Typography sx={{ fontFamily: "'Plus Jakarta Sans', 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif", fontWeight: 800, fontSize: large ? 29 : 25, lineHeight: 1.2, letterSpacing: '-1px', color: dark ? '#fff' : 'primary.main' }}>{t('appName')}<Box component="span" sx={{ color: 'secondary.main' }}>.</Box></Typography><Typography sx={{ fontSize: 8.5, fontWeight: 650, letterSpacing: '1.55px', mt: .2, color: dark ? '#adc8d7' : '#7a8b99' }}>STUDENT SUPPORT</Typography></Box>}
  </Stack>;
}

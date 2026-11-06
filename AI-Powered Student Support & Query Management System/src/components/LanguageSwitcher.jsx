import { MenuItem, Select, Stack, Typography } from '@mui/material';
import { TranslateRounded } from '@mui/icons-material';
import { LANGUAGES } from '../utils/constants.js';
import { useApp } from '../context/appContext.js';

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, t } = useApp();
  return <Select value={language} onChange={(event) => setLanguage(event.target.value)} inputProps={{ 'aria-label': t('language'), 'data-testid': 'language-switcher' }} renderValue={(value) => <Stack direction="row" spacing={.8} alignItems="center"><TranslateRounded sx={{ fontSize: 18, color: '#6a7e8d' }} /><Typography variant="body2" fontWeight={600}>{compact ? LANGUAGES.find((l) => l.code === value)?.short : LANGUAGES.find((l) => l.code === value)?.label}</Typography></Stack>} sx={{ minWidth: compact ? 77 : 113, bgcolor: 'transparent', '& fieldset': { borderColor: '#e4eaf0' }, '& .MuiSelect-select': { py: 1, pr: '28px !important', pl: 1.1 } }}>{LANGUAGES.map((item) => <MenuItem key={item.code} value={item.code}>{item.label}</MenuItem>)}</Select>;
}

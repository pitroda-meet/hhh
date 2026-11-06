import { createTheme, alpha } from '@mui/material/styles';

const navy = '#0B3954';
const fontFamily = "'Inter', 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
const heading = "'Plus Jakarta Sans', 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: navy, light: '#235c78', dark: '#062a40' },
    secondary: { main: '#EA580C', light: '#fff0e6', dark: '#c2410c' },
    background: { default: '#F1F5F9', paper: '#ffffff' },
    text: { primary: '#172b3a', secondary: '#637588' },
    divider: '#e8edf2',
    success: { main: '#16845b', light: '#eaf7f0' },
    warning: { main: '#b7770b', light: '#fff6e5' },
    error: { main: '#cf4444', light: '#fff0ef' },
    info: { main: '#367cca', light: '#eaf2ff' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily,
    fontSize: 13,
    h1: { fontFamily: heading, fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-1.5px' },
    h2: { fontFamily: heading, fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-.8px' },
    h3: { fontFamily: heading, fontWeight: 750, fontSize: '1.4rem', letterSpacing: '-.5px' },
    h4: { fontFamily: heading, fontWeight: 750, fontSize: '1.15rem', letterSpacing: '-.3px' },
    h5: { fontFamily: heading, fontWeight: 700, fontSize: '1rem' },
    h6: { fontFamily: heading, fontWeight: 700, fontSize: '.9rem' },
    subtitle1: { fontWeight: 600, fontSize: '.92rem' },
    subtitle2: { fontWeight: 650, fontSize: '.82rem' },
    body1: { fontSize: '.9rem', lineHeight: 1.7 },
    body2: { fontSize: '.8rem', lineHeight: 1.65 },
    caption: { fontSize: '.71rem', lineHeight: 1.6 },
    overline: { fontWeight: 700, letterSpacing: '1.4px', fontSize: '.63rem', lineHeight: 1.8 },
    button: { textTransform: 'none', fontWeight: 650, fontSize: '.8rem', letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: '#F1F5F9' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 9, padding: '9px 17px', transition: 'all .18s ease' },
        contained: { '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 4px 12px ${alpha(navy, .15)}` } },
        outlined: { borderColor: '#dbe4eb' },
        sizeSmall: { padding: '5px 11px', fontSize: '.74rem' },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { rounded: { border: '1px solid #e5ebf1' } } },
    MuiCard: { styleOverrides: { root: { boxShadow: '0 3px 12px rgba(20, 47, 70, .025)', overflow: 'hidden' } } },
    MuiCardContent: { styleOverrides: { root: { padding: 24, '&:last-child': { paddingBottom: 24 } } } },
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 9, background: '#fff', fontSize: '.83rem', '& fieldset': { borderColor: '#dce4eb' } }, input: { paddingTop: 12, paddingBottom: 12 } },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '.83rem' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 600, fontSize: '.7rem' }, sizeSmall: { height: 24 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#edf1f5', fontSize: '.79rem', padding: '15px 18px' },
        head: { background: '#f8fafc', color: '#6b7d8e', fontWeight: 650, fontSize: '.68rem', whiteSpace: 'nowrap', letterSpacing: '.4px' },
      },
    },
    MuiTableRow: { styleOverrides: { root: { '&:last-child td': { borderBottom: 0 }, '&.MuiTableRow-hover:hover': { background: '#f7fafc' } } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 18 } } },
    MuiDialogTitle: { styleOverrides: { root: { fontFamily: heading, fontSize: '1.15rem', fontWeight: 700, padding: 24 } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px 24px' } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 12, boxShadow: '0 10px 40px rgba(15, 42, 60, .13)' } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: '.82rem', minHeight: 38 } } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiTabs: { styleOverrides: { root: { minHeight: 44 }, indicator: { height: 3, borderRadius: 3 } } },
    MuiTab: { styleOverrides: { root: { minHeight: 44, textTransform: 'none', fontWeight: 650, fontSize: '.8rem' } } },
    MuiAccordion: { styleOverrides: { root: { '&:before': { display: 'none' }, boxShadow: 'none', border: '1px solid #e5ebf1', borderRadius: '12px !important', marginBottom: 12, '&.Mui-expanded': { margin: '0 0 12px' } } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 10, fontSize: '.8rem' } } },
    MuiSkeleton: { defaultProps: { animation: 'wave' } },
  },
});

export default theme;

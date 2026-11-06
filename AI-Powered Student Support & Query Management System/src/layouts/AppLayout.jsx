import { useEffect, useState } from 'react';
import { AppBar, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, InputBase, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { ArrowForwardRounded, AutoAwesomeRounded, ChevronLeftRounded, ChevronRightRounded, KeyboardArrowDownRounded, LogoutRounded, MenuRounded, PersonOutlineRounded, PlaceOutlined, SearchRounded, SwapHorizRounded } from '@mui/icons-material';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useApp } from '../context/appContext.js';
import { errorMessage, initials } from '../utils/format.js';
import { navigation, roleIcons } from './navigation.js';
import Brand from '../components/Brand.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import NotificationMenu from '../components/NotificationMenu.jsx';

export default function AppLayout({ role }) {
  const { user, t, logout, demoLogin, toast } = useApp();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });
  const compactHeader = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sahay.sidebar.collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [switchAnchor, setSwitchAnchor] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const slim = collapsed && desktop;
  const width = slim ? 82 : 240;
  const nav = navigation[role];
  const current = [...nav].reverse().find((item) => item.end ? location.pathname === item.path : location.pathname.startsWith(item.path));
  const isChat = location.pathname === '/student/chat';
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  const toggleSidebar = () => { if (desktop) { localStorage.setItem('sahay.sidebar.collapsed', String(!collapsed)); setCollapsed(!collapsed); } else setMobileOpen(mobileOpen === location.pathname ? null : location.pathname); };
  const changeRole = async (nextRole) => {
    setSwitching(true);
    try { await demoLogin(nextRole); setSwitchAnchor(null); setProfileAnchor(null); navigate(`/${nextRole}`); toast(`${t(nextRole)} demo is ready.`); }
    catch (error) { toast(errorMessage(error), 'error'); }
    finally { setSwitching(false); }
  };
  const signOut = async () => { try { await logout(); navigate('/login'); } catch (error) { toast(errorMessage(error), 'error'); } };
  const submitSearch = (event) => { event.preventDefault(); const base = role === 'student' ? '/student/queries' : role === 'staff' ? '/staff/inbox' : `/${role}/tickets`; navigate(`${base}?search=${encodeURIComponent(search)}`); setSearch(''); };

  const sidebar = <Stack sx={{ height: '100%', bgcolor: '#fff' }}>
    <Stack direction="row" alignItems="center" justifyContent={slim ? 'center' : 'space-between'} sx={{ px: slim ? 1 : 2.7, height: 85, flexShrink: 0 }}><Brand collapsed={slim} /></Stack>
    {!slim && <Stack direction="row" alignItems="center" spacing={.8} sx={{ mx: 2.5, px: 1.2, py: .9, bgcolor: '#f5f8fa', border: '1px solid #eaf0f4', borderRadius: 2, mb: 2 }}><Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#479b79' }} /><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{t(`${role}Portal`)}</Typography></Stack>}
    <Box sx={{ flex: 1, overflowY: 'auto', px: slim ? 1.1 : 1.7 }}>
      {!slim && <Typography variant="overline" sx={{ color: '#99a6b0', pl: 1.5, display: 'block', mb: .9 }}>{t('workspace')}</Typography>}
      <List disablePadding onClick={() => setMobileOpen(null)}>{nav.map((item) => <Box key={item.path}>
        {item.section && <Box sx={{ mt: 3, mb: .8 }}>{slim ? <Divider sx={{ mx: 1 }} /> : <Typography variant="overline" sx={{ color: '#99a6b0', pl: 1.5 }}>{t(item.section)}</Typography>}</Box>}
        <Tooltip title={slim ? t(item.key) : ''} placement="right"><ListItemButton component={NavLink} to={item.path} end={item.end} sx={{ borderRadius: '9px', mb: .65, minHeight: 45, px: slim ? 1.9 : 1.6, color: '#6c7f8f', transition: 'all .15s ease', '&:hover': { bgcolor: '#f2f6f8' }, '&.active': { bgcolor: '#0b3954', color: '#fff', boxShadow: '0 3px 8px #0b395416', '& .MuiListItemIcon-root': { color: '#fff' }, '& .MuiListItemText-primary': { fontWeight: 600 } } }}><ListItemIcon sx={{ minWidth: slim ? 0 : 34, color: item.featured ? '#df783c' : '#7f919e' }}><item.icon sx={{ fontSize: 20 }} /></ListItemIcon>{!slim && <><ListItemText primary={t(item.key)} primaryTypographyProps={{ fontSize: '.8rem', fontWeight: 500 }} />{item.featured && <Box sx={{ bgcolor: '#fff0e5', color: '#d86a27', px: .7, py: .12, borderRadius: '4px', fontSize: 8, fontWeight: 800 }}>AI</Box>}</>}</ListItemButton></Tooltip>
      </Box>)}</List>
    </Box>
    {!slim && role === 'student' && <Box sx={{ mx: 2.3, mt: 2, p: 2, borderRadius: '13px', bgcolor: '#f1f6f5', position: 'relative', overflow: 'hidden' }}><AutoAwesomeRounded sx={{ color: '#618d81', mb: .8, fontSize: 22 }} /><Typography variant="subtitle2" sx={{ fontSize: '.77rem' }}>{t('supportOnline')}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .45 }}>{t('supportHint')}</Typography><Button size="small" onClick={() => navigate('/student/chat')} endIcon={<ArrowForwardRounded />} sx={{ px: 0, mt: .8, fontSize: '.73rem' }}>{t('askSahay')}</Button></Box>}
    <Box sx={{ p: slim ? 1.3 : 2.5, mt: 1.5 }}><Divider sx={{ mb: 2 }} /><Stack direction="row" alignItems="center" spacing={1}><Avatar sx={{ width: 33, height: 33, bgcolor: '#f5e8da', color: '#98724e', fontSize: 11, fontWeight: 700 }}>{initials(user.name)}</Avatar>{!slim && <Box sx={{ minWidth: 0 }}><Typography variant="subtitle2" noWrap>{user.name}</Typography><Typography variant="caption" color="text.secondary" noWrap>{user.role === 'student' ? user.enrollment_number : t(user.role)}</Typography></Box>}</Stack></Box>
  </Stack>;

  return <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    <Box component="a" href="#main-content" sx={{ position: 'fixed', left: 12, top: -100, bgcolor: 'primary.main', color: '#fff', p: 1.5, zIndex: 1600, '&:focus-visible': { top: 10 } }}>Skip to content</Box>
    <Box component="nav" aria-label="Main navigation" sx={{ width: desktop ? width : 0, flexShrink: 0, transition: 'width .2s' }}>
      <Drawer variant={desktop ? 'permanent' : 'temporary'} open={desktop || mobileOpen === location.pathname} onClose={() => setMobileOpen(null)} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: desktop ? width : 240, borderRadius: 0, border: 0, borderRight: '1px solid #e5ebf0', transition: 'width .2s', overflowX: 'hidden' } }}>{sidebar}</Drawer>
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <AppBar position="sticky" elevation={0} color="inherit" sx={{ borderBottom: '1px solid #e6ecf1', bgcolor: '#ffffffee', backdropFilter: 'blur(12px)', zIndex: theme.zIndex.drawer - 1 }}><Toolbar sx={{ minHeight: '76px !important', px: { xs: '14px !important', md: '30px !important' }, gap: { xs: 1, sm: 2 } }}>
        <IconButton onClick={toggleSidebar} aria-label={desktop ? 'Toggle sidebar' : 'Open navigation'} size="small" sx={{ color: '#718697', border: '1px solid #e5ebf0', borderRadius: '7px' }}>{desktop ? slim ? <ChevronRightRounded fontSize="small" /> : <ChevronLeftRounded fontSize="small" /> : <MenuRounded fontSize="small" />}</IconButton>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, whiteSpace: 'nowrap' }}><Typography variant="body2" color="text.secondary">{t(`${role}Portal`)}</Typography><ChevronRightRounded sx={{ color: '#b2bec7', fontSize: 14 }} /><Typography variant="body2" fontWeight={600}>{t(current?.key || 'ticketDetails')}</Typography></Stack>
        <Box sx={{ flex: 1 }} />
        <Box component="form" onSubmit={submitSearch} sx={{ display: { xs: 'none', xl: 'flex' }, alignItems: 'center', gap: .8, mr: 1 }}><SearchRounded sx={{ fontSize: 19, color: '#a1b0bd' }} /><InputBase value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} inputProps={{ 'aria-label': t('search') }} sx={{ fontSize: 11.5, width: 200 }} /></Box>
        <LanguageSwitcher compact={compactHeader} /><NotificationMenu /><Divider orientation="vertical" flexItem sx={{ my: 2.7, mx: .1 }} />
        <Tooltip title={t('switchRole')}><IconButton onClick={(event) => setSwitchAnchor(event.currentTarget)} aria-label={t('switchRole')} data-testid="switch-role" sx={{ color: '#6b8091', display: { xs: 'none', sm: 'flex' } }}><SwapHorizRounded sx={{ fontSize: 21 }} /></IconButton></Tooltip>
        <Button onClick={(event) => setProfileAnchor(event.currentTarget)} aria-label="Profile menu" sx={{ minWidth: 0, px: .4, gap: 1.1 }}><Avatar sx={{ width: 34, height: 34, bgcolor: '#f1e4d6', color: '#8b6948', fontSize: 11, fontWeight: 700 }}>{initials(user.name)}</Avatar><Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}><Typography variant="subtitle2" sx={{ fontSize: '.74rem', lineHeight: 1.4 }}>{user.name.split(' ').slice(0, user.name.startsWith('Dr.') ? 2 : 1).join(' ')}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontSize: '.62rem' }}>{t(role)}</Typography></Box><KeyboardArrowDownRounded sx={{ fontSize: 15, color: '#8d9eaa', display: { xs: 'none', sm: 'block' } }} /></Button>
      </Toolbar></AppBar>
      <Box component="main" id="main-content" tabIndex={-1} sx={{ p: { xs: 2, sm: 3, lg: '28px 32px' }, maxWidth: 1600, mx: 'auto', minHeight: 'calc(100vh - 130px)', outline: 'none !important' }}><Box key={location.pathname} className="page-enter"><Outlet /></Box></Box>
      {!isChat && <Stack component="footer" direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ px: { xs: 2, sm: 4 }, py: 2.5, color: '#91a0ad' }}><Typography variant="caption" sx={{ fontSize: '.65rem' }}>© 2026 Sahay. {t('footer')}</Typography><Stack direction="row" alignItems="center" spacing={.6}><PlaceOutlined sx={{ fontSize: 12 }} /><Typography variant="caption" sx={{ fontSize: '.65rem' }}>{t('institute')} <Box component="span" sx={{ mx: 1 }}>·</Box> {t('prototype')}</Typography></Stack></Stack>}
    </Box>
    <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)} PaperProps={{ sx: { minWidth: 220, mt: 1 } }} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}><Box sx={{ px: 2, py: 1 }}><Typography variant="subtitle2">{user.name}</Typography><Typography variant="caption" color="text.secondary">{user.email}</Typography></Box><Divider /><MenuItem onClick={() => { navigate(`/${role}/profile`); setProfileAnchor(null); }}><PersonOutlineRounded fontSize="small" sx={{ mr: 1 }} />{t('profile')}</MenuItem><MenuItem onClick={(e) => { setSwitchAnchor(e.currentTarget); }}><SwapHorizRounded fontSize="small" sx={{ mr: 1 }} />{t('switchRole')}</MenuItem><MenuItem onClick={signOut} sx={{ color: 'error.main' }}><LogoutRounded fontSize="small" sx={{ mr: 1 }} />{t('logout')}</MenuItem></Menu>
    <Menu anchorEl={switchAnchor} open={Boolean(switchAnchor)} onClose={() => setSwitchAnchor(null)} PaperProps={{ sx: { minWidth: 240, mt: 1 } }}><Typography variant="overline" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>{t('switchRole')}</Typography>{Object.keys(roleIcons).map((nextRole) => { const Icon = roleIcons[nextRole]; return <MenuItem key={nextRole} disabled={switching} selected={role === nextRole} onClick={() => changeRole(nextRole)} data-testid={`switch-${nextRole}`}><Icon sx={{ fontSize: 19, mr: 1.5, color: 'text.secondary' }} />{t(nextRole)}{role === nextRole && <Chip label="✓" size="small" sx={{ ml: 'auto', height: 20 }} />}</MenuItem>; })}</Menu>
  </Box>;
}

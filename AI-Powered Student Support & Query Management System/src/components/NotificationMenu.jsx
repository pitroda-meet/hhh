import { useState } from 'react';
import { Avatar, Badge, Box, Button, Divider, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { CheckCircleOutlineRounded, DoneAllRounded, NotificationsNoneRounded, PriorityHighRounded, QuestionAnswerOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/appContext.js';
import { errorMessage, relativeTime } from '../utils/format.js';
import { EmptyState } from './ui.jsx';

export default function NotificationMenu() {
  const { user, t, notifications, markRead, now, toast } = useApp();
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.read_at).length;
  const read = async (id) => { try { await markRead(id); } catch (error) { toast(errorMessage(error), 'error'); } };
  const openNotification = async (notification) => {
    await read(notification.id);
    setAnchor(null);
    if (notification.ticket_id) navigate(`/${user.role}/queries/${notification.ticket_id}`);
    else if (notification.type === 'faq' && user.role === 'admin') navigate('/admin/faqs?status=suggested');
  };
  return <>
    <Tooltip title={t('notifications')}><IconButton aria-label={`${t('notifications')}, ${unread} unread`} data-testid="notification-bell" onClick={(event) => setAnchor(event.currentTarget)} sx={{ color: '#607889' }}><Badge badgeContent={unread} color="secondary" sx={{ '& .MuiBadge-badge': { minWidth: 15, height: 15, fontSize: 9, border: '2px solid white', top: 3, right: 3 } }}><NotificationsNoneRounded sx={{ fontSize: 23 }} /></Badge></IconButton></Tooltip>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: 380, maxWidth: 'calc(100vw - 24px)', mt: 1, '& .MuiList-root': { py: 0 } } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.2 }}><Typography variant="h5">{t('notifications')} {unread > 0 && <Box component="span" sx={{ color: 'secondary.main' }}>({unread})</Box>}</Typography><Button size="small" onClick={() => read('all')} disabled={!unread} startIcon={<DoneAllRounded sx={{ fontSize: 15 }} />}>{t('markAllRead')}</Button></Stack><Divider />
      <Box sx={{ maxHeight: 440, overflowY: 'auto' }}>
        {!notifications.length && <EmptyState compact title={t('noNotifications')} description={t('noNotificationsHint')} icon={NotificationsNoneRounded} />}
        {notifications.slice(0, 30).map((notification) => {
          const Icon = notification.type === 'resolved' ? CheckCircleOutlineRounded : notification.type === 'escalated' ? PriorityHighRounded : QuestionAnswerOutlined;
          return <MenuItem key={notification.id} onClick={() => openNotification(notification)} sx={{ alignItems: 'flex-start', gap: 1.5, p: 2, whiteSpace: 'normal', borderBottom: '1px solid #edf1f5', bgcolor: notification.read_at ? 'white' : '#f6f9fc' }}><Avatar sx={{ bgcolor: notification.type === 'escalated' ? '#fff0ee' : '#eaf1f6', color: notification.type === 'escalated' ? '#c44545' : '#47758c', width: 34, height: 34 }}><Icon sx={{ fontSize: 18 }} /></Avatar><Box sx={{ flex: 1 }}><Typography variant="subtitle2">{notification.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .3 }}>{notification.message}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .5 }}>{relativeTime(notification.created_at, now)}</Typography></Box>{!notification.read_at && <Box sx={{ width: 6, height: 6, mt: .8, borderRadius: '50%', bgcolor: 'secondary.main', flexShrink: 0 }} />}</MenuItem>;
        })}
      </Box>
    </Menu>
  </>;
}

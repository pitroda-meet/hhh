import { Box, Button } from '@mui/material';
import { ExploreOutlined } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useApp } from '../context/appContext.js';
import { EmptyState } from '../components/ui.jsx';

export default function NotFoundPage() {
  const { user, t } = useApp();
  return <Box sx={{ py: 8 }}><EmptyState title={t('notFound')} description={t('notFoundHint')} icon={ExploreOutlined} action={<Button component={Link} to={user ? `/${user.role}` : '/login'} variant="contained">{t('goDashboard')}</Button>} /></Box>;
}

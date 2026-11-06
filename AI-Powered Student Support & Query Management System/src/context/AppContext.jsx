import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { authService } from '../services/authService.js';
import { notificationService } from '../services/notificationService.js';
import { translate } from '../i18n/index.js';
import { errorMessage } from '../utils/format.js';
import { AppContext } from './appContext.js';

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [language, updateLanguage] = useState(() => localStorage.getItem('sahay.language') || 'en');
  const [revision, setRevision] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [snack, setSnack] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [presentationActive, setPresentationActive] = useState(false);
  const userId = user?.id;
  const toast = useCallback((message, severity = 'success') => setSnack({ message, severity, key: Date.now() }), []);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const setLanguage = useCallback((value) => {
    if (!['en', 'hi', 'gu'].includes(value)) return;
    localStorage.setItem(presentationActive ? 'sahay.language.pitch' : 'sahay.language', value);
    updateLanguage(value);
  }, [presentationActive]);

  useEffect(() => {
    let active = true;
    authService.getCurrentUser().then(({ data }) => { if (active) setUser(data); }).catch((error) => { if (active) setAuthError(errorMessage(error)); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { window.addEventListener('sahay:database', refresh); return () => window.removeEventListener('sahay:database', refresh); }, [refresh]);
  useEffect(() => { const timer = setInterval(() => setNow((current) => current + 60000), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    if (!userId) return undefined;
    notificationService.getNotifications().then(({ data }) => { if (active) { setNotifications(data.items); setNow(data.now); } }).catch(() => {});
    return () => { active = false; };
  }, [userId, revision]);

  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials);
    setNotifications([]);
    setUser(data.user);
    refresh();
    return data.user;
  }, [refresh]);
  const demoLogin = useCallback(async (role) => {
    const { data } = await authService.demoLogin(role);
    setNotifications([]);
    setUser(data.user);
    refresh();
    return data.user;
  }, [refresh]);
  const register = useCallback(async (input) => {
    const { data } = await authService.register(input);
    setNotifications([]);
    setUser(data.user);
    refresh();
    return data.user;
  }, [refresh]);
  const logout = useCallback(async () => { await authService.logout(); setUser(null); setNotifications([]); }, []);
  const markRead = useCallback(async (id) => { await notificationService.markAsRead(id); }, []);
  const t = useCallback((key, values) => translate(language, key, values), [language]);
  const value = useMemo(() => ({ user, setUser, ready, authError, language, setLanguage, t, login, demoLogin, register, logout, revision, refresh, notifications, now, markRead, toast, presentationActive, setPresentationActive }), [user, ready, authError, language, setLanguage, t, login, demoLogin, register, logout, revision, refresh, notifications, now, markRead, toast, presentationActive]);

  return <AppContext.Provider value={value}>
    {children}
    <Snackbar key={snack?.key} open={Boolean(snack)} autoHideDuration={presentationActive ? 1800 : 4500} onClose={(_, reason) => { if (reason !== 'clickaway') setSnack(null); }} anchorOrigin={{ vertical: presentationActive ? 'top' : 'bottom', horizontal: 'right' }}>
      <Alert onClose={() => setSnack(null)} severity={snack?.severity || 'success'} variant="filled" sx={{ minWidth: 280, boxShadow: '0 8px 30px #0b395425' }}>{snack?.message}</Alert>
    </Snackbar>
  </AppContext.Provider>;
}

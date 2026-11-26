import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
import { adminService } from '../services/adminService.js';
import { clearAuthStorage } from '../services/api.js';
import { notificationService } from '../services/notificationService.js';
import { translate } from '../i18n/index.js';
import { errorMessage } from '../utils/format.js';
import { showToast } from '../utils/notify.js';
import { AppContext } from './appContext.js';

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [language, updateLanguage] = useState(() => localStorage.getItem('sahay.language') || 'en');
  const [revision, setRevision] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [authError, setAuthError] = useState(null);
  const userId = user?.id;

  const toast = useCallback((message, severity = 'success', options = {}) => {
    showToast(message, severity, options);
  }, []);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  const setLanguage = useCallback((value) => {
    if (!['en', 'hi', 'gu'].includes(value)) return;
    localStorage.setItem('sahay.language', value);
    updateLanguage(value);
  }, []);

  useEffect(() => {
    let active = true;
    authService
      .getCurrentUser()
      .then(({ data }) => {
        if (active) setUser(data);
      })
      .catch((error) => {
        if (active) {
          const msg = errorMessage(error);
          setAuthError(msg);
          toast(msg, 'error');
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, [toast]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  useEffect(() => {
    window.addEventListener('sahay:database', refresh);
    return () => window.removeEventListener('sahay:database', refresh);
  }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setNotifications([]);
    };
    window.addEventListener('sahay:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sahay:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    const onKeyDown = async (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        try {
          await adminService.demoReset();
          clearAuthStorage();
          setUser(null);
          setNotifications([]);
          toast('Demo database restored to clean seeded state.', 'success');
        } catch (error) {
          if (!error?._toasted) toast(errorMessage(error), 'error');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toast]);

  useEffect(() => {
    const timer = setInterval(() => setNow((current) => current + 60000), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    if (!userId) return undefined;
    notificationService
      .getNotifications()
      .then(({ data }) => {
        if (active) {
          setNotifications(data.items);
          setNow(data.now);
        }
      })
      .catch((error) => {
        if (active && !error?._toasted) {
          toast(errorMessage(error), 'error', { toastId: 'notifications-load-error' });
        }
      });
    return () => { active = false; };
  }, [userId, revision, toast]);

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

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setNotifications([]);
  }, []);

  const markRead = useCallback(async (id) => {
    await notificationService.markAsRead(id);
  }, []);

  const t = useCallback((key, values) => translate(language, key, values), [language]);

  const value = useMemo(() => ({
    user,
    setUser,
    ready,
    authError,
    language,
    setLanguage,
    t,
    login,
    demoLogin,
    register,
    logout,
    revision,
    refresh,
    notifications,
    now,
    markRead,
    toast,
  }), [user, ready, authError, language, setLanguage, t, login, demoLogin, register, logout, revision, refresh, notifications, now, markRead, toast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

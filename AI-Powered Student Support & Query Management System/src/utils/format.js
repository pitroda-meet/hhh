export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export function formatDate(value, options = {}) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', ...options }).format(new Date(value));
}

export const formatDateTime = (value) => formatDate(value, { hour: '2-digit', minute: '2-digit' });

export const formatTime = (value) => value ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '';

export function relativeTime(value, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((Number(now) - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export const titleCase = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const compactNumber = (value) => new Intl.NumberFormat('en-IN', { notation: value > 9999 ? 'compact' : 'standard' }).format(value);

export function errorMessage(error) {
  const fieldErrors = error?.response?.data?.errors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const first = Object.values(fieldErrors).flat().find(Boolean);
    if (first) return String(first);
  }
  return error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';
}

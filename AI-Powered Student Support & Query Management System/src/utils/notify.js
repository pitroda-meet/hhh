import { toast } from 'react-toastify';

export function showToast(message, severity = 'success', options = {}) {
  if (typeof window === 'undefined' || !message) return;
  const fn = toast[severity] || toast.info;
  fn(message, options);
}

export const notify = {
  success: (message, options) => showToast(message, 'success', options),
  error: (message, options) => showToast(message, 'error', options),
  warning: (message, options) => showToast(message, 'warning', options),
  info: (message, options) => showToast(message, 'info', options),
};


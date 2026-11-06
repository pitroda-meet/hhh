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
export const errorMessage = (error) => error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';
export const attachmentMetadata = (files) => Array.from(files || []).map((file) => ({ name: file.name, size: file.size, type: file.type || 'application/octet-stream', mock: true }));
export function downloadMockAttachment(attachment, ticketNumber) {
  const blob = new Blob([`SAHAY · DEMO ATTACHMENT\n\nTicket: ${ticketNumber}\nOriginal file: ${attachment.name}\nSize: ${attachment.size || 0} bytes\n\nThis prototype stores file metadata only. A production attachment would be served from Laravel storage.\n`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${attachment.name}.demo.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

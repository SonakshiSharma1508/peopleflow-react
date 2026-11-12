import { daysUntil } from '../domain.js';

export function dateLabel(date, options = {}) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', ...options }).format(
    new Date(`${date}T12:00:00`),
  );
}
export function relativeDate(date) {
  const days = daysUntil(date);
  return days === 0
    ? 'Today'
    : days === 1
      ? 'Tomorrow'
      : days === -1
        ? 'Yesterday'
        : days < 0
          ? `${Math.abs(days)} days overdue`
          : dateLabel(date);
}
export function timeAgo(at) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / 60000));
  return minutes < 1
    ? 'Just now'
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
}

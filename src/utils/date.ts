export function formatDate(value: { toDate: () => Date } | null | undefined) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(value.toDate());
}

export function formatFullDateTime(value: { toDate: () => Date } | Date | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : value.toDate();
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function formatTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(value);
}

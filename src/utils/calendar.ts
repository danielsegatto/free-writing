import type { Conversation, Message } from '../types';

export type CalendarView = 'today' | 'week' | 'month';

export type CalendarItem = {
  conversation: Conversation;
  message: Message;
  scheduledAt: Date;
};

export type CalendarDay = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
};

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateTimeLocalInput(value: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue) - 1;
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const date = new Date(year, month, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export function formatDateTimeLocalInput(date: Date | null | undefined) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function getMessageScheduledDate(message: Message) {
  return message.scheduledAt?.toDate?.() ?? null;
}

export function getCalendarItems(
  conversations: Conversation[],
  messagesByConversation: Record<string, Message[]>
): CalendarItem[] {
  return conversations
    .flatMap((conversation) =>
      (messagesByConversation[conversation.id] ?? []).flatMap((message) => {
        const scheduledAt = getMessageScheduledDate(message);
        return scheduledAt ? [{ conversation, message, scheduledAt }] : [];
      })
    )
    .sort((first, second) => first.scheduledAt.getTime() - second.scheduledAt.getTime());
}

export function getCalendarRange(view: CalendarView, now = new Date()) {
  if (view === 'today') {
    const start = startOfLocalDay(now);
    return { start, end: addLocalDays(start, 1) };
  }

  if (view === 'week') {
    const today = startOfLocalDay(now);
    const start = addLocalDays(today, -today.getDay());
    return { start, end: addLocalDays(start, 7) };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export function getCalendarDays(view: CalendarView, now = new Date()): CalendarDay[] {
  const { start, end } = getCalendarRange(view, now);
  const days: CalendarDay[] = [];

  for (let date = start; date < end; date = addLocalDays(date, 1)) {
    days.push({
      key: getLocalDateKey(date),
      date,
      isCurrentMonth: date.getMonth() === now.getMonth()
    });
  }

  return days;
}

export function getMonthGridDays(now = new Date()): CalendarDay[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const gridStart = addLocalDays(monthStart, -monthStart.getDay());
  const lastMonthDay = addLocalDays(monthEnd, -1);
  const gridEnd = addLocalDays(lastMonthDay, 6 - lastMonthDay.getDay());
  const days: CalendarDay[] = [];

  for (let date = gridStart; date <= gridEnd; date = addLocalDays(date, 1)) {
    days.push({
      key: getLocalDateKey(date),
      date,
      isCurrentMonth: date.getMonth() === now.getMonth()
    });
  }

  return days;
}

export function filterCalendarItems(items: CalendarItem[], view: CalendarView, now = new Date()) {
  const { start, end } = getCalendarRange(view, now);
  return items.filter((item) => item.scheduledAt >= start && item.scheduledAt < end);
}

export function groupCalendarItemsByDay(items: CalendarItem[], days: CalendarDay[]) {
  const grouped = new Map(days.map((day) => [day.key, [] as CalendarItem[]]));

  items.forEach((item) => {
    const key = getLocalDateKey(item.scheduledAt);
    const dayItems = grouped.get(key);
    if (dayItems) dayItems.push(item);
  });

  grouped.forEach((dayItems) => {
    dayItems.sort((first, second) => first.scheduledAt.getTime() - second.scheduledAt.getTime());
  });

  return grouped;
}

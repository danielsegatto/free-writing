import { describe, expect, it } from 'vitest';
import type { Conversation, Message } from '../types';
import {
  filterCalendarItems,
  formatDateTimeLocalInput,
  getCalendarDays,
  getCalendarItems,
  getCalendarRange,
  groupCalendarItemsByDay,
  parseDateTimeLocalInput
} from './calendar';

const timestamp = (value: string) => {
  const date = new Date(value);
  return {
    toDate: () => date,
    toMillis: () => date.getTime()
  } as Message['createdAt'];
};

const conversation: Conversation = {
  id: 'conversation-1',
  userId: 'user-1',
  title: 'Inbox',
  createdAt: timestamp('2026-05-01T12:00:00'),
  updatedAt: timestamp('2026-05-01T12:00:00'),
  lastMessagePreview: ''
};

function message(id: string, scheduledAt: Message['scheduledAt']): Message {
  return {
    id,
    userId: 'user-1',
    conversationId: conversation.id,
    text: id,
    searchText: id,
    tags: [],
    references: [],
    createdAt: timestamp('2026-05-01T12:00:00'),
    updatedAt: null,
    scheduledAt,
    sortOrder: 1000,
    isForwarded: false,
    transferType: null,
    forwardedFromConversationId: null,
    forwardedFromConversationTitle: null,
    forwardedFromMessageId: null
  };
}

describe('calendar helpers', () => {
  it('parses and formats datetime-local values in local time', () => {
    const date = parseDateTimeLocalInput('2026-05-21T09:45');

    expect(date).toEqual(new Date(2026, 4, 21, 9, 45));
    expect(formatDateTimeLocalInput(date)).toBe('2026-05-21T09:45');
    expect(parseDateTimeLocalInput('')).toBeNull();
    expect(parseDateTimeLocalInput('2026-02-31T09:45')).toBeNull();
  });

  it('calculates today, Sunday-start week, and month ranges', () => {
    const now = new Date(2026, 4, 21, 15, 30);

    expect(getCalendarRange('today', now)).toEqual({
      start: new Date(2026, 4, 21),
      end: new Date(2026, 4, 22)
    });
    expect(getCalendarRange('week', now)).toEqual({
      start: new Date(2026, 4, 17),
      end: new Date(2026, 4, 24)
    });
    expect(getCalendarRange('month', now)).toEqual({
      start: new Date(2026, 4, 1),
      end: new Date(2026, 5, 1)
    });
  });

  it('filters, sorts, and groups scheduled blocks by local date with empty days', () => {
    const now = new Date(2026, 4, 21, 12, 0);
    const morning = message('morning', timestamp('2026-05-21T09:00:00'));
    const afternoon = message('afternoon', timestamp('2026-05-21T15:00:00'));
    const unscheduled = message('unscheduled', null);
    const tomorrow = message('tomorrow', timestamp('2026-05-22T10:00:00'));

    const items = getCalendarItems([conversation], {
      [conversation.id]: [afternoon, unscheduled, tomorrow, morning]
    });
    const todayItems = filterCalendarItems(items, 'today', now);
    const days = getCalendarDays('week', now);
    const grouped = groupCalendarItemsByDay(items, days);

    expect(todayItems.map((item) => item.message.id)).toEqual(['morning', 'afternoon']);
    expect(grouped.get('2026-05-21')?.map((item) => item.message.id)).toEqual(['morning', 'afternoon']);
    expect(grouped.get('2026-05-18')).toEqual([]);
  });
});

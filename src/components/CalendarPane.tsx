import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import type { Conversation, Message } from '../types';
import {
  filterCalendarItems,
  getCalendarDays,
  getCalendarItems,
  getMonthGridDays,
  groupCalendarItemsByDay,
  type CalendarDay,
  type CalendarItem,
  type CalendarView
} from '../utils/calendar';
import { formatTime } from '../utils/date';

type CalendarPaneProps = {
  isOpen: boolean;
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  onBack: () => void;
  onOpenMessage: (conversationId: string, messageId: string) => void;
};

const viewLabels: Record<CalendarView, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month'
};

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDayLabel(day: CalendarDay, view: CalendarView) {
  if (view === 'month') {
    const options: Intl.DateTimeFormatOptions =
      day.date.getDate() === 1 ? { month: 'short', day: 'numeric' } : { day: 'numeric' };
    return new Intl.DateTimeFormat(undefined, options).format(day.date);
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(day.date);
}

function formatCalendarRange(view: CalendarView, now: Date) {
  if (view === 'month') {
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(now);
  }

  if (view === 'today') {
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
  }

  const start = getCalendarDays('week', now)[0].date;
  const end = getCalendarDays('week', now)[6].date;
  return `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(start)} - ${new Intl.DateTimeFormat(
    undefined,
    { month: 'short', day: 'numeric' }
  ).format(end)}`;
}

function getBlockPreview(message: Message) {
  if (message.text.trim()) return message.text;
  if ((message.attachments?.length ?? 0) > 0) {
    return message.attachments?.length === 1 ? 'Image block' : `${message.attachments?.length ?? 0} images`;
  }
  if (message.references.length > 0) return message.references.length === 1 ? 'Reference block' : 'Reference blocks';
  return 'Untitled block';
}

function CalendarItemButton({
  item,
  onOpenMessage
}: {
  item: CalendarItem;
  onOpenMessage: (conversationId: string, messageId: string) => void;
}) {
  return (
    <button
      className="calendar-item"
      type="button"
      onClick={() => onOpenMessage(item.conversation.id, item.message.id)}
    >
      <time>{formatTime(item.scheduledAt)}</time>
      <span>
        <strong>{item.conversation.title}</strong>
        <span>{getBlockPreview(item.message)}</span>
      </span>
    </button>
  );
}

export function CalendarPane({
  isOpen,
  conversations,
  messagesByConversation,
  onBack,
  onOpenMessage
}: CalendarPaneProps) {
  const [view, setView] = useState<CalendarView>('today');
  const now = useMemo(() => new Date(), []);
  const allItems = useMemo(
    () => getCalendarItems(conversations, messagesByConversation),
    [conversations, messagesByConversation]
  );
  const visibleItems = useMemo(() => filterCalendarItems(allItems, view, now), [allItems, now, view]);
  const days = useMemo(() => getCalendarDays(view, now), [now, view]);
  const monthGridDays = useMemo(() => getMonthGridDays(now), [now]);
  const groupedItems = useMemo(() => groupCalendarItemsByDay(visibleItems, days), [days, visibleItems]);
  const monthGridItems = useMemo(
    () => groupCalendarItemsByDay(visibleItems, monthGridDays),
    [monthGridDays, visibleItems]
  );

  function renderDay(day: CalendarDay, dayItems: CalendarItem[], className = 'calendar-day') {
    return (
      <section key={day.key} className={`${className} ${day.isCurrentMonth ? '' : 'outside-month'}`.trim()}>
        <header>
          <span>{formatDayLabel(day, view)}</span>
          <small>{dayItems.length}</small>
        </header>
        <div className="calendar-day-items">
          {dayItems.map((item) => (
            <CalendarItemButton key={item.message.id} item={item} onOpenMessage={onOpenMessage} />
          ))}
          {dayItems.length === 0 && <p className="calendar-empty-day">No blocks</p>}
        </div>
      </section>
    );
  }

  return (
    <section className={`calendar-pane ${isOpen ? 'open' : ''}`}>
      <header className="conversation-header calendar-header">
        <button className="icon-button back-button" title="Back" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2>Calendar</h2>
          <p>{formatCalendarRange(view, now)}</p>
        </div>
        <CalendarDays size={22} />
      </header>

      <div className="calendar-view-tabs" role="tablist" aria-label="Calendar views">
        {(Object.keys(viewLabels) as CalendarView[]).map((viewName) => (
          <button
            key={viewName}
            className={view === viewName ? 'calendar-view-tab active' : 'calendar-view-tab'}
            type="button"
            role="tab"
            aria-selected={view === viewName}
            onClick={() => setView(viewName)}
          >
            {viewLabels[viewName]}
          </button>
        ))}
      </div>

      <div className="calendar-scroll">
        {view === 'today' && (
          <section className="calendar-agenda" aria-label="Today">
            {visibleItems.map((item) => (
              <CalendarItemButton key={item.message.id} item={item} onOpenMessage={onOpenMessage} />
            ))}
            {visibleItems.length === 0 && <p className="empty-state">No dated blocks today.</p>}
          </section>
        )}

        {view === 'week' && (
          <div className="calendar-week">
            {days.map((day) => renderDay(day, groupedItems.get(day.key) ?? []))}
          </div>
        )}

        {view === 'month' && (
          <div className="calendar-month-grid" aria-label="This month">
            {weekdayLabels.map((label) => (
              <div key={label} className="calendar-weekday">
                {label}
              </div>
            ))}
            {monthGridDays.map((day) => renderDay(day, monthGridItems.get(day.key) ?? [], 'calendar-month-day'))}
            {visibleItems.length === 0 && <p className="empty-state calendar-month-empty">No dated blocks this month.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

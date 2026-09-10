import type { Reminder, ReminderRepeat } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

/**
 * When does a reminder actually happen?
 *
 * The repeat rule used to live nowhere: every screen listed every reminder, so a
 * Monday-only appointment showed on a Sunday, a one-off from last week never
 * went away, and switching a reminder off changed nothing but the switch. This
 * module is the single answer, so the patient's list, the caregiver's list and
 * the alert banner can never disagree about what is due.
 *
 * Dates are `YYYY-MM-DD` **as read in the patient's zone** and the weekday is
 * `0 = Sunday … 6 = Saturday`, matching `weekdayInZone`. Nothing here calls
 * `new Date()` — the caller supplies the day, which is what lets a caregiver in
 * another timezone ask "what is due on *their* Tuesday" and get an honest answer.
 */

/** The weekday of a `YYYY-MM-DD`, 0 = Sunday. Zone-free: a date has no clock. */
export function weekdayOfDate(date: string): number {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : new Date(parsed).getUTCDay();
}

/** Monday–Friday, for the `weekdays` repeat. */
function isWeekday(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

/**
 * Does this reminder's schedule land on the given day?
 *
 * Ignores `enabled` — that is a separate question, and keeping them apart lets a
 * caregiver's management screen show "Tuesdays, currently off" rather than
 * hiding the reminder entirely.
 *
 * Missing data is treated as *shown* rather than hidden. A `once` reminder with
 * no date, or a `weekly` one with no days chosen, is malformed rather than
 * meaningless, and quietly making someone's medicine reminder disappear is a far
 * worse failure than showing one a day early.
 */
export function occursOn(reminder: Reminder, date: string, weekday = weekdayOfDate(date)): boolean {
  switch (reminder.repeat) {
    case 'once':
      return !reminder.date || reminder.date === date;
    case 'weekdays':
      return isWeekday(weekday);
    case 'weekly':
      return !reminder.weekdays?.length || reminder.weekdays.includes(weekday);
    case 'daily':
    default:
      return true;
  }
}

/** Scheduled for that day *and* switched on — what the patient should be shown. */
export function isActiveOn(
  reminder: Reminder,
  date: string,
  weekday = weekdayOfDate(date),
): boolean {
  return reminder.enabled && occursOn(reminder, date, weekday);
}

/** Everything due on a given day, earliest first. */
export function remindersForDay(
  reminders: Reminder[],
  date: string,
  weekday = weekdayOfDate(date),
): Reminder[] {
  return reminders
    .filter((reminder) => isActiveOn(reminder, date, weekday))
    .sort((a, b) => minutesOfTime(a.time) - minutesOfTime(b.time));
}

/** `"08:30"` → `510`. `-1` for anything unparseable, so it sorts first and never matches a window. */
export function minutesOfTime(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return -1;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

/** A one-time reminder whose day has already passed. */
export function isExpired(reminder: Reminder, today: string): boolean {
  return reminder.repeat === 'once' && !!reminder.date && reminder.date < today;
}

// ------------------------------------------------------------------- labels

export const REPEAT_OPTIONS: ReminderRepeat[] = ['once', 'daily', 'weekdays', 'weekly'];

export const REPEAT_LABEL: Record<ReminderRepeat, TranslationKey> = {
  once: 'reminders.repeat.once',
  daily: 'reminders.repeat.daily',
  weekdays: 'reminders.repeat.weekdays',
  weekly: 'reminders.repeat.weekly',
};

/** `0 = Sunday`, in the order a week is drawn here — Sunday first. */
export const WEEKDAY_KEYS: TranslationKey[] = [
  'reminders.day.0',
  'reminders.day.1',
  'reminders.day.2',
  'reminders.day.3',
  'reminders.day.4',
  'reminders.day.5',
  'reminders.day.6',
];

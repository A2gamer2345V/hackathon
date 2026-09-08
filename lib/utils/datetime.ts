/** Local-date helpers. Everything in the prototype works in the device's timezone. */

import type { TranslationKey } from '@/lib/i18n/locales/en';

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isoDaysAgo(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return todayISO(d);
}

/** Minutes since midnight for a `HH:mm` string; -1 when unparseable. */
export function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return -1;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

export function nowMinutes(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** `14:30` → `2:30 PM`. Kept explicit rather than locale-formatted so that the
 *  displayed time never silently changes shape between languages. */
export function formatTime(time: string): string {
  const minutes = timeToMinutes(time);
  if (minutes < 0) return time;
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export type DayPartName = 'morning' | 'afternoon' | 'evening';

export function dayPartFor(time: string): DayPartName {
  const minutes = timeToMinutes(time);
  if (minutes < 0) return 'morning';
  if (minutes < 12 * 60) return 'morning';
  if (minutes < 17 * 60) return 'afternoon';
  return 'evening';
}

export function currentDayPart(date = new Date()): DayPartName {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/** Short weekday initial(s) for charts, e.g. `Mon`. */
export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export function formatLongDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** "just now" / "2 hours ago" — deliberately coarse and non-clinical.
 *
 *  A translation key is returned rather than a finished English string, so the
 *  phrase follows the user's language like everything else on screen.
 *  `useRelativeTime` turns it into text. */
export interface RelativeTime {
  key: TranslationKey;
  values?: { count: number };
}

export function relativeTimeParts(iso: string, now = new Date()): RelativeTime | null {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMinutes = Math.round((now.getTime() - then) / 60000);
  if (diffMinutes < 2) return { key: 'time.justNow' };
  if (diffMinutes < 60) return { key: 'time.minutesAgo', values: { count: diffMinutes } };
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) {
    return hours === 1
      ? { key: 'time.hourAgo' }
      : { key: 'time.hoursAgo', values: { count: hours } };
  }
  const days = Math.round(hours / 24);
  return days === 1 ? { key: 'time.dayAgo' } : { key: 'time.daysAgo', values: { count: days } };
}

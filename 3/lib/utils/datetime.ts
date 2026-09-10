/**
 * The last few date helpers that are deliberately *not* timezone-aware.
 *
 * Everything a person reads goes through `lib/utils/timezone.ts` and the
 * `useFormats()` hook, which know whose zone and whose language to use. What is
 * left here is the small set where a zone genuinely does not apply:
 *
 *  - `todayISO` / `isoDaysAgo` build the demo fixtures, which are seeded on the
 *    machine running the prototype and have no user attached yet.
 *  - `relativeTimeParts` measures an elapsed duration. "Two hours ago" is two
 *    hours ago everywhere on Earth.
 *  - `DayPartName` is just a name for a part of the day; `useFormats().dayPart()`
 *    is what decides which one it currently is.
 *
 * The device-local formatters that used to live here (`formatTime`,
 * `formatLongDate`, `weekdayShort`, `nowMinutes`, `currentDayPart`,
 * `timeToMinutes`) are gone. They silently used the browser's zone and the
 * browser's locale, which is exactly the bug the timezone work was fixing, and
 * leaving them importable was an invitation to reintroduce it. Their
 * replacements are `useFormats()` and `minutesOfTime` in `lib/utils/reminders`.
 */

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

export type DayPartName = 'morning' | 'afternoon' | 'evening';

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

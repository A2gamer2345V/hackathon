'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/providers/language-provider';
import { useAppState } from '@/lib/providers/app-state-provider';
import {
  dateInZone,
  formatInstantTime,
  formatLongDateIn,
  formatShortDate,
  formatWallTime,
  formatWeekdayShort,
  minutesInZone,
  todayInZone,
  weekdayInZone,
} from '@/lib/utils/timezone';
import type { DayPartName } from '@/lib/utils/datetime';

/**
 * Every date and time the UI shows, in the reader's zone and language.
 *
 * Two things are deliberately joined here. The *zone* is the one the screen is
 * being read on — a patient's own, or, on a care screen, the patient the
 * caregiver is looking at. That last part matters: at 10pm Monday in New York
 * the patient in Kolkata is already having Tuesday breakfast, and a dashboard
 * that showed the caregiver *their* Monday would be reporting a day that had
 * already finished. The caregiver's own zone is still there as
 * `useAppState().timezone`, for their account screen. The *locale* comes from
 * the chosen language, so a Hindi UI does not get an English "PM" bolted on.
 *
 * Components should reach for this rather than the raw helpers in
 * `lib/utils/timezone`, which take both values as arguments and are easy to call
 * with the device's defaults by accident.
 */
export interface Formats {
  /** The zone these formatters read on — see the note above. */
  timezone: string;
  /** BCP-47 tag used for `Intl` formatting. */
  locale: string;
  /** `Tuesday, 9 September` in the reader's zone and language. */
  longDate: (instant?: Date) => string;
  /** A stored wall-clock `HH:mm` as the reader would say it. */
  wallTime: (time: string) => string;
  /** A UTC timestamp as a clock time in the reader's zone. */
  instantTime: (iso: string) => string;
  /** `Mon` for a `YYYY-MM-DD`. */
  weekdayShort: (date: string) => string;
  /** `12 Aug` for a `YYYY-MM-DD`. */
  shortDate: (date: string) => string;
  /** `YYYY-MM-DD` for a UTC timestamp, as it reads on the reader's calendar. */
  dateOf: (iso: string) => string;
  /** Today's `YYYY-MM-DD` in the reader's zone. */
  today: () => string;
  /** Minutes since midnight right now in the reader's zone. */
  nowMinutes: () => number;
  /** Day of week right now in the reader's zone, 0 = Sunday. */
  todayWeekday: () => number;
  /**
   * Morning / afternoon / evening in the reader's zone.
   *
   * Drives the greeting, so a patient in Kolkata is wished good morning at their
   * breakfast rather than at the server's.
   */
  dayPart: () => DayPartName;
}

export function useFormats(): Formats {
  const { language, definition } = useLanguage();
  const { viewingTimezone: timezone } = useAppState();
  const locale = definition.formatLocale;

  return useMemo<Formats>(
    () => ({
      timezone,
      locale,
      longDate: (instant = new Date()) => formatLongDateIn(timezone, locale, instant),
      wallTime: (time) => formatWallTime(time, locale),
      instantTime: (iso) => formatInstantTime(iso, timezone, locale),
      weekdayShort: (date) => formatWeekdayShort(date, locale),
      shortDate: (date) => formatShortDate(date, locale),
      dateOf: (iso) => {
        const instant = new Date(iso);
        return Number.isNaN(instant.getTime()) ? '' : dateInZone(instant, timezone);
      },
      today: () => todayInZone(timezone),
      nowMinutes: () => minutesInZone(timezone),
      todayWeekday: () => weekdayInZone(timezone),
      dayPart: () => {
        const hour = Math.floor(minutesInZone(timezone) / 60);
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
      },
    }),
    // `language` is not read directly, but a language change must produce a new
    // set of formatters — `locale` is derived from it and covers that.
    [timezone, locale, language],
  );
}

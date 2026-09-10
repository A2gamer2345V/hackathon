/**
 * Timezone handling.
 *
 * The rules this module exists to enforce:
 *
 *  1. An absolute moment is stored as a UTC ISO string. Always. `new Date()` and
 *     `.toISOString()` do this correctly and nothing here second-guesses them.
 *  2. A *wall-clock* time — "the evening tablet at 20:00" — is stored as the
 *     literal `HH:mm` plus the IANA zone it means something in. It is never
 *     converted to UTC for storage, because 20:00 in London is a different
 *     instant in June than in December and the reminder must follow the clock on
 *     the wall, not the instant it happened to mean when it was created.
 *  3. Display converts UTC → the viewer's zone at the moment of rendering.
 *  4. No offset is ever computed by hand. `Intl.DateTimeFormat` with a `timeZone`
 *     knows every zone's DST rules and history; arithmetic on `getTimezoneOffset`
 *     does not.
 *
 * Nothing here hard-codes a region. The caregiver's zone and the patient's zone
 * are independent values carried on their own records, and this module is simply
 * given whichever one applies.
 */

/** The zone the browser (or the server process) is actually in. */
export function detectTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone.length > 0 ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}

/** True when the string is a zone this runtime can actually format in. */
export function isValidTimezone(zone: string): boolean {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Falls back to UTC rather than to any particular country. */
export function safeTimezone(zone: string | undefined | null): string {
  return zone && isValidTimezone(zone) ? zone : 'UTC';
}

// ------------------------------------------------------- parts in a zone

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

const partCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(zone: string): Intl.DateTimeFormat {
  let cached = partCache.get(zone);
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    partCache.set(zone, cached);
  }
  return cached;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * What the clock and calendar read in `zone` at the given instant.
 *
 * This is the single primitive everything else is built on, and it is
 * `Intl`-driven precisely so DST is handled by the platform's zone database.
 */
export function partsInZone(instant: Date, zone: string): ZonedParts {
  const parts = formatterFor(safeTimezone(zone)).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  // Midnight comes back as hour 24 in some ICU versions; normalise it.
  const hour = Number(get('hour')) % 24;

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS[get('weekday')] ?? 0,
  };
}

// --------------------------------------------------------------- local dates

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `YYYY-MM-DD` as it reads on the wall in `zone`. */
export function dateInZone(instant: Date, zone: string): string {
  const { year, month, day } = partsInZone(instant, zone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Today's date in `zone`. */
export function todayInZone(zone: string, now = new Date()): string {
  return dateInZone(now, zone);
}

/** `HH:mm` as it reads on the wall in `zone`. */
export function timeInZone(instant: Date, zone: string): string {
  const { hour, minute } = partsInZone(instant, zone);
  return `${pad(hour)}:${pad(minute)}`;
}

/** Minutes since midnight in `zone`. */
export function minutesInZone(zone: string, now = new Date()): number {
  const { hour, minute } = partsInZone(now, zone);
  return hour * 60 + minute;
}

/** Day of week in `zone`, 0 = Sunday. */
export function weekdayInZone(zone: string, now = new Date()): number {
  return partsInZone(now, zone).weekday;
}

/**
 * `n` days before the given date, as a `YYYY-MM-DD` in `zone`.
 *
 * Steps by calendar day rather than by 86,400,000 ms, so a DST transition inside
 * the window does not shift the result by a day.
 */
export function dateInZoneDaysAgo(days: number, zone: string, now = new Date()): string {
  const { year, month, day } = partsInZone(now, zone);
  // UTC arithmetic on a date-only value is exact: no zone, so no DST to trip on.
  const anchor = Date.UTC(year, month - 1, day) - days * 86_400_000;
  const shifted = new Date(anchor);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** How many calendar days apart two `YYYY-MM-DD` strings are. */
export function daysBetweenDates(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

// ------------------------------------------------------- wall clock → instant

/**
 * The UTC instant at which a wall-clock time occurs in a zone on a given date.
 *
 * Solved by iteration rather than by adding an offset: guess, ask `Intl` what the
 * guess reads as in that zone, and correct by the difference. Two passes settle
 * every real case including the hour DST removes, and no offset table is involved.
 *
 * Used for scheduling — "when, in absolute terms, is 08:00 tomorrow for this
 * patient" — not for storage.
 */
export function zonedWallClockToInstant(date: string, time: string, zone: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const target = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );

  let guess = target;
  for (let pass = 0; pass < 3; pass += 1) {
    const parts = partsInZone(new Date(guess), zone);
    const reads = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const drift = target - reads;
    if (drift === 0) break;
    guess += drift;
  }
  return new Date(guess);
}

// ------------------------------------------------------------------ formatting

/**
 * A wall-clock `HH:mm` rendered for a locale.
 *
 * The AM/PM marker — and whether there is one at all — comes from the locale, so
 * a Hindi UI does not get an English "PM" bolted onto it. Formatted on a fixed
 * reference date in UTC so only the time is ever shown.
 */
export function formatWallTime(time: string, locale: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return time;

  const reference = new Date(Date.UTC(2000, 0, 1, hours, minutes));
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(reference);
  } catch {
    return time;
  }
}

/** An absolute instant shown as a time in the viewer's zone and language. */
export function formatInstantTime(iso: string, zone: string, locale: string): string {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: safeTimezone(zone),
    }).format(instant);
  } catch {
    return timeInZone(instant, zone);
  }
}

export function formatLongDateIn(
  zone: string,
  locale: string,
  instant = new Date(),
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: safeTimezone(zone),
    }).format(instant);
  } catch {
    return dateInZone(instant, zone);
  }
}

/** Short weekday label for a `YYYY-MM-DD`, in the UI's language. */
export function formatWeekdayShort(date: string, locale: string): string {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed)) return date;
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(parsed),
    );
  } catch {
    return date;
  }
}

/** `12 Aug` style label for chart axes and activity rows. */
export function formatShortDate(date: string, locale: string): string {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed)) return date;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(parsed));
  } catch {
    return date;
  }
}

/**
 * A zone as a person would recognise it: `Asia/Kolkata · GMT+5:30`.
 *
 * The offset is asked of `Intl`, never computed, so a zone currently on summer
 * time reads as its summer offset.
 */
export function describeTimezone(zone: string, locale = 'en'): string {
  const safe = safeTimezone(zone);
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: safe,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    const label = parts.find((p) => p.type === 'timeZoneName')?.value;
    return label ? `${safe.replace(/_/g, ' ')} · ${label}` : safe.replace(/_/g, ' ');
  } catch {
    return safe;
  }
}

/**
 * A short, deliberately incomplete list of zones for the manual override.
 *
 * The detected zone is always offered first by the picker, so this list only has
 * to cover the common cases someone might want to switch *to* — it is not a claim
 * that these are the only zones supported. Anything `Intl` accepts works.
 */
export const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Kathmandu',
  'Asia/Karachi',
  'Asia/Colombo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Africa/Lagos',
  'Africa/Nairobi',
];

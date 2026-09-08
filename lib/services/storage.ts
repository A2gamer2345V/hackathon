/**
 * Namespaced, SSR-safe localStorage access.
 *
 * Every read is defensive: a corrupt or foreign value must never crash the app
 * for a user who cannot easily recover from a blank screen.
 *
 * Note on the prefix: it changed from `mindcare:v1:` at the ElderEase rename,
 * and again to `v2` when records gained a patient id. Anything written under an
 * older prefix is simply ignored — a device that had an earlier prototype starts
 * fresh rather than half-migrated.
 */

const PREFIX = 'elderease:v2:';

export const STORAGE_KEYS = {
  session: 'session',
  users: 'users',
  language: 'language',
  role: 'role',
  /** Every patient this device knows about, keyed by id inside the array. */
  patients: 'patients',
  patientProfile: 'patient-profile',
  caregiverProfile: 'caregiver-profile',
  /** Which patient the caregiver is currently looking at. */
  activePatient: 'active-patient',
  activities: 'activities',
  reminders: 'reminders',
  gameSessions: 'game-sessions',
  achievements: 'achievements',
  family: 'family',
  careCircle: 'care-circle',
  alerts: 'alerts',
  seeded: 'seeded',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function available(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const probe = `${PREFIX}__probe__`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Private-mode Safari and locked-down browsers throw on write.
    return false;
  }
}

const memoryFallback = new Map<string, string>();

export function readValue<T>(key: StorageKey, fallback: T): T {
  const full = PREFIX + key;
  try {
    const raw = available() ? window.localStorage.getItem(full) : memoryFallback.get(full) ?? null;
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeValue<T>(key: StorageKey, value: T): void {
  const full = PREFIX + key;
  try {
    const raw = JSON.stringify(value);
    if (available()) window.localStorage.setItem(full, raw);
    else memoryFallback.set(full, raw);
  } catch {
    // Out of quota, or a value that cannot be serialised. Losing a preference
    // is acceptable; throwing here would break the screen the user is on.
  }
}

export function removeValue(key: StorageKey): void {
  const full = PREFIX + key;
  try {
    if (available()) window.localStorage.removeItem(full);
    else memoryFallback.delete(full);
  } catch {
    /* ignore */
  }
}

/** Clears every ElderEase key, leaving other apps on the origin untouched. */
export function clearAll(): void {
  try {
    if (available()) {
      const doomed: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key?.startsWith(PREFIX)) doomed.push(key);
      }
      doomed.forEach((key) => window.localStorage.removeItem(key));
    }
    memoryFallback.clear();
  } catch {
    /* ignore */
  }
}

/**
 * Namespaced, SSR-safe localStorage access — for display preferences only.
 *
 * This used to be the app's data store. It is not any more: patient records,
 * profiles, accounts and sessions all live on the server now (see `lib/server/`
 * and `app/api/`). What is left here is the one thing that genuinely belongs to
 * the device rather than the account: the chosen language, so the first paint
 * after a reload is already in the right language instead of flashing English
 * while the session request is in flight.
 *
 * Nothing in here is ever a source of truth. If a value is missing or corrupt the
 * caller falls back and carries on; a user who cannot recover from a blank screen
 * must never be shown one because a preference failed to parse.
 *
 * Note on the prefix: `v3` marks the move to server-side storage. Anything written
 * under `elderease:v2:` or the older `mindcare:v1:` is simply ignored — a device
 * that had an earlier prototype starts clean rather than half-migrated, and stale
 * patient records from the localStorage era can never be read back in.
 */

const PREFIX = 'elderease:v3:';

export const STORAGE_KEYS = {
  /** Chosen interface language. A device preference, not account data. */
  language: 'language',
  /** Which role the visitor picked on `/role`. A hint for the shell only — the
   *  authoritative role always comes from the server session. */
  role: 'role',
  /**
   * Which patient a caregiver was last looking at.
   *
   * A hint, in the strongest sense: the id written here grants nothing. It is
   * only ever used to pick from the roster the server just returned, so a value
   * that was edited by hand, left over from another account, or names a patient
   * who has since been deleted simply fails to match and the first patient is
   * used instead. Every request for that patient's data is still authorised
   * server-side against who owns them.
   *
   * It is stored per device because that is what it describes — a caregiver
   * mid-conversation about one person should not be thrown back to the top of
   * the list by a page reload.
   */
  activePatient: 'active-patient',
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

/**
 * In-memory cache of per-patient records.
 *
 * The API (`/api/patients/[patientId]/records`) is the source of truth. But the
 * UI reads and mutates records through synchronous services, so between a fetch
 * and the next mutation the patient's records live here — one plain object per
 * patient, keyed by record kind, shaped exactly like the record arrays the
 * services already return.
 *
 * Nothing here ever touches localStorage. The provider hydrates this cache from
 * the API on sign-in and patient switch, and `scheduleSync` flushes a mutation
 * back up through `api.putRecords`. The only state this module owns is the cache
 * itself, which is why it can be swapped, cleared and reloaded freely.
 */

import type {
  Achievement,
  CareCircleMember,
  CaregiverAlert,
  DailyActivity,
  FamilyMember,
  GameSession,
  PatientProfile,
  Reminder,
} from '@/lib/types';

/** Kinds, mirroring `RECORD_KINDS` on the server. See `lib/server/db.ts`. */
export const RECORD_KINDS = [
  'activities',
  'reminders',
  'gameSessions',
  'achievements',
  'family',
  'careCircle',
  'alerts',
] as const;

export type RecordKind = (typeof RECORD_KINDS)[number];

/** One patient → their records, each kind holding the same arrays the API stores. */
export interface PatientRecords {
  activities: DailyActivity[];
  reminders: Reminder[];
  gameSessions: GameSession[];
  achievements: Achievement[];
  family: FamilyMember[];
  careCircle: CareCircleMember[];
  alerts: CaregiverAlert[];
}

/** A `Record<string, unknown[]>` as the API sends it, keyed by kind. */
export type RecordsPayload = Record<string, unknown[]>;

const EMPTY = (): PatientRecords => ({
  activities: [],
  reminders: [],
  gameSessions: [],
  achievements: [],
  family: [],
  careCircle: [],
  alerts: [],
});

/** patientId → PatientRecords. Module-level so it survives provider re-renders. */
const byPatient = new Map<string, PatientRecords>();

export const recordsCache = {
  get(patientId: string): PatientRecords {
    let records = byPatient.get(patientId);
    if (!records) {
      records = EMPTY();
      byPatient.set(patientId, records);
    }
    return records;
  },

  /** Replaces a patient's records wholesale, e.g. after a fresh API fetch. */
  hydrate(patientId: string, payload: RecordsPayload): PatientRecords {
    const records = EMPTY();
    for (const kind of RECORD_KINDS) {
      const value = payload[kind];
      if (Array.isArray(value)) (records as unknown as Record<string, unknown[]>)[kind] = value;
    }
    byPatient.set(patientId, records);
    return records;
  },

  /** Removes one patient entirely — used on delete, so no orphan lingers. */
  drop(patientId: string): void {
    cancelSync(patientId);
    byPatient.delete(patientId);
  },

  /**
   * Clears everything. Called on sign-out and again on sign-in, so the next
   * account starts from nothing. Queued flushes are cancelled with it: a write
   * belonging to the account that just left must never land under the new one.
   */
  clear(): void {
    cancelAllSyncs();
    byPatient.clear();
  },

  /** Snapshot for the API: the arrays the server stores, by kind. */
  toPayload(patientId: string): RecordsPayload {
    const records = byPatient.get(patientId) ?? EMPTY();
    const payload: RecordsPayload = {};
    for (const kind of RECORD_KINDS) {
      payload[kind] = (records as unknown as Record<string, unknown[]>)[kind] ?? [];
    }
    return payload;
  },
};

/**
 * Reads the arrays the service layer writes to. These return live references to
 * the cache arrays so a service mutation can update one kind in place.
 */
export function cacheRead(patientId: string, kind: RecordKind): unknown[] {
  const records = recordsCache.get(patientId);
  return (records as unknown as Record<string, unknown[]>)[kind] ?? [];
}

/** Replaces one kind for a patient, and queues the write-through to the API. */
export function cacheWrite(patientId: string, kind: RecordKind, list: unknown[]): void {
  const records = recordsCache.get(patientId);
  (records as unknown as Record<string, unknown[]>)[kind] = list;
  scheduleSync(patientId);
}

/**
 * Every record of one kind across every patient in the cache.
 *
 * Needed when a mutation finds its target by id rather than by patient: the
 * reminder/family/alert services know only the id, so they must look the id up
 * across all loaded patients to discover which patient the record belongs to.
 * `cacheRead('', ...)` would consults a non-existent patient entry, hence this.
 */
export function cacheAll(kind: RecordKind): unknown[] {
  const out: unknown[] = [];
  for (const records of byPatient.values()) {
    const list = (records as unknown as Record<string, unknown[]>)[kind];
    if (Array.isArray(list)) out.push(...list);
  }
  return out;
}

/**
 * Hooks the API client in without importing it here (that would make this module
 * wait on a network call to construct). The provider sets this once.
 */
export type SyncFn = (patientId: string, payload: RecordsPayload) => void;
let sync: SyncFn | null = null;

export function setRecordSync(fn: SyncFn): void {
  sync = fn;
}

/**
 * Queues a patient's records for the API.
 *
 * Coalesced on a short timer because one user action often writes several kinds:
 * finishing a game records a session, ticks the day's activity and may unlock an
 * achievement. Without this that would be three requests racing each other, and
 * the last one to land would win — which is not necessarily the newest.
 */
const FLUSH_DELAY_MS = 120;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleSync(patientId: string): void {
  if (!patientId || !sync) return;
  const queued = pending.get(patientId);
  if (queued) clearTimeout(queued);
  pending.set(
    patientId,
    setTimeout(() => {
      pending.delete(patientId);
      sync?.(patientId, recordsCache.toPayload(patientId));
    }, FLUSH_DELAY_MS),
  );
}

/** Sends every queued flush now. Used before sign-out so nothing is lost. */
export function flushPendingSyncs(): void {
  for (const [patientId, timer] of pending) {
    clearTimeout(timer);
    sync?.(patientId, recordsCache.toPayload(patientId));
  }
  pending.clear();
}

/** Drops a queued flush without sending it. */
function cancelSync(patientId: string): void {
  const queued = pending.get(patientId);
  if (queued) clearTimeout(queued);
  pending.delete(patientId);
}

function cancelAllSyncs(): void {
  for (const timer of pending.values()) clearTimeout(timer);
  pending.clear();
}

/** The patient list, held here rather than in the provider so services can read it. */
let patients: PatientProfile[] = [];
export function setPatientList(list: PatientProfile[]): void {
  patients = list;
}
export function patientList(): PatientProfile[] {
  return patients;
}

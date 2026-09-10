import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * The real database.
 *
 * SQLite through Node's own `node:sqlite`, so there is no external service to
 * stand up and no driver to install: the file at `data/elderease.db` *is* the
 * database, and it is git-ignored because it holds real account rows.
 *
 * Everything in here is server-only. It is imported by route handlers under
 * `app/api/*` and by nothing else — a component that reached for it would fail
 * to compile for the browser, which is the point.
 *
 * Why the schema looks the way it does:
 *
 *  - `users` owns identity. Email is unique *and* case-insensitive at the
 *    database level, so two accounts cannot differ only by capitalisation no
 *    matter what the application layer forgets to check.
 *  - `caregivers` and `patients` are profiles hanging off a user row. A patient
 *    is linked to exactly one caregiver by `caregiver_id`, which is what makes
 *    "does this caregiver own this patient?" a single query rather than a guess.
 *  - `patient_records` holds each patient's activity — reminders, sessions,
 *    family, and so on — keyed by patient. It exists so deleting a patient
 *    genuinely removes their data through a foreign key, not just from a list on
 *    screen.
 *  - Foreign keys are enforced (`PRAGMA foreign_keys = ON`) and every child row
 *    cascades. Deleting a user deletes their profile, their sessions and, for a
 *    patient, everything recorded about them.
 */

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('patient', 'caregiver')),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  display_name   TEXT NOT NULL DEFAULT '',
  timezone       TEXT NOT NULL DEFAULT 'UTC',
  onboarded      INTEGER NOT NULL DEFAULT 0,
  is_demo        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

-- Uniqueness lives in the database, not only in the route handler.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS caregivers (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  relation_to_patient  TEXT NOT NULL DEFAULT 'Family',
  photo                TEXT,
  avatar_seed          TEXT NOT NULL,
  language             TEXT NOT NULL DEFAULT 'en',
  contact_phone        TEXT,
  timezone             TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
  id            TEXT PRIMARY KEY,
  user_id       TEXT UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  caregiver_id  TEXT NOT NULL REFERENCES caregivers (id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  timezone      TEXT NOT NULL,
  -- The remainder of PatientProfile. One column because the shape is owned by
  -- lib/types.ts and read only as a whole; the fields that need to be queried
  -- or joined on (id, name, owner, timezone) are real columns above.
  profile       TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS patients_caregiver ON patients (caregiver_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions (user_id);

-- Everything recorded about one patient, by kind. The foreign key is what makes
-- patient deletion a real cascade rather than a UI filter.
CREATE TABLE IF NOT EXISTS patient_records (
  patient_id  TEXT NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  payload     TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (patient_id, kind)
);
`;

/** Record kinds stored per patient. One row per patient per kind. */
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

export function isRecordKind(value: string): value is RecordKind {
  return (RECORD_KINDS as readonly string[]).includes(value);
}

/**
 * One connection per process, cached across hot reloads.
 *
 * `next dev` re-evaluates modules on change; without this the old handle would
 * leak and WAL would end up with a growing pile of readers.
 */
const globalForDb = globalThis as unknown as { __elderEaseDb?: DatabaseSync };

function open(): DatabaseSync {
  const file = path.join(process.cwd(), 'data', 'elderease.db');
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

export function database(): DatabaseSync {
  globalForDb.__elderEaseDb ??= open();
  return globalForDb.__elderEaseDb;
}

// ------------------------------------------------------------------- helpers

/**
 * What a caller may ask a row to be shaped like.
 *
 * `object` rather than `Record<string, unknown>` on purpose: the row types in
 * `repo.ts` are plain interfaces, and an interface has no index signature, so the
 * stricter constraint would reject exactly the types this is meant to serve.
 */
type Row = object;

/**
 * A bound parameter.
 *
 * Exported so callers that build a variable-length parameter list can type it as
 * `Param[]` instead of `unknown[]` — with `unknown[]`, a typo that puts an object
 * or a `Date` into the list would only surface as a runtime error from SQLite.
 */
export type Param = SQLInputValue;

export function queryAll<T extends Row = Record<string, unknown>>(
  sql: string,
  ...params: Param[]
): T[] {
  // node:sqlite hands back null-prototype objects; spreading gives plain ones so
  // ordinary property access and JSON serialisation behave as expected.
  return database()
    .prepare(sql)
    .all(...params)
    .map((row) => ({ ...row })) as T[];
}

export function queryOne<T extends Row = Record<string, unknown>>(
  sql: string,
  ...params: Param[]
): T | null {
  const row = database()
    .prepare(sql)
    .get(...params);
  return row ? ({ ...row } as T) : null;
}

export function run(sql: string, ...params: Param[]): void {
  database().prepare(sql).run(...params);
}

/**
 * Runs `work` inside a transaction, rolling back if it throws.
 *
 * Used for anything that must not half-happen — creating a patient is a user row
 * *and* a profile row, and a failure between the two would leave an account that
 * can sign in but has nowhere to land.
 */
export function transaction<T>(work: () => T): T {
  const db = database();
  db.exec('BEGIN');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

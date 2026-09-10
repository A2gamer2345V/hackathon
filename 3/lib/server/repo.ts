import type { LanguageCode } from '@/lib/i18n/languages';
import type { CaregiverProfile, PatientProfile } from '@/lib/types';
import { emptyCognitiveRecord, emptyPreferences } from '@/lib/types';
import { makeId } from '@/lib/utils';
import {
  isRecordKind,
  type Param,
  queryAll,
  queryOne,
  RECORD_KINDS,
  run,
  transaction,
} from './db';
import { hashPassword } from './password';

/**
 * Every read and write of an account, a profile or a patient's records.
 *
 * Route handlers call these; nothing else does. Keeping the SQL in one place means
 * the ownership rules ("a patient belongs to exactly one caregiver") are expressed
 * once, in the queries, rather than re-implemented per endpoint.
 */

const DEFAULT_ACCESSIBILITY: PatientProfile['accessibility'] = {
  textScale: 'large',
  highContrast: false,
  reducedMotion: false,
  voiceGuidance: true,
  notifications: true,
  offlineMode: true,
};

function now(): string {
  return new Date().toISOString();
}

// -------------------------------------------------------------------- emails

/** Deliberately permissive: one @, something either side, no spaces. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailTaken(email: string): boolean {
  return (
    queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = ? COLLATE NOCASE',
      normaliseEmail(email),
    ) !== null
  );
}

// --------------------------------------------------------------------- users

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: 'patient' | 'caregiver';
  status: 'active' | 'deactivated';
  display_name: string;
  timezone: string;
  onboarded: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export function findUserByEmail(email: string): UserRow | null {
  return queryOne<UserRow>(
    'SELECT * FROM users WHERE email = ? COLLATE NOCASE',
    normaliseEmail(email),
  );
}

export function findUserById(id: string): UserRow | null {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = ?', id);
}

export function updateUserFields(
  id: string,
  patch: { displayName?: string; onboarded?: boolean; timezone?: string },
): void {
  const sets: string[] = [];
  const values: Param[] = [];
  if (patch.displayName !== undefined) {
    sets.push('display_name = ?');
    values.push(patch.displayName);
  }
  if (patch.onboarded !== undefined) {
    sets.push('onboarded = ?');
    values.push(patch.onboarded ? 1 : 0);
  }
  if (patch.timezone !== undefined) {
    sets.push('timezone = ?');
    values.push(patch.timezone);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  values.push(now(), id);
  run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...values);
}

export function setUserPassword(id: string, password: string): void {
  run(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    hashPassword(password),
    now(),
    id,
  );
}

// ---------------------------------------------------------------- caregivers

interface CaregiverRow {
  id: string;
  user_id: string;
  name: string;
  relation_to_patient: string;
  photo: string | null;
  avatar_seed: string;
  language: string;
  contact_phone: string | null;
  timezone: string;
}

/**
 * A caregiver profile as the app understands it.
 *
 * `patientIds` is derived from the patients table rather than stored, so it cannot
 * drift out of step with who actually belongs to this caregiver.
 */
function rowToCaregiver(row: CaregiverRow): CaregiverProfile & { timezone: string } {
  const patientIds = queryAll<{ id: string }>(
    'SELECT id FROM patients WHERE caregiver_id = ? ORDER BY created_at',
    row.id,
  ).map((p) => p.id);

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    relationToPatient: row.relation_to_patient,
    photo: row.photo,
    avatarSeed: row.avatar_seed,
    language: row.language as LanguageCode,
    contactPhone: row.contact_phone ?? undefined,
    patientIds,
    timezone: row.timezone,
  };
}

export function caregiverByUserId(userId: string) {
  const row = queryOne<CaregiverRow>('SELECT * FROM caregivers WHERE user_id = ?', userId);
  return row ? rowToCaregiver(row) : null;
}

export function caregiverById(id: string) {
  const row = queryOne<CaregiverRow>('SELECT * FROM caregivers WHERE id = ?', id);
  return row ? rowToCaregiver(row) : null;
}

export interface CreateCaregiverInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  timezone: string;
  language?: string;
  relationToPatient?: string;
  /** Set only by the demo seeder. */
  demo?: { userId: string; caregiverId: string };
}

/**
 * Registers a caregiver and their own, empty profile.
 *
 * Nothing is copied from any other account. A fresh caregiver has no patients, no
 * phone but the one they typed, and no reminders, family or history — the demo
 * caregiver's data is a different row and stays that way.
 */
export function createCaregiver(input: CreateCaregiverInput) {
  const stamp = now();
  const userId = input.demo?.userId ?? makeId('user');
  const caregiverId = input.demo?.caregiverId ?? makeId('caregiver');
  const name = input.name.trim();

  return transaction(() => {
    run(
      `INSERT INTO users
         (id, email, password_hash, role, status, display_name, timezone, onboarded, is_demo, created_at, updated_at)
       VALUES (?, ?, ?, 'caregiver', 'active', ?, ?, ?, ?, ?, ?)`,
      userId,
      normaliseEmail(input.email),
      hashPassword(input.password),
      name,
      input.timezone,
      input.demo ? 1 : 0,
      input.demo ? 1 : 0,
      stamp,
      stamp,
    );
    run(
      `INSERT INTO caregivers
         (id, user_id, name, relation_to_patient, photo, avatar_seed, language, contact_phone, timezone, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      caregiverId,
      userId,
      name,
      input.relationToPatient ?? 'Family',
      name.toLowerCase().split(/\s+/)[0] || 'carer',
      input.language ?? 'en',
      input.phone?.trim() || null,
      input.timezone,
      stamp,
      stamp,
    );
    return { userId, caregiverId };
  });
}

export function updateCaregiverProfile(
  caregiverId: string,
  patch: Partial<CaregiverProfile> & { timezone?: string },
): void {
  const sets: string[] = [];
  const values: Param[] = [];
  // Only these columns are writable, and the type says so: `patientIds` is derived
  // from the patients table and `id`/`userId` are identity, so none of them appear
  // here and no patch can reach them.
  type Writable = 'name' | 'relationToPatient' | 'photo' | 'avatarSeed' | 'language' | 'contactPhone' | 'timezone';
  const map: Array<[Writable, string]> = [
    ['name', 'name'],
    ['relationToPatient', 'relation_to_patient'],
    ['photo', 'photo'],
    ['avatarSeed', 'avatar_seed'],
    ['language', 'language'],
    ['contactPhone', 'contact_phone'],
    ['timezone', 'timezone'],
  ];
  for (const [key, column] of map) {
    const value = patch[key];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    values.push(value ?? null);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  values.push(now(), caregiverId);
  run(`UPDATE caregivers SET ${sets.join(', ')} WHERE id = ?`, ...values);
}

// ------------------------------------------------------------------ patients

interface PatientRow {
  id: string;
  user_id: string | null;
  caregiver_id: string;
  name: string;
  timezone: string;
  profile: string;
  created_at: string;
}

/**
 * Rebuilds a `PatientProfile` from its row.
 *
 * The queryable columns win over the JSON blob, so a rename that touched only one
 * of the two can never produce a record that disagrees with itself.
 */
function rowToPatient(row: PatientRow): PatientProfile & { timezone: string; caregiverId: string } {
  const stored = JSON.parse(row.profile) as Partial<PatientProfile>;
  return {
    ...stored,
    id: row.id,
    userId: row.user_id,
    name: row.name,
    photo: stored.photo ?? null,
    avatarSeed: stored.avatarSeed ?? row.name.toLowerCase(),
    language: (stored.language ?? 'en') as LanguageCode,
    speechSpeed: stored.speechSpeed ?? 'normal',
    preferredActivities: stored.preferredActivities ?? [],
    accessibility: { ...DEFAULT_ACCESSIBILITY, ...(stored.accessibility ?? {}) },
    cognitive: { ...emptyCognitiveRecord(), ...(stored.cognitive ?? {}) },
    preferences: { ...emptyPreferences(), ...(stored.preferences ?? {}) },
    createdAt: row.created_at,
    timezone: row.timezone,
    caregiverId: row.caregiver_id,
  };
}

export type StoredPatient = ReturnType<typeof rowToPatient>;

export function patientById(id: string): StoredPatient | null {
  const row = queryOne<PatientRow>('SELECT * FROM patients WHERE id = ?', id);
  return row ? rowToPatient(row) : null;
}

export function patientByUserId(userId: string): StoredPatient | null {
  const row = queryOne<PatientRow>('SELECT * FROM patients WHERE user_id = ?', userId);
  return row ? rowToPatient(row) : null;
}

/**
 * Every patient belonging to one caregiver, optionally narrowed by a search term.
 *
 * The `caregiver_id = ?` clause is not decoration: it is what stops a search box
 * from reaching another caregiver's people, and it is applied in SQL rather than
 * after the fact so there is no moment when the wider list exists.
 */
export function patientsForCaregiver(caregiverId: string, search?: string): StoredPatient[] {
  const term = search?.trim();
  if (!term) {
    return queryAll<PatientRow>(
      'SELECT * FROM patients WHERE caregiver_id = ? ORDER BY created_at',
      caregiverId,
    ).map(rowToPatient);
  }
  const like = `%${term}%`;
  return queryAll<PatientRow>(
    `SELECT p.* FROM patients p
       LEFT JOIN users u ON u.id = p.user_id
      WHERE p.caregiver_id = ?
        AND (p.name LIKE ? COLLATE NOCASE OR u.email LIKE ? COLLATE NOCASE)
      ORDER BY p.created_at`,
    caregiverId,
    like,
    like,
  ).map(rowToPatient);
}

/** The login email for a patient, for the caregiver's own list. Never a hash. */
export function patientEmail(patientId: string): string | null {
  return (
    queryOne<{ email: string }>(
      `SELECT u.email FROM users u JOIN patients p ON p.user_id = u.id WHERE p.id = ?`,
      patientId,
    )?.email ?? null
  );
}

export interface CreatePatientInput {
  caregiverId: string;
  name: string;
  email: string;
  password: string;
  timezone: string;
  profile?: Partial<Omit<PatientProfile, 'id' | 'userId' | 'name'>>;
  /** Set only by the demo seeder. */
  demo?: { userId: string | null; patientId: string };
}

/**
 * Creates a patient: a login, a profile, and the link to the caregiver who made
 * it — in one transaction, so a half-made account cannot exist.
 *
 * Both ids are freshly generated. No existing record is looked up, reused or
 * overwritten, which is what stops adding a third patient from quietly editing
 * the first.
 */
export function createPatient(input: CreatePatientInput): StoredPatient {
  const stamp = now();
  const patientId = input.demo?.patientId ?? makeId('patient');
  const name = input.name.trim();
  const userId =
    input.demo !== undefined ? input.demo.userId : makeId('user');

  const profile: Partial<PatientProfile> = {
    photo: null,
    avatarSeed: name.toLowerCase().split(/\s+/)[0] || 'patient',
    language: 'en',
    speechSpeed: 'normal',
    preferredActivities: [],
    accessibility: DEFAULT_ACCESSIBILITY,
    cognitive: emptyCognitiveRecord(),
    preferences: emptyPreferences(),
    ...(input.profile ?? {}),
  };

  return transaction(() => {
    if (userId) {
      run(
        `INSERT INTO users
           (id, email, password_hash, role, status, display_name, timezone, onboarded, is_demo, created_at, updated_at)
         VALUES (?, ?, ?, 'patient', 'active', ?, ?, 1, ?, ?, ?)`,
        userId,
        normaliseEmail(input.email),
        hashPassword(input.password),
        name,
        input.timezone,
        input.demo ? 1 : 0,
        stamp,
        stamp,
      );
    }
    run(
      `INSERT INTO patients
         (id, user_id, caregiver_id, name, timezone, profile, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      patientId,
      userId,
      input.caregiverId,
      name,
      input.timezone,
      JSON.stringify(profile),
      stamp,
      stamp,
    );
    return patientById(patientId)!;
  });
}

/**
 * Patches a patient profile.
 *
 * Only ever touches the one `patients` row. This is the fix for the switching bug:
 * changing Rahul's accessibility settings writes to Rahul's row and nothing else —
 * not the caregiver's profile, not the previously active patient.
 */
export function updatePatientProfile(
  patientId: string,
  patch: Partial<Omit<PatientProfile, 'id' | 'userId'>> & { timezone?: string },
): StoredPatient | null {
  const existing = patientById(patientId);
  if (!existing) return null;

  const { timezone, ...profilePatch } = patch;
  const merged = { ...existing, ...profilePatch };

  // Identity and derived fields are server-owned and never taken from the patch.
  const blob: Partial<PatientProfile> = {
    age: merged.age,
    photo: merged.photo ?? null,
    avatarSeed: merged.avatarSeed,
    language: merged.language,
    speechSpeed: merged.speechSpeed,
    contactPhone: merged.contactPhone,
    emergencyContactName: merged.emergencyContactName,
    emergencyContactPhone: merged.emergencyContactPhone,
    notes: merged.notes,
    caregiverRelation: merged.caregiverRelation,
    preferredActivities: merged.preferredActivities,
    accessibility: merged.accessibility,
    cognitive: merged.cognitive,
    preferences: merged.preferences,
  };

  run(
    'UPDATE patients SET name = ?, timezone = ?, profile = ?, updated_at = ? WHERE id = ?',
    (profilePatch.name ?? existing.name).trim(),
    timezone ?? existing.timezone,
    JSON.stringify(blob),
    now(),
    patientId,
  );

  // The patient's own login shows their name, so keep the two in step.
  if (profilePatch.name && existing.userId) {
    updateUserFields(existing.userId, { displayName: profilePatch.name.trim() });
  }
  if (timezone && existing.userId) {
    updateUserFields(existing.userId, { timezone });
  }

  return patientById(patientId);
}

/**
 * Deletes a patient and everything attached to them.
 *
 * The login row goes too, which is the part that matters: after this, the
 * credentials the caregiver handed out no longer match any account, so there is
 * nothing left to sign in with. `patient_records` and the profile follow through
 * the foreign keys.
 */
export function deletePatient(patientId: string): void {
  const patient = patientById(patientId);
  if (!patient) return;
  transaction(() => {
    run('DELETE FROM patient_records WHERE patient_id = ?', patientId);
    run('DELETE FROM patients WHERE id = ?', patientId);
    if (patient.userId) {
      run('DELETE FROM auth_sessions WHERE user_id = ?', patient.userId);
      run('DELETE FROM users WHERE id = ?', patient.userId);
    }
  });
}

// ------------------------------------------------------------------- records

export function recordsFor(patientId: string): Record<string, unknown[]> {
  const rows = queryAll<{ kind: string; payload: string }>(
    'SELECT kind, payload FROM patient_records WHERE patient_id = ?',
    patientId,
  );
  const out: Record<string, unknown[]> = {};
  for (const kind of RECORD_KINDS) out[kind] = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload);
      if (Array.isArray(parsed)) out[row.kind] = parsed;
    } catch {
      // A corrupt blob should not take the whole screen down; an empty list is
      // the honest fallback and the next write repairs it.
      out[row.kind] = [];
    }
  }
  return out;
}

export function putRecords(patientId: string, records: Record<string, unknown[]>): void {
  const stamp = now();
  transaction(() => {
    for (const [kind, list] of Object.entries(records)) {
      if (!isRecordKind(kind) || !Array.isArray(list)) continue;
      run(
        `INSERT INTO patient_records (patient_id, kind, payload, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (patient_id, kind)
         DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
        patientId,
        kind,
        JSON.stringify(list),
        stamp,
      );
    }
  });
}

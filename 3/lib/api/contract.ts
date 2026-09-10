import type { CaregiverProfile, PatientProfile, User } from '@/lib/types';

/**
 * The shape of every request and response crossing the network boundary.
 *
 * Shared by both sides on purpose: the route handlers under `app/api/*` import
 * these, and so does the browser-side client in `lib/api/client.ts`. If a
 * response gains a field, both ends see it in the same commit.
 *
 * Note what is *not* here. There is no password field on any response type and no
 * `passwordHash` anywhere at all — a hash never crosses this boundary, and the
 * only direction a plaintext password travels is inward.
 */

// ------------------------------------------------------------------- errors

export type ApiErrorCode =
  /** Email or password did not match an active account. */
  | 'invalid-credentials'
  /** The account exists but has been deactivated. */
  | 'account-inactive'
  /** Another account already uses this email. */
  | 'email-taken'
  /** Email did not look like an email. */
  | 'invalid-email'
  /** Password did not meet the strength rules. */
  | 'weak-password'
  /** A required field was missing or malformed. */
  | 'invalid-input'
  /** No valid session cookie. */
  | 'unauthenticated'
  /** Signed in, but not allowed to touch this record. */
  | 'forbidden'
  | 'not-found'
  | 'server-error';

export interface ApiError {
  error: ApiErrorCode;
  /** Field-level detail, for forms. Never contains a password. */
  field?: string;
  /** Machine-readable reason for `weak-password`. */
  reason?: string;
}

// ------------------------------------------------------------------ session

/**
 * Who is signed in.
 *
 * `role` here is the authoritative one: it comes from the database row the
 * session cookie points at, and the browser cannot influence it.
 */
export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: User['role'];
  timezone: string;
  onboarded: boolean;
  isDemo: boolean;
}

export interface SessionResponse {
  user: SessionUser | null;
  /** Present when the signed-in user is a caregiver. */
  caregiver?: CaregiverProfile;
  /** Present when the signed-in user is a patient — their own record, only. */
  patient?: PatientProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
  /** The browser's detected IANA zone, applied only if the account has none yet. */
  timezone?: string;
}

export interface RegisterCaregiverRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  timezone: string;
  language?: string;
  relationToPatient?: string;
}

// ------------------------------------------------------------------ patients

export interface PatientsResponse {
  patients: PatientProfile[];
}

export interface PatientResponse {
  patient: PatientProfile;
}

/**
 * Creating a patient account.
 *
 * `email` and `password` are the credentials the caregiver hands to the person.
 * Everything else is profile detail, all optional, because the caregiver can
 * finish it on the profile screen afterwards.
 */
export interface CreatePatientRequest {
  name: string;
  email: string;
  password: string;
  timezone?: string;
  /** Any subset of the profile. `id`, `userId` and `name` are server-owned. */
  profile?: Partial<Omit<PatientProfile, 'id' | 'userId' | 'name'>>;
}

export interface UpdatePatientRequest {
  /** Any subset of the profile. Identity fields are ignored if sent. */
  patch: Partial<Omit<PatientProfile, 'id' | 'userId'>>;
}

export interface SetPatientPasswordRequest {
  password: string;
}

export interface ChangeOwnPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ------------------------------------------------------------------- records

export interface RecordsResponse {
  /** Keyed by record kind: activities, reminders, gameSessions, and so on. */
  records: Record<string, unknown[]>;
}

export interface PutRecordsRequest {
  /** Only the kinds present are replaced; anything omitted is left alone. */
  records: Record<string, unknown[]>;
}

// -------------------------------------------------------------------- guards

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'error' in value;
}

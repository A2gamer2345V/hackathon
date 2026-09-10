import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { ApiErrorCode, SessionUser } from '@/lib/api/contract';
import { queryOne, run } from './db';

/**
 * Server-side sessions.
 *
 * The browser holds an opaque random token in an httpOnly cookie and nothing
 * else. Every fact about the signed-in user — id, role, status — is read back out
 * of the database on each request, which is the whole point: the client cannot
 * claim to be a caregiver, because the client is never asked.
 *
 * The cookie is httpOnly (JavaScript cannot read it), sameSite=lax (it does not
 * ride along on cross-site POSTs), and `secure` in production. Sessions expire;
 * an expired row is rejected and swept.
 */

export const SESSION_COOKIE = 'elderease_session';

/** Fourteen days. Long enough that a caregiver is not re-typing a password daily. */
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface AuthedUser extends SessionUser {
  /** Present for a caregiver. */
  caregiverId?: string;
  /** Present for a patient — their own patient record id. */
  patientId?: string;
}

interface UserRow {
  id: string;
  email: string;
  role: 'patient' | 'caregiver';
  status: 'active' | 'deactivated';
  display_name: string;
  timezone: string;
  onboarded: number;
  is_demo: number;
}

function rowToUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    timezone: row.timezone,
    onboarded: row.onboarded === 1,
    isDemo: row.is_demo === 1,
  };
}

// ------------------------------------------------------------------- issuing

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_MS);

  run(
    'INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    token,
    userId,
    now.toISOString(),
    expires.toISOString(),
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) run('DELETE FROM auth_sessions WHERE token = ?', token);
  store.delete(SESSION_COOKIE);
}

// ------------------------------------------------------------------- reading

/**
 * The signed-in user, or null.
 *
 * Joins straight through to the profile row so callers get `caregiverId` /
 * `patientId` without a second query — those ids are what every ownership check
 * below is written against.
 */
export async function currentUser(): Promise<AuthedUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = queryOne<{ expires_at: string } & UserRow>(
    `SELECT s.expires_at, u.id, u.email, u.role, u.status, u.display_name, u.timezone,
            u.onboarded, u.is_demo
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    token,
  );
  if (!row) return null;

  // Expired, or the account was deactivated after the session was issued. Either
  // way the session is no longer usable, so it is removed rather than ignored.
  if (new Date(row.expires_at).getTime() <= Date.now() || row.status !== 'active') {
    run('DELETE FROM auth_sessions WHERE token = ?', token);
    return null;
  }

  const user = rowToUser(row);
  if (user.role === 'caregiver') {
    const profile = queryOne<{ id: string }>('SELECT id FROM caregivers WHERE user_id = ?', user.id);
    return { ...user, caregiverId: profile?.id };
  }
  const profile = queryOne<{ id: string }>('SELECT id FROM patients WHERE user_id = ?', user.id);
  return { ...user, patientId: profile?.id };
}

// -------------------------------------------------------------- authorization

/**
 * A refusal that a route handler turns into a response.
 *
 * Throwing rather than returning keeps the happy path of each handler readable:
 * the guard either yields a user or the request is over.
 */
export class AuthzError extends Error {
  code: ApiErrorCode;
  status: number;
  constructor(code: ApiErrorCode, status: number) {
    super(code);
    this.name = 'AuthzError';
    this.code = code;
    this.status = status;
  }
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await currentUser();
  if (!user) throw new AuthzError('unauthenticated', 401);
  return user;
}

export async function requireCaregiver(): Promise<AuthedUser & { caregiverId: string }> {
  const user = await requireUser();
  if (user.role !== 'caregiver' || !user.caregiverId) throw new AuthzError('forbidden', 403);
  return user as AuthedUser & { caregiverId: string };
}

/**
 * Confirms the signed-in user may read or write this patient, and says how.
 *
 * Two legitimate answers: the caregiver who owns the record, or the patient whose
 * own record it is. Anything else — another caregiver, another patient, a patient
 * poking at a sibling's id in the URL — is a 403, and the check is a database
 * query against `patients.caregiver_id`, not a comparison of names or list
 * positions.
 */
export async function requirePatientAccess(
  patientId: string,
): Promise<{ user: AuthedUser; as: 'caregiver' | 'patient' }> {
  const user = await requireUser();

  const row = queryOne<{ id: string; caregiver_id: string; user_id: string | null }>(
    'SELECT id, caregiver_id, user_id FROM patients WHERE id = ?',
    patientId,
  );
  if (!row) throw new AuthzError('not-found', 404);

  if (user.role === 'caregiver') {
    if (row.caregiver_id !== user.caregiverId) throw new AuthzError('forbidden', 403);
    return { user, as: 'caregiver' };
  }

  if (row.user_id !== user.id) throw new AuthzError('forbidden', 403);
  return { user, as: 'patient' };
}

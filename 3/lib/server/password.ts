import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing, on the server, with Node's own crypto.
 *
 * scrypt with a per-password random salt. No plaintext password is ever written
 * anywhere — not to the database, not to a log, not into a response body — and
 * the stored hash never leaves this module's callers on the server side.
 *
 * Parameters follow the usual interactive-login guidance: N = 2^15, r = 8, p = 1,
 * which costs roughly 32 MB and a few tens of milliseconds per verification. That
 * is deliberately slow enough to make offline guessing expensive.
 *
 * The stored format is self-describing so the cost parameters can be raised later
 * without invalidating existing rows:
 *
 *     scrypt$16384$8$1$<salt-base64>$<hash-base64>
 */

const COST = 1 << 14; // 16384
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** scrypt needs `N * r * 128` bytes; the default 32 MB cap is too low for N=16384, r=8. */
const MAX_MEMORY = 64 * 1024 * 1024;

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordProblem {
  code: 'too-short' | 'needs-letter' | 'needs-number';
}

/**
 * What counts as an acceptable password.
 *
 * Modest on purpose: a caregiver is typing this on behalf of someone else and
 * then reading it out to them, so the rules have to be explainable in one breath.
 * Length does the real work.
 */
export function checkPasswordStrength(password: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return { code: 'too-short' };
  if (!/[A-Za-z]/.test(password)) return { code: 'needs-letter' };
  if (!/[0-9]/.test(password)) return { code: 'needs-number' };
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: MAX_MEMORY,
  });
  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

/** Constant-time comparison, so a wrong password reveals nothing by timing. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const cost = Number.parseInt(parts[1], 10);
  const blockSize = Number.parseInt(parts[2], 10);
  const parallelism = Number.parseInt(parts[3], 10);
  if (!Number.isFinite(cost) || !Number.isFinite(blockSize) || !Number.isFinite(parallelism)) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], 'base64');
    expected = Buffer.from(parts[5], 'base64');
  } catch {
    return false;
  }

  const actual = scryptSync(password, salt, expected.length, {
    N: cost,
    r: blockSize,
    p: parallelism,
    maxmem: MAX_MEMORY,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

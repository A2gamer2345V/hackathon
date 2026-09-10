import type { LoginRequest, SessionResponse } from '@/lib/api/contract';
import { verifyPassword } from '@/lib/server/password';
import {
  caregiverByUserId,
  findUserByEmail,
  patientByUserId,
  updateUserFields,
} from '@/lib/server/repo';
import { body, fail, handle, ok, text } from '@/lib/server/respond';
import { ensureDemoSeed } from '@/lib/server/seed';
import { createSession } from '@/lib/server/session';
import { safeTimezone } from '@/lib/utils/timezone';

/**
 * Sign in. Both roles use this one endpoint.
 *
 * The role is *read from the database row*, never taken from the request — which
 * is what makes "patients cannot reach the caregiver dashboard" a fact about the
 * server rather than a redirect the browser could skip.
 *
 * Failures are deliberately vague: a wrong password and an email with no account
 * return the same `invalid-credentials`, so this endpoint cannot be used to
 * discover which addresses are registered.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    ensureDemoSeed();

    const input = await body<LoginRequest>(request);
    const email = text(input.email);
    const password = typeof input.password === 'string' ? input.password : '';

    if (!email || password === '') return fail('invalid-credentials', 401);

    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return fail('invalid-credentials', 401);
    }

    // A deleted patient's user row is gone entirely, so this covers the
    // soft-deactivated case: the account exists but may not be used.
    if (user.status !== 'active') return fail('account-inactive', 403);

    // First sign-in from a browser tells us the zone. Only ever filled in when
    // the account has none yet — a caregiver signing in from a trip must not
    // rewrite the timezone their reminders are scheduled against.
    const detected = text(input.timezone);
    if (detected && user.timezone === 'UTC' && safeTimezone(detected) !== 'UTC') {
      updateUserFields(user.id, { timezone: safeTimezone(detected) });
    }

    await createSession(user.id);

    const fresh = findUserByEmail(email)!;
    const response: SessionResponse = {
      user: {
        id: fresh.id,
        email: fresh.email,
        displayName: fresh.display_name,
        role: fresh.role,
        timezone: fresh.timezone,
        onboarded: fresh.onboarded === 1,
        isDemo: fresh.is_demo === 1,
      },
    };

    if (fresh.role === 'caregiver') {
      response.caregiver = caregiverByUserId(fresh.id) ?? undefined;
    } else {
      response.patient = patientByUserId(fresh.id) ?? undefined;
    }

    return ok(response);
  });
}

import type { SessionResponse } from '@/lib/api/contract';
import {
  caregiverByUserId,
  findUserByEmail,
  patientByUserId,
} from '@/lib/server/repo';
import { body, fail, handle, ok } from '@/lib/server/respond';
import { DEMO_CAREGIVER_EMAIL, DEMO_PATIENT_EMAIL, ensureDemoSeed } from '@/lib/server/seed';
import { createSession } from '@/lib/server/session';
import type { UserRole } from '@/lib/types';

/**
 * The demo door, kept separate from real authentication.
 *
 * It signs in to one of two seeded accounts and nothing else — the email is chosen
 * by this handler from the role, never supplied by the caller, so this endpoint
 * cannot be pointed at a real account. Those two rows are flagged `is_demo` in the
 * database and hold invented people.
 *
 * Real accounts still go through `/api/auth/login` with a password. This exists so
 * the app can be shown without registering first.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    ensureDemoSeed();

    const input = await body<{ role: UserRole }>(request);
    const role: UserRole = input.role === 'caregiver' ? 'caregiver' : 'patient';
    const email = role === 'caregiver' ? DEMO_CAREGIVER_EMAIL : DEMO_PATIENT_EMAIL;

    const user = findUserByEmail(email);
    if (!user || user.is_demo !== 1) return fail('not-found', 404);

    await createSession(user.id);

    const response: SessionResponse = {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        timezone: user.timezone,
        onboarded: true,
        isDemo: true,
      },
    };
    if (user.role === 'caregiver') {
      response.caregiver = caregiverByUserId(user.id) ?? undefined;
    } else {
      response.patient = patientByUserId(user.id) ?? undefined;
    }
    return ok(response);
  });
}

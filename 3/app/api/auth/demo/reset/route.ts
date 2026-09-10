import type { SessionResponse } from '@/lib/api/contract';
import { caregiverByUserId, patientByUserId } from '@/lib/server/repo';
import { fail, handle, ok } from '@/lib/server/respond';
import { resetDemoSeed } from '@/lib/server/seed';
import { requireUser } from '@/lib/server/session';

/**
 * Puts the demo data back to its starting state.
 *
 * Two gates, both on the server. The session must exist, and it must belong to a
 * demo account — `is_demo` is read from the users table, not sent by the browser.
 * A real caregiver who somehow posts here gets a 403 and their records are not
 * touched, which is the property that matters: "reset everything" is only ever
 * offered to, and only ever works for, the invented accounts.
 *
 * The session survives. Resetting the data should not throw the person out of the
 * demo they are in the middle of showing someone.
 */
export async function POST(): Promise<Response> {
  return handle(async () => {
    const user = await requireUser();
    if (!user.isDemo) return fail('forbidden', 403);

    resetDemoSeed();

    const response: SessionResponse = {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        timezone: user.timezone,
        onboarded: user.onboarded,
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

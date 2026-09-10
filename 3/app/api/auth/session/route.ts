import type { SessionResponse } from '@/lib/api/contract';
import { caregiverByUserId, patientByUserId } from '@/lib/server/repo';
import { handle, ok } from '@/lib/server/respond';
import { ensureDemoSeed } from '@/lib/server/seed';
import { currentUser } from '@/lib/server/session';

/**
 * Who am I?
 *
 * Called on every page load. It is how the browser learns its own role: the
 * client never stores or asserts a role, it asks. A missing or expired cookie
 * gets `{ user: null }` and a 200 — not being signed in is a normal answer, not
 * an error.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    ensureDemoSeed();

    const user = await currentUser();
    if (!user) return ok<SessionResponse>({ user: null });

    const response: SessionResponse = {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        timezone: user.timezone,
        onboarded: user.onboarded,
        isDemo: user.isDemo,
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

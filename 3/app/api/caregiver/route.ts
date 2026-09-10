import type { CaregiverProfile } from '@/lib/types';
import { caregiverById, updateCaregiverProfile, updateUserFields } from '@/lib/server/repo';
import { body, fail, handle, ok } from '@/lib/server/respond';
import { requireCaregiver } from '@/lib/server/session';
import { safeTimezone } from '@/lib/utils/timezone';

/**
 * The signed-in caregiver's own profile.
 *
 * Scoped to `caregiver.caregiverId` from the session, so this endpoint can only
 * ever read or write the caller's own row — there is no id parameter to tamper
 * with. Patient data does not pass through here at all: that separation is the
 * fix for settings bleeding between the two.
 */

export async function GET(): Promise<Response> {
  return handle(async () => {
    const session = await requireCaregiver();
    const caregiver = caregiverById(session.caregiverId);
    if (!caregiver) return fail('not-found', 404);
    return ok({ caregiver });
  });
}

export async function PATCH(request: Request): Promise<Response> {
  return handle(async () => {
    const session = await requireCaregiver();
    const input = await body<{ patch: Partial<CaregiverProfile> & { timezone?: string } }>(request);
    const patch = input.patch ?? {};

    // Ownership fields are server-owned. `patientIds` in particular is derived
    // from the patients table, so accepting it from a client would be meaningless
    // at best and a way to claim someone else's patient at worst.
    const {
      id: _id,
      userId: _userId,
      patientIds: _patientIds,
      ...safe
    } = patch as Record<string, unknown>;

    if (typeof safe.timezone === 'string') safe.timezone = safeTimezone(safe.timezone);

    updateCaregiverProfile(session.caregiverId, safe);
    if (typeof safe.name === 'string' && safe.name.trim()) {
      updateUserFields(session.id, { displayName: safe.name.trim(), onboarded: true });
    }
    if (typeof safe.timezone === 'string') {
      updateUserFields(session.id, { timezone: safe.timezone });
    }

    const caregiver = caregiverById(session.caregiverId);
    if (!caregiver) return fail('not-found', 404);
    return ok({ caregiver });
  });
}

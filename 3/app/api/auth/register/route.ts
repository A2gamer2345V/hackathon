import type { RegisterCaregiverRequest, SessionResponse } from '@/lib/api/contract';
import { checkPasswordStrength } from '@/lib/server/password';
import {
  caregiverByUserId,
  createCaregiver,
  emailTaken,
  findUserById,
  isValidEmail,
} from '@/lib/server/repo';
import { body, fail, handle, ok, text } from '@/lib/server/respond';
import { ensureDemoSeed } from '@/lib/server/seed';
import { createSession } from '@/lib/server/session';
import { safeTimezone } from '@/lib/utils/timezone';

/**
 * Caregiver self-registration. The only self-registration in the app.
 *
 * There is deliberately no patient equivalent: a patient account exists only
 * because a signed-in caregiver created it, so the patient always has someone
 * responsible for it. See `app/api/patients/route.ts`.
 *
 * A new caregiver starts genuinely empty — their own user row, their own profile
 * row, no patients. Nothing is copied from the demo account or from any other
 * caregiver, because there is no code path here that reads another account.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    ensureDemoSeed();

    const input = await body<RegisterCaregiverRequest>(request);
    const name = text(input.name);
    const email = text(input.email);
    const password = typeof input.password === 'string' ? input.password : '';

    if (!name) return fail('invalid-input', 400, { field: 'name' });
    if (!email || !isValidEmail(email)) return fail('invalid-email', 400, { field: 'email' });

    const weak = checkPasswordStrength(password);
    if (weak) return fail('weak-password', 400, { field: 'password', reason: weak.code });

    // Checked here for a clean message, and enforced by a unique index underneath
    // so a race cannot slip a duplicate past this.
    if (emailTaken(email)) return fail('email-taken', 409, { field: 'email' });

    const { userId } = createCaregiver({
      name,
      email,
      password,
      phone: text(input.phone),
      timezone: safeTimezone(text(input.timezone)),
      language: text(input.language) ?? 'en',
      relationToPatient: text(input.relationToPatient) ?? 'Family',
    });

    await createSession(userId);

    const user = findUserById(userId)!;
    const response: SessionResponse = {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: 'caregiver',
        timezone: user.timezone,
        onboarded: user.onboarded === 1,
        isDemo: false,
      },
      caregiver: caregiverByUserId(userId) ?? undefined,
    };
    return ok(response, 201);
  });
}

import type { SetPatientPasswordRequest } from '@/lib/api/contract';
import { checkPasswordStrength } from '@/lib/server/password';
import { patientById, setUserPassword } from '@/lib/server/repo';
import { run } from '@/lib/server/db';
import { body, fail, handle, ok } from '@/lib/server/respond';
import { requirePatientAccess } from '@/lib/server/session';

/**
 * A caregiver resetting their patient's password.
 *
 * This is a *replacement*, not a reveal: the caregiver types a new password and
 * reads it out to the person. There is no endpoint anywhere that returns an
 * existing password, because only a scrypt hash is stored.
 *
 * Every session belonging to that patient is dropped at the same time — a password
 * reset should end any device that was already signed in with the old one.
 *
 * The structure here is what a future "email me a reset link" flow would slot into:
 * issue a single-use token, and have its redemption call `setUserPassword` exactly
 * as this handler does.
 */
export async function PUT(
  request: Request,
  ctx: RouteContext<'/api/patients/[patientId]/password'>,
): Promise<Response> {
  return handle(async () => {
    const { patientId } = await ctx.params;
    const { as } = await requirePatientAccess(patientId);
    if (as !== 'caregiver') return fail('forbidden', 403);

    const input = await body<SetPatientPasswordRequest>(request);
    const password = typeof input.password === 'string' ? input.password : '';

    const weak = checkPasswordStrength(password);
    if (weak) return fail('weak-password', 400, { field: 'password', reason: weak.code });

    const patient = patientById(patientId);
    if (!patient) return fail('not-found', 404);
    // A patient added without a login has no credentials to reset.
    if (!patient.userId) return fail('invalid-input', 400, { field: 'password' });

    setUserPassword(patient.userId, password);
    run('DELETE FROM auth_sessions WHERE user_id = ?', patient.userId);

    return ok({ ok: true });
  });
}

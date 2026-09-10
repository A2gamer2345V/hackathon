import type { ChangeOwnPasswordRequest } from '@/lib/api/contract';
import { checkPasswordStrength, verifyPassword } from '@/lib/server/password';
import { findUserById, setUserPassword } from '@/lib/server/repo';
import { body, fail, handle, ok } from '@/lib/server/respond';
import { requireUser } from '@/lib/server/session';

/**
 * Changing your own password.
 *
 * Available to both roles. The current password must be supplied even though the
 * session already proves identity — that is what stops an unattended, already
 * signed-in device from being used to lock the owner out.
 *
 * Nothing about the existing password is ever returned, and the caregiver who
 * created a patient account cannot read the password back from anywhere: they can
 * only replace it (see the reset endpoint).
 */
export async function PUT(request: Request): Promise<Response> {
  return handle(async () => {
    const session = await requireUser();
    const input = await body<ChangeOwnPasswordRequest>(request);

    const current = typeof input.currentPassword === 'string' ? input.currentPassword : '';
    const next = typeof input.newPassword === 'string' ? input.newPassword : '';

    const user = findUserById(session.id);
    if (!user) return fail('not-found', 404);

    if (!verifyPassword(current, user.password_hash)) {
      return fail('invalid-credentials', 403, { field: 'currentPassword' });
    }

    const weak = checkPasswordStrength(next);
    if (weak) return fail('weak-password', 400, { field: 'newPassword', reason: weak.code });

    setUserPassword(user.id, next);
    return ok({ ok: true });
  });
}

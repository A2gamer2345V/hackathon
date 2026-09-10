import type { PatientResponse, UpdatePatientRequest } from '@/lib/api/contract';
import {
  deletePatient,
  patientById,
  patientEmail,
  updatePatientProfile,
} from '@/lib/server/repo';
import { body, fail, handle, ok } from '@/lib/server/respond';
import { requirePatientAccess } from '@/lib/server/session';
import { safeTimezone } from '@/lib/utils/timezone';

/**
 * One patient.
 *
 * `requirePatientAccess` is the gate on every method, and it is a database
 * question: is this patient row owned by the signed-in caregiver, or is it the
 * signed-in patient's own row? Anything else is 403 — including a caregiver
 * typing another caregiver's patient id straight into the URL.
 */

export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/patients/[patientId]'>,
): Promise<Response> {
  return handle(async () => {
    const { patientId } = await ctx.params;
    const { as } = await requirePatientAccess(patientId);

    const patient = patientById(patientId);
    if (!patient) return fail('not-found', 404);

    // The login email is shown to the caregiver who manages the account. The
    // password is not, and cannot be: only its hash exists and that never leaves
    // the server.
    return ok<PatientResponse & { email?: string }>({
      patient,
      email: as === 'caregiver' ? patientEmail(patientId) ?? undefined : undefined,
    });
  });
}

/**
 * Updates the profile.
 *
 * Writes to this patient's row and nothing else. A patient may edit their own
 * record too — that is how their accessibility settings save — and in neither case
 * does the write touch the caregiver's profile or any sibling patient.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/patients/[patientId]'>,
): Promise<Response> {
  return handle(async () => {
    const { patientId } = await ctx.params;
    await requirePatientAccess(patientId);

    const input = await body<UpdatePatientRequest>(request);
    const patch = (input.patch ?? {}) as UpdatePatientRequest['patch'] & { timezone?: string };
    if (typeof patch !== 'object') return fail('invalid-input', 400);

    // Identity is server-owned: a client cannot re-point a record at another user.
    const { id: _id, userId: _userId, createdAt: _createdAt, ...safe } = patch as Record<
      string,
      unknown
    >;
    if (typeof safe.timezone === 'string') safe.timezone = safeTimezone(safe.timezone);

    const patient = updatePatientProfile(patientId, safe);
    if (!patient) return fail('not-found', 404);
    return ok<PatientResponse>({ patient });
  });
}

/**
 * Deletes the patient — the account, the profile and every record attached.
 *
 * Caregiver only: a patient cannot delete themselves out of their caregiver's
 * care. Afterwards the login no longer exists, so the credentials that were handed
 * out stop working; there is no orphaned user row left behind to sign in with.
 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<'/api/patients/[patientId]'>,
): Promise<Response> {
  return handle(async () => {
    const { patientId } = await ctx.params;
    const { as } = await requirePatientAccess(patientId);
    if (as !== 'caregiver') return fail('forbidden', 403);

    deletePatient(patientId);
    return ok({ ok: true });
  });
}

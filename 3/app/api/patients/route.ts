import type { CreatePatientRequest, PatientResponse, PatientsResponse } from '@/lib/api/contract';
import { checkPasswordStrength } from '@/lib/server/password';
import {
  createPatient,
  emailTaken,
  isValidEmail,
  patientsForCaregiver,
} from '@/lib/server/repo';
import { body, fail, handle, ok, text } from '@/lib/server/respond';
import { requireCaregiver } from '@/lib/server/session';
import { safeTimezone } from '@/lib/utils/timezone';

/**
 * The caregiver's own patients — list, search, and create.
 *
 * Every query in here is filtered by `caregiver_id` in SQL. There is no endpoint
 * that lists all patients, and no parameter that widens the search beyond the
 * signed-in caregiver's own people, so a search box cannot become a way to browse
 * the database.
 */

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const caregiver = await requireCaregiver();
    const search = new URL(request.url).searchParams.get('q') ?? undefined;
    const patients = patientsForCaregiver(caregiver.caregiverId, search);
    return ok<PatientsResponse>({ patients });
  });
}

/**
 * Creates a patient account.
 *
 * A caregiver session is required first — that is checked before anything is
 * read from the body. Then: the email must be well-formed and unused, the
 * password must meet the rules, and both the login and the profile are written in
 * one transaction with fresh ids. No existing record is consulted, so creating a
 * third patient cannot touch the first two.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const caregiver = await requireCaregiver();
    const input = await body<CreatePatientRequest>(request);

    const name = text(input.name);
    const email = text(input.email);
    const password = typeof input.password === 'string' ? input.password : '';

    if (!name) return fail('invalid-input', 400, { field: 'name' });
    if (!email || !isValidEmail(email)) return fail('invalid-email', 400, { field: 'email' });

    const weak = checkPasswordStrength(password);
    if (weak) return fail('weak-password', 400, { field: 'password', reason: weak.code });

    if (emailTaken(email)) return fail('email-taken', 409, { field: 'email' });

    // Defaults to the caregiver's zone as the most likely answer, but it is the
    // patient's own field from here on: changing the caregiver's zone later never
    // rewrites it.
    const timezone = safeTimezone(text(input.timezone) ?? caregiver.timezone);

    const patient = createPatient({
      caregiverId: caregiver.caregiverId,
      name,
      email,
      password,
      timezone,
      profile: input.profile,
    });

    return ok<PatientResponse>({ patient }, 201);
  });
}

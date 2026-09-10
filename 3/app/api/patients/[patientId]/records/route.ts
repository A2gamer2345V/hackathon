import type { PutRecordsRequest, RecordsResponse } from '@/lib/api/contract';
import { putRecords, recordsFor } from '@/lib/server/repo';
import { body, fail, handle, ok } from '@/lib/server/respond';
import { requirePatientAccess } from '@/lib/server/session';

/**
 * Everything recorded about one patient: reminders, game sessions, family,
 * achievements, care circle, alerts, today's plan.
 *
 * Same gate as the profile — a caregiver who owns the record, or the patient
 * whose record it is. This is the endpoint that makes "Raj cannot see Rahul's
 * history" true on the server: the patient id is checked against the session's
 * own patient row before a single byte is read.
 *
 * The payload is stored per kind, and a PUT replaces only the kinds it names.
 * That keeps a screen that edits reminders from having to send back the game
 * history it never touched.
 */

export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/patients/[patientId]/records'>,
): Promise<Response> {
  return handle(async () => {
    const { patientId } = await ctx.params;
    await requirePatientAccess(patientId);
    return ok<RecordsResponse>({ records: recordsFor(patientId) });
  });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<'/api/patients/[patientId]/records'>,
): Promise<Response> {
  return handle(async () => {
    const { patientId } = await ctx.params;
    await requirePatientAccess(patientId);

    const input = await body<PutRecordsRequest>(request);
    const records = input.records;
    if (typeof records !== 'object' || records === null) {
      return fail('invalid-input', 400, { field: 'records' });
    }

    putRecords(patientId, records as Record<string, unknown[]>);
    return ok<RecordsResponse>({ records: recordsFor(patientId) });
  });
}

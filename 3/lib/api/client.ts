import type {
  ApiError,
  ApiErrorCode,
  ChangeOwnPasswordRequest,
  CreatePatientRequest,
  LoginRequest,
  PatientResponse,
  PatientsResponse,
  PutRecordsRequest,
  RecordsResponse,
  RegisterCaregiverRequest,
  SessionResponse,
} from './contract';
import type { CaregiverProfile, PatientProfile } from '@/lib/types';

/**
 * The browser's side of the API.
 *
 * Every call sends the session cookie and nothing else — no user id, no role, no
 * patient id that the server does not re-check. That is deliberate: the client is
 * a view of server state, not a source of truth about who it is.
 *
 * Failures arrive as `ApiRequestError`, carrying the server's error code so a form
 * can say something specific ("this email is already in use") without parsing
 * prose.
 */

export class ApiRequestError extends Error {
  code: ApiErrorCode;
  status: number;
  field?: string;
  reason?: string;

  constructor(status: number, payload: ApiError) {
    super(payload.error);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = payload.error;
    this.field = payload.field;
    this.reason = payload.reason;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      // Same-origin cookies, and never a cached answer: session state must be
      // read fresh or a signed-out tab could keep showing a signed-in shell.
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        init?.body !== undefined
          ? { 'content-type': 'application/json', ...(init?.headers ?? {}) }
          : init?.headers,
    });
  } catch {
    // Offline, or the dev server restarted mid-request.
    throw new ApiRequestError(0, { error: 'server-error' });
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    const error =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? (payload as ApiError)
        : { error: 'server-error' as ApiErrorCode };
    throw new ApiRequestError(response.status, error);
  }

  return payload as T;
}

function json(body: unknown): RequestInit {
  return { body: JSON.stringify(body) };
}

export const api = {
  // ------------------------------------------------------------------ auth

  session(): Promise<SessionResponse> {
    return request<SessionResponse>('/api/auth/session');
  },

  login(input: LoginRequest): Promise<SessionResponse> {
    return request<SessionResponse>('/api/auth/login', { method: 'POST', ...json(input) });
  },

  registerCaregiver(input: RegisterCaregiverRequest): Promise<SessionResponse> {
    return request<SessionResponse>('/api/auth/register', { method: 'POST', ...json(input) });
  },

  /** Signs in to one of the two seeded demo accounts. Separate from real login. */
  demo(role: 'patient' | 'caregiver'): Promise<SessionResponse> {
    return request<SessionResponse>('/api/auth/demo', { method: 'POST', ...json({ role }) });
  },

  /** Restores the demo fixtures. Refused with 403 for any non-demo session. */
  resetDemo(): Promise<SessionResponse> {
    return request<SessionResponse>('/api/auth/demo/reset', { method: 'POST' });
  },

  logout(): Promise<{ ok: true }> {
    return request<{ ok: true }>('/api/auth/logout', { method: 'POST' });
  },

  changeOwnPassword(input: ChangeOwnPasswordRequest): Promise<{ ok: true }> {
    return request<{ ok: true }>('/api/auth/password', { method: 'PUT', ...json(input) });
  },

  // -------------------------------------------------------------- caregiver

  caregiver(): Promise<{ caregiver: CaregiverProfile }> {
    return request<{ caregiver: CaregiverProfile }>('/api/caregiver');
  },

  updateCaregiver(
    patch: Partial<CaregiverProfile> & { timezone?: string },
  ): Promise<{ caregiver: CaregiverProfile }> {
    return request<{ caregiver: CaregiverProfile }>('/api/caregiver', {
      method: 'PATCH',
      ...json({ patch }),
    });
  },

  // --------------------------------------------------------------- patients

  /** The signed-in caregiver's patients. `search` narrows within them only. */
  patients(search?: string): Promise<PatientsResponse> {
    const query = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
    return request<PatientsResponse>(`/api/patients${query}`);
  },

  patient(patientId: string): Promise<PatientResponse & { email?: string }> {
    return request<PatientResponse & { email?: string }>(`/api/patients/${patientId}`);
  },

  createPatient(input: CreatePatientRequest): Promise<PatientResponse> {
    return request<PatientResponse>('/api/patients', { method: 'POST', ...json(input) });
  },

  updatePatient(
    patientId: string,
    patch: Partial<Omit<PatientProfile, 'id' | 'userId'>> & { timezone?: string },
  ): Promise<PatientResponse> {
    return request<PatientResponse>(`/api/patients/${patientId}`, {
      method: 'PATCH',
      ...json({ patch }),
    });
  },

  deletePatient(patientId: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/patients/${patientId}`, { method: 'DELETE' });
  },

  setPatientPassword(patientId: string, password: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/patients/${patientId}/password`, {
      method: 'PUT',
      ...json({ password }),
    });
  },

  // ---------------------------------------------------------------- records

  records(patientId: string): Promise<RecordsResponse> {
    return request<RecordsResponse>(`/api/patients/${patientId}/records`);
  },

  putRecords(patientId: string, records: PutRecordsRequest['records']): Promise<RecordsResponse> {
    return request<RecordsResponse>(`/api/patients/${patientId}/records`, {
      method: 'PUT',
      ...json({ records }),
    });
  },
};

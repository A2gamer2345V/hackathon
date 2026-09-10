import type { ApiError, ApiErrorCode } from '@/lib/api/contract';
import { AuthzError } from './session';

/**
 * Turning results and refusals into responses.
 *
 * One place, so every endpoint fails the same shape and the browser-side client
 * has exactly one error format to understand.
 */

export function ok<T>(body: T, status = 200): Response {
  return Response.json(body, { status });
}

export function fail(
  code: ApiErrorCode,
  status: number,
  extra?: Omit<ApiError, 'error'>,
): Response {
  return Response.json({ error: code, ...extra } satisfies ApiError, { status });
}

/**
 * Wraps a handler so an `AuthzError` becomes its status and anything unexpected
 * becomes a 500 without leaking a stack trace to the client.
 */
export async function handle(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AuthzError) return fail(error.code, error.status);
    console.error('[api]', error);
    return fail('server-error', 500);
  }
}

/** Reads a JSON body, tolerating an empty or malformed one. */
export async function body<T>(request: Request): Promise<Partial<T>> {
  try {
    const parsed = await request.json();
    return typeof parsed === 'object' && parsed !== null ? (parsed as Partial<T>) : {};
  } catch {
    return {};
  }
}

/** A trimmed string, or undefined when the field was absent or blank. */
export function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

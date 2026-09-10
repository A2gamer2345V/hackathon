import { handle, ok } from '@/lib/server/respond';
import { destroySession } from '@/lib/server/session';

/**
 * Sign out.
 *
 * The session row is deleted, not just the cookie: a copied token is useless
 * afterwards. Always succeeds, including when there was no session to begin with.
 */
export async function POST(): Promise<Response> {
  return handle(async () => {
    await destroySession();
    return ok({ ok: true });
  });
}

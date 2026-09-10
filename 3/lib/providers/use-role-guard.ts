'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/providers/app-state-provider';
import type { UserRole } from '@/lib/types';

/**
 * Keeps a shell on the right side of the app for whoever is signed in.
 *
 * Three outcomes, in order:
 *
 *   - **Not signed in** → back to the front door. Nothing is rendered in between,
 *     so a signed-out visitor never sees a caregiver frame with empty panels.
 *   - **Wrong role** → sent to their own side of the app. A patient who types
 *     `/care/patients` lands on `/app`, not on a caregiver screen with somebody
 *     else's roster in it.
 *   - **Allowed** → nothing happens.
 *
 * This is a courtesy, not the security boundary. The real check is server-side: a
 * patient session calling `/api/patients` gets a 403 whatever the browser renders
 * (see `requireCaregiver` in `lib/server/session.ts`). If this hook were deleted
 * the URL would still return no data — it exists so the *screen* matches the
 * permission, rather than showing a frame that can never be filled.
 */
export function useRoleGuard(allowed: UserRole[]): { checking: boolean; allowed: boolean } {
  const { hydrated, user, role } = useAppState();
  const router = useRouter();

  const permitted = role !== null && allowed.includes(role);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!permitted) {
      // Their own home, chosen from the server's role — not from anything the
      // browser asked for.
      router.replace(role === 'caregiver' ? '/care' : '/app');
    }
  }, [hydrated, permitted, role, router, user]);

  return { checking: !hydrated, allowed: hydrated && Boolean(user) && permitted };
}

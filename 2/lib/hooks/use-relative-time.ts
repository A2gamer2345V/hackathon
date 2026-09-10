'use client';

import { useCallback } from 'react';
import { useTranslation } from '@/lib/providers/language-provider';
import { relativeTimeParts } from '@/lib/utils/datetime';

/**
 * Turns a timestamp into a short phrase in the user's language — "just now",
 * "2 hours ago", "yesterday". Returns an empty string for an unparseable date,
 * so a caller never renders the word "Invalid".
 */
export function useRelativeTime(): (iso: string) => string {
  const { t } = useTranslation();
  return useCallback(
    (iso: string) => {
      const parts = relativeTimeParts(iso);
      return parts ? t(parts.key, parts.values) : '';
    },
    [t],
  );
}

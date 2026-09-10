'use client';

import { CloudOff, Wifi } from 'lucide-react';
import { useNetwork } from '@/lib/providers/network-provider';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * Honest connection status. Everything the patient does is stored on the
 * device, so going offline is a notice, not an error.
 */
export function OfflineBanner() {
  const { online, justReconnected } = useNetwork();
  const { t } = useTranslation();

  if (online && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`no-print sticky top-0 z-50 flex items-center justify-center gap-2.5 px-4 py-2.5 text-center text-sm font-semibold sm:text-base ${
        online ? 'bg-sage-100 text-sage-800' : 'bg-sun-100 text-sun-600'
      }`}
    >
      {online ? (
        <>
          <Wifi aria-hidden className="size-5 shrink-0" />
          <span>{t('offline.back')}</span>
        </>
      ) : (
        <>
          <CloudOff aria-hidden className="size-5 shrink-0" />
          <span>
            <strong className="font-bold">{t('offline.title')}</strong>
            {' — '}
            {t('offline.desc')}
          </span>
        </>
      )}
    </div>
  );
}

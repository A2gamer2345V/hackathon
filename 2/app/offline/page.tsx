'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * The page the service worker serves when a navigation cannot be reached and
 * the destination was never cached.
 *
 * It is reassuring rather than apologetic: nothing has been lost, because the
 * profile, reminders and progress are all on the device.
 */
export default function OfflinePage() {
  const { t } = useTranslation();

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-10 text-center focus:outline-none"
    >
      <Logo size="md" />

      <Card tone="sun" className="w-full">
        <span
          aria-hidden
          className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-white/70 text-sun-600"
        >
          <CloudOff className="size-8" />
        </span>
        <h1 className="font-display text-2xl font-semibold text-ink">{t('offline.title')}</h1>
        <p className="mx-auto mt-2 max-w-prose text-lg text-ink-soft">{t('offline.desc')}</p>

        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            iconLeft={<RefreshCw aria-hidden className="size-5" />}
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </Button>
          <ButtonLink href="/app" variant="secondary" size="lg">
            {t('nav.home')}
          </ButtonLink>
        </div>
      </Card>

      <p className="text-base text-ink-soft">{t('offline.ready')}</p>
    </main>
  );
}

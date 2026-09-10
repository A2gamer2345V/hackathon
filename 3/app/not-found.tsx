'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Compass, Home } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * The 404. Next renders this for any address that matches no route.
 *
 * "Home" is not a fixed place: it is wherever the person signed in belongs — the
 * caregiver dashboard, the patient's day, or the front door if nobody is signed
 * in. Sending a patient to `/care` from here would only bounce them straight back
 * out again, so the role decides.
 *
 * Deliberately calm. A mistyped URL is not an error the reader caused, and for
 * someone who is easily unsettled a page shouting about failure is worse than the
 * missing page itself.
 */
export default function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, role } = useAppState();

  const home = !user ? '/' : role === 'caregiver' ? '/care' : '/app';

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-10 text-center focus:outline-none"
    >
      <Logo size="md" />

      <Card tone="sage" className="w-full">
        <span
          aria-hidden
          className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-white/70 text-sage-600"
        >
          <Compass className="size-8" />
        </span>
        <h1 className="font-display text-2xl font-semibold text-ink">{t('missing.title')}</h1>
        <p className="mx-auto mt-2 max-w-prose text-lg text-ink-soft">{t('missing.desc')}</p>

        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href={home} size="lg" iconLeft={<Home aria-hidden className="size-5" />}>
            {t('missing.home')}
          </ButtonLink>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.back()}
            iconLeft={<ArrowLeft aria-hidden className="size-5" />}
          >
            {t('missing.back')}
          </Button>
        </div>
      </Card>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, BellRing, Gamepad2, Mic, Users } from 'lucide-react';
import { LogoArtwork } from '@/components/brand/logo';
import { CompanionCharacter } from '@/components/companion/companion-character';
import { Button, ButtonLink } from '@/components/ui/button';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';

export default function WelcomePage() {
  const { t } = useTranslation();
  const { hydrated, user, role } = useAppState();
  const router = useRouter();
  const motionOk = useMotionOk();

  const points = [
    { icon: Gamepad2, text: t('welcome.point.games') },
    { icon: BellRing, text: t('welcome.point.reminders') },
    { icon: Users, text: t('welcome.point.family') },
  ];

  const resumeHref = role === 'caregiver' ? '/care' : '/app';

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cream">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 size-[26rem] rounded-full bg-sage-100/70" />
        <div className="absolute -right-24 bottom-0 size-[22rem] rounded-full bg-lilac-100/60" />
        <div className="absolute right-1/4 top-10 size-40 rounded-full bg-sun-100/60" />
      </div>

      <main
        id="main"
        tabIndex={-1}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-4 py-10 focus:outline-none sm:px-6 lg:flex-row lg:gap-16 lg:py-16"
      >
        {/* -------------------------------------------------------- copy */}
        <motion.div
          initial={motionOk ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl text-center lg:text-left"
        >
          {/* The full artwork only appears here, where it renders large enough for
              the illustration and tagline to actually be readable. */}
          <LogoArtwork size={208} priority className="mx-auto lg:mx-0" />

          <h1 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl">
            {t('common.tagline')}
          </h1>

          <p className="mx-auto mt-4 max-w-prose text-lg text-ink-soft lg:mx-0">
            {t('welcome.body')}
          </p>

          <ul className="mx-auto mt-7 grid max-w-md gap-3 text-left lg:mx-0">
            {points.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-[var(--radius-control)] border border-line bg-surface-raised/80 p-3.5"
              >
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-sage-100 text-sage-700"
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-medium text-ink">{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:justify-start">
            <ButtonLink
              href="/language"
              size="xl"
              iconRight={<ArrowRight aria-hidden className="size-5" />}
              className="sm:w-auto"
            >
              {t('welcome.getStarted')}
            </ButtonLink>

            {hydrated && user ? (
              <Button variant="secondary" size="xl" onClick={() => router.push(resumeHref)}>
                {t('auth.welcomeBack')}
              </Button>
            ) : null}
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-ink-muted lg:justify-start">
            <Mic aria-hidden className="size-4" />
            {t('welcome.voiceHint')}
          </p>
        </motion.div>

        {/* --------------------------------------------------- character */}
        <motion.div
          initial={motionOk ? { opacity: 0, scale: 0.94 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="relative flex w-full max-w-sm items-center justify-center"
        >
          <div className="relative grid aspect-square w-full max-w-[22rem] place-items-center rounded-[3rem] border border-sage-200 bg-surface-raised shadow-soft">
            <div
              aria-hidden
              className="absolute inset-6 rounded-[2.4rem] border border-dashed border-sage-200"
            />
            <CompanionCharacter state="encouraging" size={220} />
            <p className="absolute bottom-6 left-1/2 w-[85%] -translate-x-1/2 rounded-[var(--radius-control)] bg-sage-50 px-4 py-2.5 text-center text-sm font-semibold text-sage-800">
              {t('companion.name')}
            </p>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 text-center text-sm text-ink-muted sm:px-6">
        <p className="mx-auto max-w-2xl">{t('settings.aboutBody')}</p>
        <Link
          href="/login"
          className="mt-1 inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-100"
        >
          {t('auth.haveAccount')} {t('auth.login')}
        </Link>
      </footer>
    </div>
  );
}

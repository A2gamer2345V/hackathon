'use client';

import { useRouter } from 'next/navigation';
import { HeartHandshake, UserRound } from 'lucide-react';
import { OnboardingShell } from '@/components/layout/onboarding-shell';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import type { UserRole } from '@/lib/types';

/**
 * "I am a…" — the choice that decides which of the two experiences is built
 * for the rest of the session.
 */
export default function RolePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setRole } = useAppState();

  const choose = (role: UserRole) => {
    setRole(role);
    router.push('/login');
  };

  const options: {
    role: UserRole;
    title: string;
    description: string;
    icon: typeof UserRound;
    tone: string;
    iconTone: string;
  }[] = [
    {
      role: 'patient',
      title: t('role.patient.title'),
      description: t('role.patient.desc'),
      icon: UserRound,
      tone: 'hover:border-sage-400 hover:bg-sage-50',
      iconTone: 'bg-sage-100 text-sage-700',
    },
    {
      role: 'caregiver',
      title: t('role.caregiver.title'),
      description: t('role.caregiver.desc'),
      icon: HeartHandshake,
      tone: 'hover:border-lilac-300 hover:bg-lilac-50',
      iconTone: 'bg-lilac-100 text-lilac-600',
    },
  ];

  return (
    <OnboardingShell step={2} totalSteps={4} backHref="/language">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t('role.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-lg text-ink-soft">{t('role.subtitle')}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.role}
              type="button"
              onClick={() => choose(option.role)}
              className={`flex h-full flex-col items-center gap-4 rounded-[var(--radius-tile)] border border-line bg-surface-raised p-7 text-center shadow-soft transition-colors ${option.tone}`}
            >
              <span
                aria-hidden
                className={`grid size-20 place-items-center rounded-full ${option.iconTone}`}
              >
                <Icon className="size-10" />
              </span>
              <span className="font-display text-2xl font-semibold text-ink">{option.title}</span>
              <span className="text-base text-ink-soft">{option.description}</span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

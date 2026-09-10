'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { useTranslation } from '@/lib/providers/language-provider';
import { cn } from '@/lib/utils';

/**
 * Shared frame for the onboarding flow: welcome, language, role, sign-in and
 * profile setup. One column, generous spacing, a clear step indicator.
 */
export function OnboardingShell({
  children,
  step,
  totalSteps,
  backHref,
  width = 'md',
}: {
  children: ReactNode;
  step?: number;
  totalSteps?: number;
  backHref?: string;
  width?: 'md' | 'lg';
}) {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cream">
      <BackdropShapes />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-5 sm:px-6">
        {backHref ? (
          <Link
            href={backHref}
            className="flex min-h-[3rem] items-center gap-1.5 rounded-[var(--radius-control)] px-3 font-semibold text-ink-soft hover:bg-sage-100 hover:text-ink"
          >
            <ChevronLeft aria-hidden className="size-5" />
            {t('common.back')}
          </Link>
        ) : (
          <Logo size="sm" />
        )}

        {step && totalSteps ? (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm font-semibold text-ink-soft">
              {t('common.of', { current: step, total: totalSteps })}
            </span>
            <ol className="flex items-center gap-1.5" aria-hidden>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <li
                  key={index}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    index < step ? 'w-7 bg-sage-500' : 'w-2 bg-sage-200',
                  )}
                />
              ))}
            </ol>
          </div>
        ) : null}
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={cn(
          'relative z-10 mx-auto flex w-full flex-1 flex-col justify-center px-4 pb-12 pt-2 focus:outline-none sm:px-6',
          width === 'lg' ? 'max-w-5xl' : 'max-w-2xl',
        )}
      >
        {children}
      </main>
    </div>
  );
}

/** Soft, slow background shapes. Purely decorative and never animated. */
function BackdropShapes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 -top-24 size-72 rounded-full bg-sage-100/70" />
      <div className="absolute -right-16 top-1/3 size-56 rounded-full bg-lilac-100/60" />
      <div className="absolute -bottom-24 left-1/4 size-80 rounded-full bg-clay-100/50" />
    </div>
  );
}

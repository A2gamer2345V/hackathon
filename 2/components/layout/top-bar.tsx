'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { AccessibilityMenu } from './accessibility-menu';
import { DateTimeDisplay } from '@/components/system/date-time-display';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { initials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

/**
 * Header shared by both experiences. It carries identity (who is signed in),
 * orientation (what day it is) and the quick accessibility controls.
 */
export function TopBar({
  homeHref,
  settingsHref,
  name,
  subtitle,
  compact = false,
}: {
  homeHref: string;
  settingsHref: string;
  name: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { signOut } = useAppState();
  const router = useRouter();

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[100rem] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        {/* The controls on the right have a fixed width, so on a 360px screen
            there is no room for the wordmark as well. It steps aside there and the
            mark carries the brand; the link's aria-label still says "ElderEase".
            The minimum width matters only in that state: with the wordmark gone
            the link would otherwise shrink to the mark itself, which is narrower
            than a comfortable target. */}
        <Link
          href={homeHref}
          className="flex min-h-[2.75rem] min-w-[2.75rem] items-center rounded-[var(--radius-control)]"
          aria-label={t('common.appName')}
        >
          <Logo
            size={compact ? 'sm' : 'md'}
            showWordmark
            wordmarkClassName="hidden min-[420px]:inline"
          />
        </Link>

        <div className="ml-auto hidden min-w-0 flex-col items-end text-right md:flex">
          <DateTimeDisplay className="text-sm font-semibold text-ink-soft" />
          {subtitle ? <span className="truncate text-xs text-ink-muted">{subtitle}</span> : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:ml-3">
          <AccessibilityMenu settingsHref={settingsHref} />

          <Link
            href={settingsHref}
            className="flex min-h-[3rem] items-center gap-2.5 rounded-[var(--radius-control)] border border-line-strong bg-surface-raised px-2.5 pr-3.5 font-semibold text-ink hover:bg-sage-50"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-sage-200 text-sm font-bold text-sage-800"
            >
              {initials(name)}
            </span>
            <span className="hidden max-w-[9rem] truncate sm:inline">{name}</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              signOut();
              router.push('/');
            }}
            aria-label={t('nav.signOut')}
            title={t('nav.signOut')}
            className="grid size-12 place-items-center rounded-[var(--radius-control)] border border-line-strong bg-surface-raised text-ink-soft hover:bg-sage-50"
          >
            <LogOut aria-hidden className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { ACCENTS, type Accent } from './accent';
import { cn } from '@/lib/utils';

/**
 * The big tappable tile on the patient dashboard.
 *
 * The whole card is one link with one accessible name, rather than a card with
 * a small button inside it — fewer, larger targets is the point.
 */
export function ActivityCard({
  href,
  title,
  description,
  icon: Icon,
  accent = 'sage',
  size = 'lg',
  badge,
  companionTarget,
  className,
}: {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  accent?: Accent;
  size?: 'lg' | 'md';
  badge?: ReactNode;
  companionTarget?: string;
  className?: string;
}) {
  const tone = ACCENTS[accent];
  const large = size === 'lg';

  return (
    <Link
      href={href}
      data-companion-target={companionTarget}
      className={cn(
        'group flex h-full items-center gap-4 rounded-[var(--radius-tile)] border shadow-soft',
        'transition-colors duration-150 hover:shadow-lift',
        large ? 'p-5 sm:p-6' : 'p-4 sm:p-5',
        tone.surface,
        tone.hover,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid shrink-0 place-items-center rounded-[18px]',
          tone.bubble,
          large ? 'size-16 sm:size-20' : 'size-14',
        )}
      >
        <Icon className={large ? 'size-8 sm:size-10' : 'size-7'} strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'font-display font-semibold text-ink',
              large ? 'text-xl sm:text-2xl' : 'text-lg',
            )}
          >
            {title}
          </span>
          {badge}
        </span>
        {description ? (
          <span className={cn('mt-1 block text-ink-soft', large ? 'text-base' : 'text-sm')}>
            {description}
          </span>
        ) : null}
      </span>

      <ChevronRight
        aria-hidden
        className="size-6 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

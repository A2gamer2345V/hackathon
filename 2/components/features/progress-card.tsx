'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCENTS, type Accent } from './accent';

/**
 * A single friendly figure.
 *
 * Deliberately plain: a count of things done, never a score, a percentile or
 * anything that could read as a clinical measure.
 */
export function ProgressCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = 'sage',
  footer,
  className,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  accent?: Accent;
  footer?: ReactNode;
  className?: string;
}) {
  const tone = ACCENTS[accent];

  return (
    <div
      data-surface=""
      className={cn(
        'card flex h-full flex-col rounded-[var(--radius-card)] border p-5 shadow-soft',
        tone.surface,
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn('grid size-12 shrink-0 place-items-center rounded-[14px]', tone.bubble)}
        >
          <Icon className="size-6" strokeWidth={1.75} />
        </span>
        <p className="text-base font-semibold text-ink-soft">{label}</p>
      </div>

      <p className="mt-3 font-display text-3xl font-semibold text-ink">{value}</p>
      {detail ? <p className="mt-1 text-base text-ink-soft">{detail}</p> : null}
      {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
    </div>
  );
}

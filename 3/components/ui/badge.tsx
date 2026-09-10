import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'sage' | 'lilac' | 'sun' | 'sky' | 'clay' | 'rose' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-ink-soft border-line',
  sage: 'bg-sage-100 text-sage-800 border-sage-200',
  lilac: 'bg-lilac-100 text-lilac-600 border-lilac-200',
  sun: 'bg-sun-100 text-sun-600 border-sun-300/70',
  sky: 'bg-sky-100 text-sky-600 border-sky-300/70',
  clay: 'bg-clay-100 text-clay-600 border-clay-300/70',
  rose: 'bg-rose-100 text-rose-600 border-rose-300/70',
  success: 'bg-success-soft text-success border-sage-200',
  warning: 'bg-warning-soft text-warning border-sun-300/70',
  danger: 'bg-danger-soft text-danger border-danger/25',
};

/**
 * Status is never carried by colour alone — every badge shows a word, and an
 * icon where one helps.
 */
export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

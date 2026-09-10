import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';

/**
 * Loading, empty and error surfaces. The rule from the brief: never leave the
 * user staring at a blank screen — and never show a raw error string.
 */

export function LoadingState({
  label,
  rows = 3,
  className,
}: {
  label: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="h-24 animate-pulse rounded-[var(--radius-card)] border border-line bg-surface-sunken"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card tone="sunken" className={cn('text-center', className)}>
      {icon ? (
        <div
          aria-hidden
          className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-sage-100 text-sage-700"
        >
          {icon}
        </div>
      ) : null}
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-prose text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}

export function ErrorState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      tone="plain"
      role="alert"
      className={cn('border-danger/30 bg-danger-soft/40 text-center', className)}
    >
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-prose text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}

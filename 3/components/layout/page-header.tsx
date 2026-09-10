import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Page title block used across patient and caregiver screens. */
export function PageHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)] bg-sage-100 text-sage-700"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 max-w-prose text-ink-soft">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

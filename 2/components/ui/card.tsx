import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The card is the app's main surface: soft cream paper, a quiet border and a
 * restrained shadow. `tone` tints the surface for category or AI context.
 */

export type CardTone = 'plain' | 'sage' | 'lilac' | 'sun' | 'sky' | 'clay' | 'rose' | 'sunken';

const TONES: Record<CardTone, string> = {
  plain: 'bg-surface-raised border-line',
  sage: 'bg-sage-50 border-sage-200',
  lilac: 'bg-lilac-50 border-lilac-200',
  sun: 'bg-sun-100 border-sun-300/70',
  sky: 'bg-sky-100 border-sky-300/70',
  clay: 'bg-clay-100 border-clay-300/70',
  rose: 'bg-rose-100 border-rose-300/70',
  sunken: 'bg-surface-sunken border-line',
};

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  tone?: CardTone;
  padded?: boolean;
  children: ReactNode;
}

export function Card({
  as: Tag = 'div',
  tone = 'plain',
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      data-surface=""
      className={cn(
        'card rounded-[var(--radius-card)] border shadow-soft',
        TONES[tone],
        padded && 'p-5 sm:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
  titleAs: TitleTag = 'h2',
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4';
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
        <div className="min-w-0">
          <TitleTag className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {title}
          </TitleTag>
          {description ? (
            <p className="mt-1 text-base text-ink-soft">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

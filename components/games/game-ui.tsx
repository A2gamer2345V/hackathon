'use client';

import type { ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Small building blocks shared by the activities.
 *
 * The visual language is deliberately gentle: a right answer turns sage green
 * with a tick, an answer that was not the one we were looking for simply fades
 * back — no red, no crosses, nothing that reads as failure.
 */

/** The single instruction line above a play area. Big, calm, always present. */
export function GamePrompt({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 text-center', className)}>
      <p className="font-display text-xl font-semibold text-ink sm:text-2xl">{children}</p>
      {hint ? <p className="mt-1.5 text-base text-ink-soft sm:text-lg">{hint}</p> : null}
    </div>
  );
}

export type TileStatus = 'none' | 'correct' | 'wrong';

/**
 * A large, tappable answer. Minimum height is well past the 48px target size and
 * the accessible name is always supplied by `label` so icon-only tiles still
 * read properly.
 */
export function ChoiceTile({
  onClick,
  label,
  selected = false,
  status = 'none',
  dimmed = false,
  disabled = false,
  className,
  children,
}: {
  onClick?: () => void;
  /** Accessible name — required, because many tiles are picture-only. */
  label: string;
  selected?: boolean;
  status?: TileStatus;
  dimmed?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={onClick && status === 'none' ? selected : undefined}
      className={cn(
        'relative flex min-h-[7rem] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-tile)]',
        'border-2 p-3.5 text-center transition-colors duration-150',
        'focus-visible:outline-3 focus-visible:outline-offset-3 disabled:cursor-default',
        status === 'correct'
          ? 'border-sage-600 bg-sage-100 text-sage-800'
          : status === 'wrong'
            ? 'border-line-strong bg-surface-sunken text-ink-soft'
            : selected
              ? 'border-sage-600 bg-sage-100 text-sage-800'
              : 'border-line-strong bg-surface-raised text-ink hover:border-sage-300 hover:bg-sage-50',
        dimmed && 'opacity-55',
        className,
      )}
    >
      {status !== 'none' ? (
        <span
          aria-hidden
          className={cn(
            'absolute top-2 right-2 grid size-7 place-items-center rounded-full',
            status === 'correct' ? 'bg-sage-600 text-ink-inverse' : 'bg-line-strong text-ink-soft',
          )}
        >
          {status === 'correct' ? <Check className="size-4" /> : <Minus className="size-4" />}
        </span>
      ) : null}
      {children}
    </button>
  );
}

/** A responsive grid of tiles. Two columns on the smallest screens, never more
 *  than four, so targets stay large. */
export function ChoiceGrid({
  columns = 2,
  children,
  className,
}: {
  columns?: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto grid max-w-3xl gap-3 sm:gap-4',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-2 sm:grid-cols-3',
        columns === 4 && 'grid-cols-2 sm:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The label under a picture or shape inside a tile. */
export function TileLabel({ children }: { children: ReactNode }) {
  return <span className="text-base font-semibold sm:text-lg">{children}</span>;
}

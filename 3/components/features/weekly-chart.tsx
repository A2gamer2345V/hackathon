'use client';

import { useFormats } from '@/lib/hooks/use-formats';
import { cn } from '@/lib/utils';

export interface ChartPoint {
  /** `YYYY-MM-DD`. */
  date: string;
  value: number;
}

/**
 * A small column chart.
 *
 * The bars are decorative: the same numbers are announced to screen readers as
 * a plain list, and each column is labelled with its day and value on screen,
 * so nothing depends on reading the shape.
 */
export function WeeklyChart({
  data,
  label,
  unitLabel,
  tone = 'sage',
  className,
}: {
  data: ChartPoint[];
  label: string;
  /** e.g. "activities" — used in the screen-reader sentence for each day. */
  unitLabel: string;
  tone?: 'sage' | 'lilac';
  className?: string;
}) {
  const max = Math.max(1, ...data.map((point) => point.value));
  const formats = useFormats();
  const barTone = tone === 'lilac' ? 'bg-lilac-300' : 'bg-sage-400';
  const topTone = tone === 'lilac' ? 'bg-lilac-500' : 'bg-sage-600';

  return (
    <figure className={cn('w-full', className)}>
      <figcaption className="sr-only">{label}</figcaption>

      <ul className="sr-only">
        {data.map((point) => (
          <li key={point.date}>
            {formats.weekdayShort(point.date)}: {point.value} {unitLabel}
          </li>
        ))}
      </ul>

      <div aria-hidden className="flex items-end justify-between gap-1.5 sm:gap-3">
        {data.map((point) => {
          const height = Math.round((point.value / max) * 100);
          const isBest = point.value === max && point.value > 0;
          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-sm font-semibold text-ink tabular-nums">{point.value}</span>
              <div className="flex h-24 w-full items-end rounded-[10px] bg-surface-sunken p-1 sm:h-32">
                <div
                  className={cn(
                    'w-full rounded-[7px] transition-[height] duration-500',
                    isBest ? topTone : barTone,
                  )}
                  style={{ height: `${Math.max(point.value > 0 ? 8 : 3, height)}%` }}
                />
              </div>
              <span className="truncate text-xs font-medium text-ink-muted sm:text-sm">
                {formats.weekdayShort(point.date)}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

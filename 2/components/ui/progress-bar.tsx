import { cn } from '@/lib/utils';
import { clamp } from '@/lib/utils';

const TONES = {
  sage: 'bg-sage-500',
  lilac: 'bg-lilac-400',
  sun: 'bg-sun-500',
  sky: 'bg-sky-500',
} as const;

/**
 * A progress bar that always states its value in words as well, so meaning is
 * never carried by the fill alone.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  tone = 'sage',
  size = 'md',
  className,
}: {
  value: number;
  max?: number;
  label: string;
  valueText?: string;
  tone?: keyof typeof TONES;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const pct = clamp(max === 0 ? 0 : (value / max) * 100, 0, 100);
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink-soft">{label}</span>
        <span className="text-sm font-semibold text-ink">{valueText ?? `${Math.round(pct)}%`}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={valueText}
        className={cn(
          'w-full overflow-hidden rounded-full bg-surface-sunken ring-1 ring-line',
          size === 'sm' ? 'h-2.5' : 'h-4',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', TONES[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

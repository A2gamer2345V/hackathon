'use client';

import Link from 'next/link';
import {
  Brain,
  CalendarClock,
  Check,
  CupSoda,
  Footprints,
  Moon,
  PhoneCall,
  Pill,
  Play,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/lib/providers/language-provider';
import { useFormats } from '@/lib/hooks/use-formats';
import { cn } from '@/lib/utils';
import type { ActivityKind, DailyActivity, DayPart } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';
import { ACCENTS, type Accent } from './accent';

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  walk: Footprints,
  meal: UtensilsCrossed,
  medicine: Pill,
  appointment: CalendarClock,
  hydration: CupSoda,
  cognitive: Brain,
  rest: Moon,
  social: PhoneCall,
};

const KIND_ACCENT: Record<ActivityKind, Accent> = {
  walk: 'sage',
  meal: 'clay',
  medicine: 'rose',
  appointment: 'sky',
  hydration: 'sky',
  cognitive: 'lilac',
  rest: 'sun',
  social: 'clay',
};

const PART_LABEL: Record<DayPart, TranslationKey> = {
  morning: 'myDay.morning',
  afternoon: 'myDay.afternoon',
  evening: 'myDay.evening',
};

const PART_ORDER: DayPart[] = ['morning', 'afternoon', 'evening'];

/**
 * The day as a vertical timeline.
 *
 * Each row is a single large checkbox-style control: the whole row toggles, so
 * there is no small tick box to aim at. Completion is shown by an icon, a word
 * and a strike-through — never by colour alone.
 */
export function DailyTimeline({
  activities,
  onToggle,
  grouped = true,
  className,
}: {
  activities: DailyActivity[];
  onToggle?: (id: string) => void;
  grouped?: boolean;
  className?: string;
}) {
  const ordered = [...activities].sort((a, b) => a.time.localeCompare(b.time));

  if (!grouped) {
    return (
      <ul className={cn('space-y-2.5', className)}>
        {ordered.map((activity) => (
          <li key={activity.id}>
            <TimelineRow activity={activity} onToggle={onToggle} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {PART_ORDER.map((part) => {
        const rows = ordered.filter((a) => a.dayPart === part);
        if (rows.length === 0) return null;
        return <TimelineGroup key={part} part={part} rows={rows} onToggle={onToggle} />;
      })}
    </div>
  );
}

function TimelineGroup({
  part,
  rows,
  onToggle,
}: {
  part: DayPart;
  rows: DailyActivity[];
  onToggle?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const done = rows.filter((r) => r.completed).length;

  return (
    <section aria-labelledby={`plan-${part}`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 id={`plan-${part}`} className="font-display text-lg font-semibold text-ink">
          {t(PART_LABEL[part])}
        </h3>
        <p className="text-sm font-medium text-ink-muted">
          {t('myDay.completedCount', { done, total: rows.length })}
        </p>
      </div>
      <ul className="space-y-2.5">
        {rows.map((activity) => (
          <li key={activity.id}>
            <TimelineRow activity={activity} onToggle={onToggle} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TimelineRow({
  activity,
  onToggle,
}: {
  activity: DailyActivity;
  onToggle?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const formats = useFormats();
  const Icon = KIND_ICON[activity.kind];
  const tone = ACCENTS[KIND_ACCENT[activity.kind]];
  const label = activity.titleKey ? t(activity.titleKey) : activity.title;
  const done = activity.completed;

  const body = (
    <>
      <span className="w-[4.5rem] shrink-0 text-left text-base font-semibold text-ink-soft tabular-nums sm:w-20 sm:text-lg">
        {formats.wallTime(activity.time)}
      </span>

      <span
        aria-hidden
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-[14px] sm:size-12',
          done ? 'bg-sage-600 text-ink-inverse' : tone.bubble,
        )}
      >
        {done ? <Check className="size-6" /> : <Icon className="size-6" strokeWidth={1.75} />}
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            'block text-lg font-semibold sm:text-xl',
            done ? 'text-ink-muted line-through decoration-2' : 'text-ink',
          )}
        >
          {label}
        </span>
        <span className="text-sm text-ink-muted">
          {done ? t('a11y.completed') : t('a11y.notCompleted')}
        </span>
      </span>
    </>
  );

  return (
    <div
      data-surface=""
      className={cn(
        'card flex items-stretch gap-2 rounded-[var(--radius-card)] border shadow-soft',
        done ? 'border-sage-200 bg-sage-50' : 'border-line bg-surface-raised',
      )}
    >
      {onToggle ? (
        <button
          type="button"
          onClick={() => onToggle(activity.id)}
          aria-pressed={done}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-card)] p-3.5 text-left transition-colors hover:bg-sage-50/80 sm:gap-4 sm:p-4"
        >
          {body}
          <span className="sr-only">{done ? t('myDay.undo') : t('myDay.markDone')}</span>
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 p-3.5 sm:gap-4 sm:p-4">{body}</div>
      )}

      {activity.linkedGameId && !done ? (
        <Link
          href={`/app/games/${activity.linkedGameId}`}
          className="my-3 mr-3 grid shrink-0 place-items-center gap-1 rounded-[var(--radius-control)] border border-lilac-200 bg-lilac-50 px-3 text-lilac-600 transition-colors hover:bg-lilac-100"
        >
          <Play aria-hidden className="size-5" />
          <span className="text-xs font-semibold">{t('games.play')}</span>
        </Link>
      ) : null}
    </div>
  );
}

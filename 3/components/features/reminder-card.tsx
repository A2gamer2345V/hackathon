'use client';

import {
  BellOff,
  CalendarClock,
  Check,
  CupSoda,
  Footprints,
  Pencil,
  Pill,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/providers/language-provider';
import { useFormats } from '@/lib/hooks/use-formats';
import { REPEAT_LABEL, WEEKDAY_KEYS } from '@/lib/utils/reminders';
import { cn } from '@/lib/utils';
import type { Reminder, ReminderStatus, ReminderType } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';
import type { Accent } from './accent';
import { ACCENTS } from './accent';

const TYPE_ICON: Record<ReminderType, LucideIcon> = {
  medicine: Pill,
  appointment: CalendarClock,
  water: CupSoda,
  activity: Footprints,
};

const TYPE_ACCENT: Record<ReminderType, Accent> = {
  medicine: 'rose',
  appointment: 'sky',
  water: 'sky',
  activity: 'sage',
};

const TYPE_LABEL: Record<ReminderType, TranslationKey> = {
  medicine: 'reminders.type.medicine',
  appointment: 'reminders.type.appointment',
  water: 'reminders.type.water',
  activity: 'reminders.type.activity',
};

const STATUS_LABEL: Record<ReminderStatus, TranslationKey> = {
  pending: 'reminders.upcoming',
  completed: 'reminders.completed',
  missed: 'reminders.missed',
  dismissed: 'reminders.skipped',
};

const STATUS_TONE: Record<ReminderStatus, BadgeTone> = {
  pending: 'sage',
  completed: 'success',
  missed: 'warning',
  dismissed: 'neutral',
};

/**
 * The repeat rule in one readable phrase.
 *
 * "Every day" is left as its own label rather than expanded into a list of
 * seven; a one-off gets its actual date, because "Once only" alone leaves the
 * reader wondering *which* once.
 */
export function useScheduleLabel(): (reminder: Reminder) => string {
  const { t } = useTranslation();
  const formats = useFormats();

  return (reminder) => {
    if (reminder.repeat === 'once') {
      return reminder.date
        ? t('reminders.onceOn', { date: formats.shortDate(reminder.date) })
        : t('reminders.repeat.once');
    }
    if (reminder.repeat === 'weekly' && reminder.weekdays?.length) {
      const days = [...reminder.weekdays]
        .sort((a, b) => a - b)
        .map((day) => t(WEEKDAY_KEYS[day] ?? 'reminders.day.0'))
        .join(', ');
      return t('reminders.everyWeekOn', { days });
    }
    return t(REPEAT_LABEL[reminder.repeat]);
  };
}

/**
 * One reminder.
 *
 * Status is shown as a word and an icon, never as colour alone, and the
 * language stays neutral — a missed medicine is "Missed", not a failure. A
 * switched-off reminder says so plainly instead of just going quiet.
 */
export function ReminderCard({
  reminder,
  onComplete,
  onDismiss,
  onEdit,
  onDelete,
  onToggleEnabled,
  compact = false,
  className,
}: {
  reminder: Reminder;
  onComplete?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onEdit?: (reminder: Reminder) => void;
  onDelete?: (id: string) => void;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const formats = useFormats();
  const scheduleLabel = useScheduleLabel();
  const Icon = TYPE_ICON[reminder.type];
  const tone = ACCENTS[TYPE_ACCENT[reminder.type]];
  const done = reminder.status === 'completed';
  const off = !reminder.enabled;
  const time = formats.wallTime(reminder.time);

  return (
    <article
      data-surface=""
      className={cn(
        'card rounded-[var(--radius-card)] border p-4 shadow-soft sm:p-5',
        done ? 'border-sage-200 bg-sage-50' : 'border-line bg-surface-raised',
        // Dimmed, not hidden: a switched-off reminder is still something the
        // caregiver needs to find in order to switch it back on.
        off && 'opacity-75',
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className={cn('grid size-12 shrink-0 place-items-center rounded-[14px]', tone.bubble)}
        >
          <Icon className="size-6" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3
              className={cn(
                'font-display text-lg font-semibold text-ink sm:text-xl',
                done && 'line-through decoration-sage-400 decoration-2',
              )}
            >
              {reminder.title}
            </h3>
            <p className="text-lg font-semibold text-ink-soft tabular-nums">{time}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* A switched-off reminder has no status worth reporting — nothing is
                coming up and nothing was missed — so the "off" badge replaces it
                rather than sitting beside a contradictory "Coming up". */}
            {off ? (
              <Badge tone="warning" icon={<BellOff className="size-4" />}>
                {t('reminders.disabled')}
              </Badge>
            ) : (
              <Badge
                tone={STATUS_TONE[reminder.status]}
                icon={done ? <Check className="size-4" /> : undefined}
              >
                {t(STATUS_LABEL[reminder.status])}
              </Badge>
            )}
            <Badge tone="neutral">{t(TYPE_LABEL[reminder.type])}</Badge>
            <Badge tone="sky">{scheduleLabel(reminder)}</Badge>
          </div>

          {reminder.note && !compact ? (
            <p className="mt-2.5 text-base text-ink-soft">{reminder.note}</p>
          ) : null}
        </div>
      </div>

      {onComplete || onDismiss || onEdit || onDelete || onToggleEnabled ? (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {onComplete ? (
            <Button
              size={compact ? 'md' : 'lg'}
              variant={done ? 'secondary' : 'primary'}
              onClick={() => onComplete(reminder.id)}
              iconLeft={done ? <X aria-hidden className="size-5" /> : <Check aria-hidden className="size-5" />}
            >
              {done
                ? t('myDay.undo')
                : reminder.type === 'medicine'
                  ? t('reminders.markDone')
                  : t('reminders.markDoneGeneric')}
            </Button>
          ) : null}

          {onDismiss && !done ? (
            <Button size={compact ? 'md' : 'lg'} variant="ghost" onClick={() => onDismiss(reminder.id)}>
              {t('reminders.dismiss')}
            </Button>
          ) : null}

          {onToggleEnabled ? (
            <Button
              size={compact ? 'md' : 'lg'}
              variant="ghost"
              onClick={() => onToggleEnabled(reminder.id, !reminder.enabled)}
              iconLeft={<BellOff aria-hidden className="size-5" />}
            >
              {off ? t('reminders.enable') : t('reminders.disable')}
            </Button>
          ) : null}

          {onEdit ? (
            <Button
              size={compact ? 'md' : 'lg'}
              variant="ghost"
              onClick={() => onEdit(reminder)}
              iconLeft={<Pencil aria-hidden className="size-5" />}
            >
              {t('reminders.edit')}
            </Button>
          ) : null}

          {onDelete ? (
            <Button
              size={compact ? 'md' : 'lg'}
              variant="ghost"
              onClick={() => onDelete(reminder.id)}
              iconLeft={<Trash2 aria-hidden className="size-5" />}
              className="text-danger hover:bg-danger-soft"
            >
              {t('reminders.delete')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

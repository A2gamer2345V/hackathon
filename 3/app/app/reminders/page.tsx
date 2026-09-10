'use client';

import { useMemo, useState } from 'react';
import { BellRing, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ReminderCard } from '@/components/features/reminder-card';
import { ReminderForm } from '@/components/features/reminder-form';
import { CompanionHint } from '@/components/companion/companion-dock';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useFormats } from '@/lib/hooks/use-formats';
import { isActiveOn, minutesOfTime } from '@/lib/utils/reminders';
import type { ReminderDraft } from '@/lib/services/data';
import type { Reminder } from '@/lib/types';

type Editing = { mode: 'new' } | { mode: 'edit'; reminder: Reminder } | null;

/**
 * Reminders — everything due today, grouped by what still needs doing.
 *
 * "Today" is the patient's own calendar day and their own clock, and only
 * reminders whose repeat rule actually lands on it are listed: a Thursday
 * appointment does not clutter Monday, and last week's one-off does not linger.
 * Everything else is kept, visibly, in a section below rather than deleted or
 * silently hidden — a switched-off reminder still has to be findable.
 *
 * Reminders are the person's own words, so they are stored as free text rather
 * than translation keys; everything around them is translated.
 */
export default function RemindersPage() {
  const { t } = useTranslation();
  const formats = useFormats();
  const {
    hydrated,
    reminders,
    addReminder,
    updateReminder,
    setReminderStatus,
    setReminderEnabled,
    removeReminder,
  } = useAppState();

  const [editing, setEditing] = useState<Editing>(null);

  const groups = useMemo(() => {
    const today = formats.today();
    const weekday = formats.todayWeekday();
    const byTime = [...reminders].sort((a, b) => minutesOfTime(a.time) - minutesOfTime(b.time));
    const dueToday = byTime.filter((r) => isActiveOn(r, today, weekday));
    const dueIds = new Set(dueToday.map((r) => r.id));

    return {
      upcoming: dueToday.filter((r) => r.status === 'pending'),
      completed: dueToday.filter((r) => r.status === 'completed'),
      other: dueToday.filter((r) => r.status === 'missed' || r.status === 'dismissed'),
      elsewhere: byTime.filter((r) => !dueIds.has(r.id)),
    };
  }, [reminders, formats]);

  const next = groups.upcoming[0];

  const save = (draft: ReminderDraft) => {
    if (editing?.mode === 'edit') {
      updateReminder(editing.reminder.id, draft);
    } else {
      addReminder(draft);
    }
    setEditing(null);
  };

  return (
    <div className="pb-4">
      <PageHeader
        title={t('reminders.title')}
        subtitle={t('reminders.subtitle')}
        icon={<BellRing className="size-6" />}
        action={
          editing ? undefined : (
            <Button
              size="lg"
              onClick={() => setEditing({ mode: 'new' })}
              iconLeft={<Plus aria-hidden className="size-5" />}
            >
              {t('reminders.add')}
            </Button>
          )
        }
      />

      {editing ? (
        <div className="mb-6">
          <ReminderForm
            initial={editing.mode === 'edit' ? editing.reminder : undefined}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {!hydrated ? (
        <LoadingState label={t('state.loading')} rows={3} />
      ) : reminders.length === 0 ? (
        <EmptyState
          title={t('reminders.empty')}
          description={t('reminders.emptyDesc')}
          icon={<BellRing className="size-7" />}
          action={
            <Button
              size="lg"
              onClick={() => setEditing({ mode: 'new' })}
              iconLeft={<Plus aria-hidden className="size-5" />}
            >
              {t('reminders.add')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-7">
          <ReminderGroup
            heading={t('reminders.upcoming')}
            reminders={groups.upcoming}
            emptyText={t('reminders.noneLeft')}
            onComplete={(id) => setReminderStatus(id, 'completed')}
            onDismiss={(id) => setReminderStatus(id, 'dismissed')}
            onEdit={(reminder) => setEditing({ mode: 'edit', reminder })}
            onDelete={removeReminder}
          />

          {groups.completed.length > 0 ? (
            <ReminderGroup
              heading={t('reminders.completed')}
              reminders={groups.completed}
              onEdit={(reminder) => setEditing({ mode: 'edit', reminder })}
              onDelete={removeReminder}
            />
          ) : null}

          {groups.other.length > 0 ? (
            <ReminderGroup
              heading={t('reminders.missed')}
              reminders={groups.other}
              onComplete={(id) => setReminderStatus(id, 'completed')}
              onEdit={(reminder) => setEditing({ mode: 'edit', reminder })}
              onDelete={removeReminder}
            />
          ) : null}

          {groups.elsewhere.length > 0 ? (
            <ReminderGroup
              heading={t('reminders.otherDays')}
              description={t('reminders.otherDaysDesc')}
              reminders={groups.elsewhere}
              onToggleEnabled={setReminderEnabled}
              onEdit={(reminder) => setEditing({ mode: 'edit', reminder })}
              onDelete={removeReminder}
            />
          ) : null}

          <CompanionHint
            text={
              next
                ? t('companion.ctx.reminders', {
                    title: next.title,
                    time: formats.wallTime(next.time),
                  })
                : t('companion.ctx.remindersEmpty')
            }
          />
        </div>
      )}
    </div>
  );
}

function ReminderGroup({
  heading,
  description,
  reminders,
  emptyText,
  onComplete,
  onDismiss,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  heading: string;
  description?: string;
  reminders: Reminder[];
  emptyText?: string;
  onComplete?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onEdit?: (reminder: Reminder) => void;
  onDelete?: (id: string) => void;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
}) {
  return (
    <section aria-labelledby={`group-${heading}`}>
      <h2
        id={`group-${heading}`}
        className="mb-1 font-display text-xl font-semibold text-ink sm:text-2xl"
      >
        {heading}
      </h2>
      {description ? <p className="mb-3 text-base text-ink-soft">{description}</p> : <div className="mb-3" />}

      {reminders.length === 0 && emptyText ? (
        <p className="rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4 text-lg text-ink-soft">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-3">
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <ReminderCard
                reminder={reminder}
                onComplete={onComplete}
                onDismiss={onDismiss}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleEnabled={onToggleEnabled}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

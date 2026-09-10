'use client';

import { useMemo, useState } from 'react';
import { BellRing, Info, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ReminderCard } from '@/components/features/reminder-card';
import { ReminderForm } from '@/components/features/reminder-form';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useFormats } from '@/lib/hooks/use-formats';
import { isActiveOn, minutesOfTime } from '@/lib/utils/reminders';
import { describeTimezone } from '@/lib/utils/timezone';
import type { ReminderDraft } from '@/lib/services/data';
import type { Reminder } from '@/lib/types';

type Editing = { mode: 'new' } | { mode: 'edit'; reminder: Reminder } | null;

/**
 * The caregiver's reminder management.
 *
 * The same list the patient sees, with the same rules applied — this page and
 * `/app/reminders` both ask `isActiveOn`, so the two screens can never disagree
 * about what is due. What differs is the vantage point: "today" here is *the
 * patient's* today, worked out in the patient's zone, because a reminder set for
 * 08:00 belongs to the clock on their wall, not the caregiver's. When the two
 * zones differ the page says so rather than leaving the caregiver to guess.
 *
 * Marking a reminder done is deliberately absent. A caregiver can add, change,
 * switch off or remove a reminder; ticking one off on the patient's behalf would
 * put something in the record that never actually happened.
 */
export default function CaregiverRemindersPage() {
  const { t } = useTranslation();
  const formats = useFormats();
  const {
    hydrated,
    patient,
    reminders,
    timezone: caregiverZone,
    addReminder,
    updateReminder,
    setReminderEnabled,
    removeReminder,
  } = useAppState();

  const [editing, setEditing] = useState<Editing>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const patientName = patient?.name.split(' ')[0] ?? '';
  // `formats` already reads on the patient's clock; the caregiver's own zone is
  // only needed to decide whether the difference is worth mentioning.
  const patientZone = formats.timezone;
  const differentZone = patientZone !== caregiverZone;

  const groups = useMemo(() => {
    const today = formats.today();
    const weekday = formats.todayWeekday();
    const byTime = [...reminders].sort((a, b) => minutesOfTime(a.time) - minutesOfTime(b.time));
    const due = byTime.filter((r) => isActiveOn(r, today, weekday));
    const dueIds = new Set(due.map((r) => r.id));
    return {
      due,
      elsewhere: byTime.filter((r) => !dueIds.has(r.id)),
      off: byTime.filter((r) => !r.enabled).length,
    };
  }, [reminders, formats]);

  const save = (draft: ReminderDraft) => {
    if (editing?.mode === 'edit') updateReminder(editing.reminder.id, draft);
    else addReminder(draft);
    setEditing(null);
  };

  return (
    <div className="pb-4">
      <PageHeader
        title={t('reminders.manageTitle', { name: patientName })}
        subtitle={t('reminders.manageSubtitle', { name: patientName })}
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
      ) : (
        <div className="space-y-5">
          {/* ------------------------------------------------------- summary */}
          <Card tone="sage">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="sage">
                {t('reminders.countDueToday', { count: groups.due.length })}
              </Badge>
              <Badge tone="neutral">{t('reminders.countOff', { count: groups.off })}</Badge>
            </div>
            <p className="mt-3 text-base text-ink-soft">
              {t('reminders.syncNote', { name: patientName })}
            </p>
            {/* Said out loud only when it actually matters — an identical zone
                needs no explanation. */}
            {differentZone ? (
              <p className="mt-2 flex items-start gap-2 text-base text-ink-soft">
                <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
                {t('reminders.zoneNote', {
                  name: patientName,
                  zone: describeTimezone(patientZone, formats.locale),
                })}
              </p>
            ) : null}
          </Card>

          {reminders.length === 0 ? (
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
            <>
              <Card>
                <CardHeader title={t('reminders.dueToday')} />
                <div className="mt-4">
                  {groups.due.length === 0 ? (
                    <EmptyState
                      title={t('reminders.noneLeft')}
                      icon={<BellRing className="size-7" />}
                    />
                  ) : (
                    <ManagedList
                      reminders={groups.due}
                      confirming={confirming}
                      onEdit={(reminder) => setEditing({ mode: 'edit', reminder })}
                      onToggleEnabled={setReminderEnabled}
                      onAskDelete={setConfirming}
                      onConfirmDelete={(id) => {
                        removeReminder(id);
                        setConfirming(null);
                      }}
                    />
                  )}
                </div>
              </Card>

              {groups.elsewhere.length > 0 ? (
                <Card>
                  <CardHeader
                    title={t('reminders.otherDays')}
                    description={t('reminders.otherDaysDesc')}
                  />
                  <div className="mt-4">
                    <ManagedList
                      reminders={groups.elsewhere}
                      confirming={confirming}
                      onEdit={(reminder) => setEditing({ mode: 'edit', reminder })}
                      onToggleEnabled={setReminderEnabled}
                      onAskDelete={setConfirming}
                      onConfirmDelete={(id) => {
                        removeReminder(id);
                        setConfirming(null);
                      }}
                    />
                  </div>
                </Card>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A list with a two-step delete.
 *
 * Removing a reminder is not undoable here, so the confirmation names the
 * reminder rather than asking a generic "are you sure?".
 */
function ManagedList({
  reminders,
  confirming,
  onEdit,
  onToggleEnabled,
  onAskDelete,
  onConfirmDelete,
}: {
  reminders: Reminder[];
  confirming: string | null;
  onEdit: (reminder: Reminder) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onAskDelete: (id: string | null) => void;
  onConfirmDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <ul className="space-y-3">
      {reminders.map((reminder) => (
        <li key={reminder.id}>
          <ReminderCard
            reminder={reminder}
            onEdit={onEdit}
            onToggleEnabled={onToggleEnabled}
            onDelete={(id) => onAskDelete(id)}
          />
          {confirming === reminder.id ? (
            <div
              role="alertdialog"
              aria-label={t('reminders.deleteConfirm', { title: reminder.title })}
              className="mt-2 rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft p-4"
            >
              <p className="text-base font-semibold text-ink">
                {t('reminders.deleteConfirm', { title: reminder.title })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <Button size="md" variant="danger" onClick={() => onConfirmDelete(reminder.id)}>
                  {t('reminders.delete')}
                </Button>
                <Button size="md" variant="secondary" onClick={() => onAskDelete(null)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

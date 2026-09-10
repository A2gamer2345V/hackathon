'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { BellRing, CalendarClock, CupSoda, Footprints, Pill, Repeat } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChoiceGroup, TextField, ToggleField } from '@/components/ui/field';
import { useTranslation } from '@/lib/providers/language-provider';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useFormats } from '@/lib/hooks/use-formats';
import { REPEAT_LABEL, REPEAT_OPTIONS, WEEKDAY_KEYS } from '@/lib/utils/reminders';
import { cn } from '@/lib/utils';
import type { ReminderDraft } from '@/lib/services/data';
import type { Reminder, ReminderRepeat, ReminderType } from '@/lib/types';

const TYPE_ICON: Record<ReminderType, typeof Pill> = {
  medicine: Pill,
  appointment: CalendarClock,
  water: CupSoda,
  activity: Footprints,
};

const TYPES: ReminderType[] = ['medicine', 'water', 'appointment', 'activity'];

/**
 * Add or edit a reminder.
 *
 * The time uses the browser's own time control so the familiar picker appears on
 * a phone. Repeat is asked for explicitly rather than assumed: "every day" and
 * "the appointment on Thursday" are genuinely different things, and a one-off
 * that keeps reappearing every morning teaches people to ignore the reminder.
 *
 * The two conditional fields — a date for a one-off, a set of days for a weekly
 * — appear only for the repeat they belong to, so the form stays four fields
 * long for the common case.
 */
export function ReminderForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Reminder;
  onSubmit: (draft: ReminderDraft) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const formats = useFormats();
  const { role } = useAppState();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [time, setTime] = useState(initial?.time ?? '09:00');
  const [type, setType] = useState<ReminderType>(initial?.type ?? 'medicine');
  const [note, setNote] = useState(initial?.note ?? '');
  const [repeat, setRepeat] = useState<ReminderRepeat>(initial?.repeat ?? 'daily');
  // Defaults to today *in the patient's zone*, not the device's.
  const [date, setDate] = useState(initial?.date ?? formats.today());
  const [weekdays, setWeekdays] = useState<number[]>(
    initial?.weekdays ?? [formats.todayWeekday()],
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [error, setError] = useState('');

  const toggleDay = (day: number) => {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
    if (error) setError('');
  };

  const submit = () => {
    if (!title.trim()) {
      setError(t('reminders.form.nameError'));
      return;
    }
    if (repeat === 'once' && !date) {
      setError(t('reminders.form.dateError'));
      return;
    }
    if (repeat === 'weekly' && weekdays.length === 0) {
      setError(t('reminders.form.daysError'));
      return;
    }

    onSubmit({
      title,
      time,
      type,
      note: note || undefined,
      repeat,
      // Only the field the chosen repeat actually uses is sent, so an edit from
      // "weekly" to "daily" does not leave a stale set of days behind.
      date: repeat === 'once' ? date : undefined,
      weekdays: repeat === 'weekly' ? weekdays : undefined,
      enabled,
    });
  };

  return (
    <Card
      as="form"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        submit();
      }}
      aria-label={initial ? t('reminders.form.editTitle') : t('reminders.form.new')}
    >
      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
        {initial ? t('reminders.form.editTitle') : t('reminders.form.new')}
      </h2>

      <div className="mt-4 space-y-4">
        <TextField
          label={t('reminders.form.name')}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError('');
          }}
          error={error || undefined}
          autoComplete="off"
        />

        <TextField
          label={t('reminders.form.time')}
          hint={t(
            // The same form serves both sides. A caregiver is setting a time on
            // somebody else's wall clock — worth saying when they are in
            // different zones — while a patient is simply setting their own.
            role === 'caregiver' ? 'reminders.form.timeHint' : 'reminders.form.timeHintOwn',
            { zone: formats.timezone },
          )}
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="sm:max-w-xs"
        />

        <ChoiceGroup<ReminderType>
          legend={t('reminders.form.type')}
          value={type}
          onChange={setType}
          columns={4}
          options={TYPES.map((value) => {
            const Icon = TYPE_ICON[value];
            return {
              value,
              label: t(`reminders.type.${value}`),
              icon: <Icon className="size-6" />,
            };
          })}
        />

        <ChoiceGroup<ReminderRepeat>
          legend={t('reminders.repeat')}
          value={repeat}
          onChange={(next) => {
            setRepeat(next);
            if (error) setError('');
          }}
          columns={4}
          options={REPEAT_OPTIONS.map((value) => ({
            value,
            label: t(REPEAT_LABEL[value]),
            icon: <Repeat className="size-5" />,
          }))}
        />

        {repeat === 'once' ? (
          <TextField
            label={t('reminders.date')}
            hint={t('reminders.form.dateHint')}
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              if (error) setError('');
            }}
            className="sm:max-w-xs"
          />
        ) : null}

        {repeat === 'weekly' ? (
          <fieldset>
            <legend className="mb-2 text-base font-semibold text-ink">
              {t('reminders.weekdaysPick')}
            </legend>
            {/* Checkboxes rather than a multi-select: seven large targets that
                say what they are, with the state on the control itself. */}
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_KEYS.map((key, day) => {
                const on = weekdays.includes(day);
                return (
                  <label
                    key={key}
                    className={cn(
                      'inline-flex min-h-[3rem] min-w-[3.75rem] cursor-pointer items-center justify-center rounded-[var(--radius-control)] border px-3 font-semibold transition-colors',
                      on
                        ? 'border-sage-500 bg-sage-100 text-sage-800 ring-2 ring-sage-300'
                        : 'border-line bg-surface-raised text-ink-soft hover:border-sage-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleDay(day)}
                      className="sr-only"
                    />
                    {t(key)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <TextField
          label={t('reminders.form.note')}
          hint={t('reminders.form.noteHint')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          autoComplete="off"
        />

        <ToggleField
          label={enabled ? t('reminders.enabled') : t('reminders.disabled')}
          description={t('reminders.enabledHint')}
          checked={enabled}
          onChange={setEnabled}
          icon={<BellRing className="size-5" />}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg">
          {t('reminders.form.save')}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </Card>
  );
}

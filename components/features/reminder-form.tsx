'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarClock, CupSoda, Footprints, Pill } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChoiceGroup, TextField } from '@/components/ui/field';
import { useTranslation } from '@/lib/providers/language-provider';
import type { ReminderDraft } from '@/lib/services/data';
import type { Reminder, ReminderType } from '@/lib/types';

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
 * Deliberately four fields and nothing more. The time uses the browser's own
 * time control so the familiar picker appears on a phone.
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

  const [title, setTitle] = useState(initial?.title ?? '');
  const [time, setTime] = useState(initial?.time ?? '09:00');
  const [type, setType] = useState<ReminderType>(initial?.type ?? 'medicine');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');

  const submit = () => {
    if (!title.trim()) {
      setError(t('reminders.form.nameError'));
      return;
    }
    onSubmit({ title, time, type, note: note || undefined });
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

        <TextField
          label={t('reminders.form.note')}
          hint={t('reminders.form.noteHint')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          autoComplete="off"
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

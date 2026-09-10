'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useCompanion } from '@/lib/providers/companion-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { formatTime, nowMinutes, timeToMinutes } from '@/lib/utils/datetime';

/** How often the clock is checked. A reminder is never more than a minute late. */
const TICK_MS = 30_000;

/**
 * How long after its time a reminder still counts as "now".
 *
 * Without this the alert announces "It is time for your 8 AM tablet" at 7 PM,
 * and every pending reminder from earlier in the day queues up behind it — which
 * on a phone means a wall of banners above whatever the person came to do. A
 * reminder older than this is overdue rather than due; the Reminders screen and
 * the caregiver's missed list are where it belongs.
 */
const ALERT_WINDOW_MINUTES = 90;

/**
 * The in-app reminder alert.
 *
 * When "Reminder alerts" is on, a reminder that has reached its time is shown
 * here — written on screen first, and spoken once by the companion if voice
 * guidance is also on. Turning the setting off silences it completely, so the
 * switch in Settings has a real effect.
 *
 * "Not now" only hides the notice; the reminder itself stays pending, because
 * dismissing a message is not the same as skipping a medicine.
 */
export function ReminderAlert() {
  const { t } = useTranslation();
  const { hydrated, reminders, accessibility, setReminderStatus } = useAppState();
  const { say } = useCompanion();

  const [tick, setTick] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const spokenRef = useRef<Set<string>>(new Set());

  const enabled = hydrated && accessibility.notifications;

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), TICK_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  const due = useMemo(() => {
    if (!enabled) return null;
    // `tick` is what re-runs this as the clock moves.
    void tick;
    const minutes = nowMinutes();
    return (
      reminders
        .filter((reminder) => {
          if (reminder.status !== 'pending' || hidden.includes(reminder.id)) return false;
          const at = timeToMinutes(reminder.time);
          return at >= 0 && at <= minutes && minutes - at <= ALERT_WINDOW_MINUTES;
        })
        .sort((a, b) => timeToMinutes(b.time) - timeToMinutes(a.time))[0] ?? null
    );
  }, [enabled, hidden, reminders, tick]);

  // Say it once per reminder, so returning to the screen does not repeat it.
  useEffect(() => {
    if (!due || spokenRef.current.has(due.id)) return;
    spokenRef.current.add(due.id);
    say(t('reminders.dueNow', { title: due.title, time: formatTime(due.time) }), {
      state: 'pointing',
    });
  }, [due, say, t]);

  if (!due) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-surface=""
      className="card mb-5 rounded-[var(--radius-card)] border border-sun-300/70 bg-sun-100 p-4 shadow-soft sm:p-5"
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-sun-500/25 text-sun-600"
        >
          <BellRing className="size-6" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-sun-600">
            {t('reminders.dueHeading')}
          </p>
          <h2 className="mt-0.5 font-display text-xl font-semibold text-ink sm:text-2xl">
            {t('reminders.dueNow', { title: due.title, time: formatTime(due.time) })}
          </h2>
          {due.note ? <p className="mt-1.5 text-base text-ink-soft">{due.note}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button
              size="lg"
              onClick={() => setReminderStatus(due.id, 'completed')}
              iconLeft={<Check aria-hidden className="size-5" />}
            >
              {due.type === 'medicine' ? t('reminders.markDone') : t('reminders.markDoneGeneric')}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setHidden((current) => [...current, due.id])}
            >
              {t('reminders.later')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

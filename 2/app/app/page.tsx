'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BellRing,
  CalendarCheck,
  Gamepad2,
  LineChart,
  Sparkles,
  Target,
  Volume2,
} from 'lucide-react';
import { ActivityCard } from '@/components/features/activity-card';
import { RecommendationCard } from '@/components/features/recommendation-card';
import { DailyTimeline } from '@/components/features/daily-timeline';
import { ReminderCard } from '@/components/features/reminder-card';
import { CompanionCharacter } from '@/components/companion/companion-character';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useCompanion } from '@/lib/providers/companion-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';
import { recommendationService } from '@/lib/services/recommendations';
import { currentDayPart, formatLongDate, formatTime, nowMinutes, timeToMinutes } from '@/lib/utils/datetime';
import type { TranslationKey } from '@/lib/i18n';

const GREETING: Record<ReturnType<typeof currentDayPart>, TranslationKey> = {
  morning: 'home.greeting.morning',
  afternoon: 'home.greeting.afternoon',
  evening: 'home.greeting.evening',
};

/**
 * The patient home screen.
 *
 * Four large choices sit above everything else; the plan, the next reminder and
 * the suggested activity follow. Nothing here is dense, and nothing competes
 * with the four primary cards for attention.
 */
export default function PatientDashboard() {
  const { t } = useTranslation();
  const {
    hydrated,
    patient,
    activities,
    reminders,
    sessions,
    ability,
    recognitionPeople,
    toggleActivity,
    setReminderStatus,
  } = useAppState();
  const { say } = useCompanion();
  const motionOk = useMotionOk();

  const name = patient?.name ?? '';
  const done = activities.filter((a) => a.completed).length;
  const total = activities.length;

  const nextReminder = useMemo(() => {
    const minutes = nowMinutes();
    const pending = reminders
      .filter((r) => r.status === 'pending')
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return pending.find((r) => timeToMinutes(r.time) >= minutes) ?? pending[0] ?? null;
  }, [reminders]);

  const upcoming = useMemo(() => {
    const pending = activities.filter((a) => !a.completed);
    return (pending.length > 0 ? pending : activities).slice(0, 3);
  }, [activities]);

  // The suggestion comes from the same engine that sets the difficulty, so the
  // level shown on the card is the level the activity will actually run at.
  const recommendation = useMemo(
    () =>
      recommendationService.top({
        sessions,
        preferred: patient?.preferredActivities ?? [],
        ability,
        recognitionPeople,
      }),
    [ability, patient?.preferredActivities, recognitionPeople, sessions],
  );

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <LoadingState label={t('state.loading')} rows={4} />
      </div>
    );
  }

  const greeting = t(GREETING[currentDayPart()], { name });
  const summary = t('home.planSummary', {
    done,
    total,
    next: nextReminder
      ? t('reminders.next', { title: nextReminder.title, time: formatTime(nextReminder.time) })
      : t('reminders.noneLeft'),
  });

  return (
    <div className="space-y-7 pb-4">
      {/* ------------------------------------------------------------ hero */}
      <motion.section
        initial={motionOk ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        aria-labelledby="dashboard-greeting"
      >
        <Card tone="sage" className="overflow-hidden">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-sage-700">{formatLongDate()}</p>
              <h1
                id="dashboard-greeting"
                className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl lg:text-4xl"
              >
                {greeting}
              </h1>

              <div className="mt-5 max-w-md">
                <ProgressBar
                  value={done}
                  max={Math.max(total, 1)}
                  label={t('home.todaysPlan')}
                  valueText={t('home.planProgress', { done, total })}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => say(summary, { state: 'speaking' })}
                  iconLeft={<Volume2 aria-hidden className="size-5" />}
                >
                  {t('home.readAloud')}
                </Button>
                <Link
                  href="/app/my-day"
                  className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-100"
                >
                  {t('home.viewAll')}
                </Link>
              </div>
            </div>

            <div className="hidden shrink-0 sm:block">
              <CompanionCharacter state="encouraging" size={132} />
            </div>
          </div>
        </Card>
      </motion.section>

      {/* -------------------------------------------------- primary choices */}
      <section aria-labelledby="dashboard-actions">
        <h2
          id="dashboard-actions"
          className="mb-3 font-display text-xl font-semibold text-ink sm:text-2xl"
        >
          {t('home.whatWouldYouLike')}
        </h2>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <ActivityCard
            href="/app/games?category=memory"
            title={t('home.card.memory')}
            description={t('home.card.memoryDesc')}
            icon={Gamepad2}
            accent="sage"
            companionTarget="nav-games"
          />
          <ActivityCard
            href="/app/games?category=attention"
            title={t('home.card.attention')}
            description={t('home.card.attentionDesc')}
            icon={Target}
            accent="sky"
          />
          <ActivityCard
            href="/app/my-day"
            title={t('home.card.myDay')}
            description={t('home.card.myDayDesc')}
            icon={CalendarCheck}
            accent="clay"
            companionTarget="nav-my-day"
            badge={
              total > 0 ? (
                <Badge tone="neutral">{t('home.planProgress', { done, total })}</Badge>
              ) : undefined
            }
          />
          <ActivityCard
            href="/app/reminders"
            title={t('home.card.reminders')}
            description={t('home.card.remindersDesc')}
            icon={BellRing}
            accent="sun"
            companionTarget="nav-reminders"
            badge={
              nextReminder ? (
                <Badge tone="warning">{formatTime(nextReminder.time)}</Badge>
              ) : undefined
            }
          />
        </div>
      </section>

      {/* ------------------------------------------- plan + next reminder */}
      {/* `minmax(0,1fr)` rather than the implicit `auto`: a grid track sized to
          its content lets a long reminder title push the column past the
          viewport on a 360px screen. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <section aria-labelledby="dashboard-plan">
          <Card>
            <CardHeader
              title={t('home.todaysPlan')}
              description={t('myDay.completedCount', { done, total })}
              icon={
                <span
                  aria-hidden
                  className="grid size-11 place-items-center rounded-[14px] bg-clay-100 text-clay-600"
                >
                  <CalendarCheck className="size-6" />
                </span>
              }
              action={
                <Link
                  href="/app/my-day"
                  className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
                >
                  {t('home.viewAll')}
                </Link>
              }
            />
            <h2 id="dashboard-plan" className="sr-only">
              {t('home.todaysPlan')}
            </h2>

            <div className="mt-4">
              {total === 0 ? (
                <EmptyState
                  title={t('myDay.empty')}
                  description={t('myDay.emptyDesc')}
                  icon={<CalendarCheck className="size-7" />}
                />
              ) : done === total ? (
                <EmptyState
                  title={t('home.allDone')}
                  description={t('progress.encouragement')}
                  icon={<Sparkles className="size-7" />}
                />
              ) : (
                <DailyTimeline activities={upcoming} onToggle={toggleActivity} grouped={false} />
              )}
            </div>
          </Card>
        </section>

        <section aria-labelledby="dashboard-next" className="space-y-5">
          <Card>
            <CardHeader
              title={t('home.nextUp')}
              icon={
                <span
                  aria-hidden
                  className="grid size-11 place-items-center rounded-[14px] bg-sun-100 text-sun-600"
                >
                  <BellRing className="size-6" />
                </span>
              }
              action={
                <Link
                  href="/app/reminders"
                  className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
                >
                  {t('home.viewAll')}
                </Link>
              }
            />
            <h2 id="dashboard-next" className="sr-only">
              {t('home.nextUp')}
            </h2>

            <div className="mt-4">
              {nextReminder ? (
                <ReminderCard
                  reminder={nextReminder}
                  compact
                  onComplete={(id) => setReminderStatus(id, 'completed')}
                />
              ) : (
                <EmptyState
                  title={t('reminders.noneLeft')}
                  description={t('progress.encouragement')}
                  icon={<BellRing className="size-7" />}
                />
              )}
            </div>
          </Card>

          {recommendation ? <RecommendationCard recommendation={recommendation} /> : null}
        </section>
      </div>

      {/* ---------------------------------------------- secondary choices */}
      <section aria-labelledby="dashboard-more">
        <h2
          id="dashboard-more"
          className="mb-3 font-display text-xl font-semibold text-ink sm:text-2xl"
        >
          {t('home.moreThings')}
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <ActivityCard
            href="/app/planner"
            title={t('home.card.planner')}
            description={t('home.card.plannerDesc')}
            icon={Sparkles}
            accent="lilac"
            size="md"
            companionTarget="nav-planner"
          />
          <ActivityCard
            href="/app/progress"
            title={t('home.card.progress')}
            description={t('home.card.progressDesc')}
            icon={LineChart}
            accent="sage"
            size="md"
            companionTarget="nav-progress"
          />
        </div>
      </section>
    </div>
  );
}

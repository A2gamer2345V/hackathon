'use client';

import { useMemo } from 'react';
import { Activity, BellRing, CalendarCheck, Info } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DailyTimeline } from '@/components/features/daily-timeline';
import { ReminderCard } from '@/components/features/reminder-card';
import { GAME_ICON } from '@/components/features/game-icons';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useRelativeTime } from '@/lib/hooks/use-relative-time';
import { GAMES_BY_ID } from '@/lib/data/games';
import { useFormats } from '@/lib/hooks/use-formats';

/**
 * The activity log.
 *
 * A caregiver's read-only record of what happened in the app today: the plan,
 * the reminders and the activities that were played. Nothing here can be
 * changed from this screen — completing things is the patient's to do.
 */
export default function CaregiverActivityPage() {
  const { t } = useTranslation();
  const relative = useRelativeTime();
  const formats = useFormats();
  const { hydrated, activities, reminders, sessions } = useAppState();

  const recent = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 10),
    [sessions],
  );

  const done = activities.filter((a) => a.completed).length;

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('caregiver.activityTitle')}
          subtitle={t('caregiver.activitySubtitle')}
          icon={<Activity className="size-6" />}
        />
        <LoadingState label={t('state.loading')} rows={3} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('caregiver.activityTitle')}
        subtitle={t('caregiver.activitySubtitle')}
        icon={<Activity className="size-6" />}
      />

      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          {/* ----------------------------------------------------- today's plan */}
          <Card>
            <CardHeader
              title={t('caregiver.planToday')}
              description={formats.longDate()}
              action={
                <Badge tone="sage">
                  {t('caregiver.ofTotal', { done, total: activities.length })}
                </Badge>
              }
            />
            <div className="mt-4">
              {activities.length === 0 ? (
                <EmptyState
                  title={t('myDay.empty')}
                  description={t('myDay.emptyDesc')}
                  icon={<CalendarCheck className="size-7" />}
                />
              ) : (
                // Read-only on purpose: no `onToggle`.
                <DailyTimeline activities={activities} />
              )}
            </div>
          </Card>

          {/* ------------------------------------------------------- reminders */}
          <Card>
            <CardHeader
              title={t('caregiver.remindersToday')}
              description={t('reminders.subtitle')}
            />
            <div className="mt-4 space-y-2.5">
              {reminders.length === 0 ? (
                <EmptyState
                  title={t('reminders.empty')}
                  description={t('reminders.emptyDesc')}
                  icon={<BellRing className="size-7" />}
                />
              ) : (
                [...reminders]
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} compact />
                  ))
              )}
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------ activities played */}
        <Card>
          <CardHeader
            title={t('caregiver.recentPerformance')}
            description={t('caregiver.activitySubtitle')}
          />

          {recent.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title={t('caregiver.noResults')}
                icon={<Activity className="size-7" />}
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((result) => {
                const game = GAMES_BY_ID[result.gameId];
                const Icon = GAME_ICON[result.gameId];
                const minutes = Math.max(1, Math.round(result.durationSeconds / 60));
                return (
                  <li key={result.id} className="flex flex-wrap items-center gap-3.5 py-3.5">
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-sage-100 text-sage-700"
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{t(game.nameKey)}</p>
                      <p className="text-sm text-ink-muted">
                        {relative(result.completedAt)} · {t('common.minutes', { count: minutes })}
                      </p>
                    </div>
                    {result.total > 0 ? (
                      <Badge tone="neutral">
                        {t('caregiver.answered', {
                          correct: result.correct,
                          total: result.total,
                        })}
                      </Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Says plainly what those counts are, and are not. */}
          <p className="mt-4 flex items-start gap-3 border-t border-line pt-4 text-sm text-ink-muted">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('caregiver.accuracyNote')}
          </p>
        </Card>

        <Card tone="sunken">
          <p className="flex items-start gap-3 text-base text-ink-soft">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            {t('caregiver.disclaimer')}
          </p>
        </Card>
      </div>
    </div>
  );
}

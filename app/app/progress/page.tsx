'use client';

import { useMemo } from 'react';
import {
  CalendarCheck,
  Gamepad2,
  Heart,
  LineChart,
  Lock,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ProgressCard } from '@/components/features/progress-card';
import { WeeklyChart } from '@/components/features/weekly-chart';
import { GAME_ICON } from '@/components/features/game-icons';
import { CompanionHint } from '@/components/companion/companion-dock';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { progressService } from '@/lib/services/data';
import { GAMES_BY_ID } from '@/lib/data/games';
import { formatLongDate } from '@/lib/utils/datetime';
import { useRelativeTime } from '@/lib/hooks/use-relative-time';
import { cn } from '@/lib/utils';
import type { Achievement, GameId } from '@/lib/types';

const ACHIEVEMENT_ICON: Record<Achievement['icon'], LucideIcon> = {
  star: Star,
  sunrise: Sunrise,
  heart: Heart,
  sparkles: Sparkles,
  trophy: Trophy,
};

/**
 * The patient's own view of progress.
 *
 * Counts of things done, a gentle weekly shape, and badges. No accuracy
 * percentages, no scores and nothing that could be mistaken for a clinical
 * measure — that framing belongs nowhere, least of all here.
 */
export default function ProgressPage() {
  const { t } = useTranslation();
  const relative = useRelativeTime();
  const { hydrated, patient, sessions, achievements, activities } = useAppState();

  // Read through the service so a real API can replace it untouched. It is a
  // cheap in-memory reduction, so it does not need memoising.
  const week = hydrated && patient ? progressService.daily(patient.id, 7) : [];

  const activitiesThisWeek = week.reduce((sum, day) => sum + day.activitiesCompleted, 0);
  const daysActive = week.filter((day) => day.activitiesCompleted > 0).length;
  const gamesPlayed = week.reduce((sum, day) => sum + day.gamesPlayed, 0);

  const strongest = useMemo(() => {
    const tally = new Map<GameId, number>();
    for (const session of sessions) {
      tally.set(session.gameId, (tally.get(session.gameId) ?? 0) + 1);
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? GAMES_BY_ID[best[0]] : null;
  }, [sessions]);

  const recent = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 5),
    [sessions],
  );

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('progress.title')}
          subtitle={t('progress.subtitle')}
          icon={<LineChart className="size-6" />}
        />
        <LoadingState label={t('state.loading')} rows={3} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('progress.title')}
        subtitle={t('progress.subtitle')}
        icon={<LineChart className="size-6" />}
      />

      <div className="space-y-6">
        {/* ------------------------------------------------------- headline */}
        <div className="grid gap-3.5 sm:grid-cols-3">
          <ProgressCard
            label={t('progress.thisWeek')}
            value={String(activitiesThisWeek)}
            detail={t('progress.activitiesCompleted', { count: activitiesThisWeek })}
            icon={CalendarCheck}
            accent="sage"
          />
          <ProgressCard
            label={t('progress.consistency')}
            value={t('progress.daysActive', { count: daysActive })}
            icon={Sunrise}
            accent="sun"
          />
          <ProgressCard
            label={t('progress.gamesPlayed')}
            value={String(gamesPlayed)}
            detail={strongest ? t('progress.strongest', { activity: t(strongest.nameKey) }) : undefined}
            icon={Gamepad2}
            accent="sky"
          />
        </div>

        {/* ---------------------------------------------------- weekly shape */}
        <Card>
          <CardHeader title={t('progress.weeklyTrend')} description={formatLongDate()} />
          <div className="mt-5">
            <WeeklyChart
              data={week.map((day) => ({ date: day.date, value: day.activitiesCompleted }))}
              label={t('progress.weeklyTrend')}
              unitLabel={t('progress.gamesPlayed')}
            />
          </div>
          <p className="mt-4 text-base text-ink-soft">{t('progress.encouragement')}</p>
        </Card>

        {/* ------------------------------------------------------- badges */}
        <section aria-labelledby="progress-achievements">
          <h2
            id="progress-achievements"
            className="mb-3 font-display text-xl font-semibold text-ink sm:text-2xl"
          >
            {t('progress.achievements')}
          </h2>

          {achievements.length === 0 ? (
            <EmptyState
              title={t('state.emptyTitle')}
              description={t('progress.emptyDesc')}
              icon={<Trophy className="size-7" />}
            />
          ) : (
            <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {achievements.map((achievement) => {
                const Icon = ACHIEVEMENT_ICON[achievement.icon];
                const unlockedAt = achievement.unlockedAt;
                return (
                  <li key={achievement.id}>
                    <div
                      data-surface=""
                      className={cn(
                        'card flex h-full items-start gap-3.5 rounded-[var(--radius-card)] border p-4 shadow-soft sm:p-5',
                        unlockedAt
                          ? 'border-sun-300/70 bg-sun-100'
                          : 'border-line bg-surface-sunken',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-12 shrink-0 place-items-center rounded-full',
                          unlockedAt ? 'bg-sun-500/25 text-sun-600' : 'bg-surface-raised text-ink-muted',
                        )}
                      >
                        {unlockedAt ? <Icon className="size-6" /> : <Lock className="size-5" />}
                      </span>

                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-semibold text-ink">
                          {achievement.titleKey ? t(achievement.titleKey) : achievement.title}
                        </h3>
                        <p className="mt-1 text-base text-ink-soft">
                          {achievement.descriptionKey
                            ? t(achievement.descriptionKey)
                            : achievement.description}
                        </p>
                        <p className="mt-2">
                          {unlockedAt ? (
                            <Badge tone="success">
                              {t('progress.unlockedOn', {
                                date: relative(unlockedAt),
                              })}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">{t('progress.locked')}</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* -------------------------------------------------- recent activity */}
        <Card>
          <CardHeader
            title={t('progress.recent')}
            description={t('myDay.completedCount', {
              done: activities.filter((activity) => activity.completed).length,
              total: activities.length,
            })}
          />

          {recent.length === 0 ? (
            <p className="mt-4 text-lg text-ink-soft">{t('progress.noResults')}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((result) => {
                const game = GAMES_BY_ID[result.gameId];
                const Icon = GAME_ICON[result.gameId];
                return (
                  <li key={result.id} className="flex items-center gap-3.5 py-3.5">
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-sage-100 text-sage-700"
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{t(game.nameKey)}</p>
                      <p className="text-sm text-ink-muted">
                        {relative(result.completedAt)}
                      </p>
                    </div>
                    {result.total > 0 ? (
                      <Badge tone="sage">
                        {t('games.result.summary', {
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
        </Card>

        <CompanionHint text={t('companion.ctx.progress')} />
      </div>
    </div>
  );
}

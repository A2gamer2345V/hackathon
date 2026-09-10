'use client';

import { HelpCircle, Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GAME_ICON } from './game-icons';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE } from './difficulty';
import { GAMES_BY_ID } from '@/lib/data/games';
import { useTranslation } from '@/lib/providers/language-provider';
import { useRelativeTime } from '@/lib/hooks/use-relative-time';
import type { TranslationKey } from '@/lib/i18n';
import type { GameStats, PerformanceTrend } from '@/lib/types';

/**
 * How a trend is shown.
 *
 * Four states, not three: "not enough data" is a real answer and is said out
 * loud rather than being quietly rendered as "steady". Each one carries a word
 * and an icon, so the meaning never rides on colour alone — and "declining"
 * deliberately reads as *needs a look*, because a run of lower scores in a puzzle
 * is a prompt to check in, not a finding about anyone's health.
 */
const TREND_LABEL: Record<PerformanceTrend, TranslationKey> = {
  improving: 'trend.improving',
  steady: 'trend.steady',
  declining: 'trend.declining',
  'not-enough-data': 'trend.not-enough-data',
};

const TREND_TONE: Record<PerformanceTrend, BadgeTone> = {
  improving: 'success',
  steady: 'sage',
  declining: 'warning',
  'not-enough-data': 'neutral',
};

const TREND_ICON: Record<PerformanceTrend, LucideIcon> = {
  improving: TrendingUp,
  steady: Minus,
  declining: TrendingDown,
  'not-enough-data': HelpCircle,
};

export function TrendBadge({ trend }: { trend: PerformanceTrend }) {
  const { t } = useTranslation();
  const Icon = TREND_ICON[trend];
  return (
    <Badge tone={TREND_TONE[trend]} icon={<Icon aria-hidden className="size-4" />}>
      {t(TREND_LABEL[trend])}
    </Badge>
  );
}

/** `95` → `1m 35s`, `40` → `40s`. */
function useDuration() {
  const { t } = useTranslation();
  return (seconds: number) => {
    if (seconds < 60) return t('perf.seconds', { count: Math.round(seconds) });
    return t('perf.minutesSeconds', {
      minutes: Math.floor(seconds / 60),
      seconds: Math.round(seconds % 60),
    });
  };
}

/**
 * One activity's numbers.
 *
 * Kept per-activity on purpose: an average across every game hides the case that
 * matters — someone steady at word recall but struggling with the number tap.
 */
export function GameStatsRow({ stats }: { stats: GameStats }) {
  const { t } = useTranslation();
  const relative = useRelativeTime();
  const duration = useDuration();
  const game = GAMES_BY_ID[stats.gameId];
  const Icon = GAME_ICON[stats.gameId];
  const name = t(game.nameKey);

  return (
    <article className="rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-lg font-semibold text-ink">
          <Icon aria-hidden className="size-5 shrink-0 text-ink-muted" />
          {name}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={DIFFICULTY_TONE[stats.currentDifficulty]}>
            {t(DIFFICULTY_LABEL[stats.currentDifficulty])}
          </Badge>
          <TrendBadge trend={stats.trend} />
        </div>
      </div>

      {stats.sessions === 0 ? (
        <p className="mt-3 text-base text-ink-soft">
          {/* Opened but never finished is not the same as never opened, and a
              caregiver deciding whether an activity suits someone needs to know
              which of the two this is. */}
          {stats.abandoned > 0
            ? t('perf.onlyStopped', { count: stats.abandoned })
            : t('perf.noSessions')}
        </p>
      ) : (
        <>
          <ProgressBar
            className="mt-4"
            value={Math.round(stats.accuracy * 100)}
            label={`${name} — ${t('perf.accuracy')}`}
            valueText={`${Math.round(stats.accuracy * 100)}%`}
            tone="sage"
            size="sm"
          />

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Figure label={t('perf.sessions', { count: stats.sessions })} value={String(stats.sessions)} />
            <Figure label={t('perf.best')} value={`${Math.round(stats.bestAccuracy * 100)}%`} />
            <Figure
              label={t('perf.avgResponse')}
              value={
                stats.averageResponseSeconds === null
                  ? '—'
                  : t('perf.seconds', { count: stats.averageResponseSeconds })
              }
            />
            <Figure label={t('games.timeTaken')} value={duration(stats.averageDurationSeconds)} />
            <Figure label={t('perf.mistakes')} value={String(stats.totalMistakes)} />
            <Figure label={t('perf.hintsUsed')} value={String(stats.totalHints)} />
            {/* Shown beside the averages rather than inside them: these runs
                were stopped part-way, so they are not scores. */}
            {stats.abandoned > 0 ? (
              <Figure label={t('perf.stoppedEarly')} value={String(stats.abandoned)} />
            ) : null}
          </dl>

          {stats.lastPlayedAt ? (
            <p className="mt-3 text-sm text-ink-muted">
              {t('perf.lastPlayed', { time: relative(stats.lastPlayedAt) })}
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Every activity, played or not.
 *
 * Activities with no sessions are still listed — an empty row is information in
 * itself, and hiding them would make "nothing has been tried yet" look the same
 * as "the app has no such activity".
 */
export function GameStatsList({ stats }: { stats: GameStats[] }) {
  // Ordered by how much the activity has been used at all, so one that is
  // opened often and finished rarely does not sink to the bottom unseen.
  const ordered = [...stats].sort(
    (a, b) => b.sessions + b.abandoned - (a.sessions + a.abandoned),
  );
  return (
    <ul className="grid gap-3.5 md:grid-cols-2">
      {ordered.map((entry) => (
        <li key={entry.gameId}>
          <GameStatsRow stats={entry} />
        </li>
      ))}
    </ul>
  );
}

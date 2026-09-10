'use client';

import { useMemo, useState } from 'react';
import { Gauge, Info, Target, Timer, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ProgressCard } from '@/components/features/progress-card';
import { GameStatsList } from '@/components/features/game-stats-card';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useFormats } from '@/lib/hooks/use-formats';
import { allGameStats } from '@/lib/ai/engine';
import { daysBetweenDates } from '@/lib/utils/timezone';
import type { TranslationKey } from '@/lib/i18n';

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const RANGE_LABEL: Record<Range, TranslationKey> = {
  7: 'perf.range.7',
  30: 'perf.range.30',
  90: 'perf.range.90',
};

/**
 * Per-activity results for the caregiver.
 *
 * The Progress screen answers "how much"; this one answers "how did it go, and
 * in which activity". They are kept apart because a single averaged number
 * across seven different activities hides exactly the thing worth noticing.
 *
 * The window is the caregiver's choice, not the app's: a fortnight of quiet over
 * a holiday reads very differently at 7 days than at 90, and picking one for
 * them would be picking the story.
 */
export default function CaregiverPerformancePage() {
  const { t } = useTranslation();
  const formats = useFormats();
  const { hydrated, patient, sessions } = useAppState();
  const [range, setRange] = useState<Range>(30);

  // Windowed in the caregiver's own zone, so "the last 7 days" means the last
  // seven days on their calendar rather than the server's.
  const inRange = useMemo(() => {
    const today = formats.today();
    return sessions.filter((session) => {
      const date = formats.dateOf(session.completedAt);
      if (!date) return false;
      const age = daysBetweenDates(date, today);
      return age >= 0 && age < range;
    });
  }, [sessions, range, formats]);

  const stats = useMemo(() => allGameStats(inRange), [inRange]);

  const totals = useMemo(() => {
    const played = inRange.length;
    // Accuracy describes the runs that were actually played to the end. An
    // activity someone opened and put down is recorded as 0 of 0, and averaging
    // that in would report a person as having got everything wrong on a day they
    // simply chose to stop.
    const finished = inRange.filter((s) => s.state === 'completed');
    if (played === 0 || finished.length === 0) {
      return {
        played,
        accuracy: 0,
        completion: played === 0 ? 0 : finished.length / played,
        response: null as number | null,
      };
    }
    const accuracy = finished.reduce((sum, s) => sum + s.accuracy, 0) / finished.length;
    const paces = finished
      .map((s) => s.averageResponseSeconds)
      .filter((v): v is number => v !== null);
    return {
      played,
      accuracy,
      completion: finished.length / played,
      response: paces.length === 0 ? null : paces.reduce((a, b) => a + b, 0) / paces.length,
    };
  }, [inRange]);

  const patientName = patient?.name.split(' ')[0] ?? '';

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('perf.title')}
          subtitle={t('perf.subtitle')}
          icon={<Gauge className="size-6" />}
        />
        <LoadingState label={t('state.loading')} rows={3} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('perf.title')}
        subtitle={t('perf.subtitle')}
        icon={<Gauge className="size-6" />}
      />

      <div className="space-y-5">
        {/* ------------------------------------------------------------ range */}
        <div
          role="group"
          aria-label={t('perf.title')}
          className="flex flex-wrap gap-2.5"
        >
          {RANGES.map((option) => (
            <Button
              key={option}
              size="md"
              variant={option === range ? 'primary' : 'secondary'}
              aria-pressed={option === range}
              onClick={() => setRange(option)}
            >
              {t(RANGE_LABEL[option])}
            </Button>
          ))}
        </div>

        {totals.played === 0 ? (
          <EmptyState
            title={t('perf.empty')}
            description={t('perf.emptyDesc', { name: patientName })}
            icon={<Target className="size-7" />}
          />
        ) : (
          <>
            {/* -------------------------------------------------- headline */}
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <ProgressCard
                label={t('perf.gamesCompleted')}
                value={String(totals.played)}
                detail={t(RANGE_LABEL[range])}
                icon={Target}
                accent="sage"
              />
              <ProgressCard
                label={t('perf.accuracy')}
                value={`${Math.round(totals.accuracy * 100)}%`}
                detail={t('caregiver.accuracyNote')}
                icon={TrendingUp}
                accent="sky"
              />
              <ProgressCard
                label={t('perf.completionRate')}
                value={`${Math.round(totals.completion * 100)}%`}
                icon={Gauge}
                accent="clay"
              />
              <ProgressCard
                label={t('perf.avgResponse')}
                value={
                  totals.response === null
                    ? '—'
                    : t('perf.seconds', { count: Math.round(totals.response * 10) / 10 })
                }
                icon={Timer}
                accent="sun"
              />
            </div>

            {/* --------------------------------------------------- per game */}
            <Card>
              <CardHeader title={t('perf.perGame')} description={t('perf.subtitle')} />
              <div className="mt-4">
                <GameStatsList stats={stats} />
              </div>
            </Card>
          </>
        )}

        {/* This screen shows the most score-like numbers in the app, so the
            framing matters most here. */}
        <Card tone="sunken">
          <p className="flex items-start gap-3 text-base text-ink-soft">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            {t('perf.notADiagnosis')}
          </p>
        </Card>
      </div>
    </div>
  );
}

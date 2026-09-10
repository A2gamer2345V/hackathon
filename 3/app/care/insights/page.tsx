'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Brain, Info, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { InsightsCard } from '@/components/features/insights-card';
import { TrendBadge } from '@/components/features/game-stats-card';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE } from '@/components/features/difficulty';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import type { TranslationKey } from '@/lib/i18n';

/**
 * What the adaptive engine has noticed, and what it did about it.
 *
 * Two halves. The insights are sentences with their evidence attached; the
 * ability profile is the state those sentences came from — the level each kind
 * of activity is set to right now. Showing the second next to the first is what
 * stops the engine being a black box: a caregiver can see the numbers, disagree,
 * and change the difficulty themselves.
 *
 * Nothing here is a clinical measure. The disclaimer at the foot says so, and
 * the copy above it never uses diagnostic language.
 */
export default function CaregiverInsightsPage() {
  const { t } = useTranslation();
  const { hydrated, patient, insights, ability } = useAppState();
  const patientName = patient?.name.split(' ')[0] ?? '';

  const confidenceKey = useMemo(
    () =>
      (value: number): TranslationKey =>
        value >= 0.66
          ? 'ability.confidenceHigh'
          : value >= 0.33
            ? 'ability.confidenceMedium'
            : 'ability.confidenceLow',
    [],
  );

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('insights.title')}
          subtitle={t('insights.subtitle')}
          icon={<Sparkles className="size-6" />}
        />
        <LoadingState label={t('state.loading')} rows={3} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('insights.title')}
        subtitle={t('insights.subtitle')}
        icon={<Sparkles className="size-6" />}
        action={
          <Link
            href="/care/performance"
            className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
          >
            {t('perf.title')}
          </Link>
        }
      />

      <div className="space-y-5">
        <InsightsCard insights={insights} patientName={patientName} showDisclaimer={false} />

        {/* --------------------------------------------------- ability profile */}
        <Card>
          <CardHeader
            title={t('ability.title')}
            description={t('ability.subtitle')}
            icon={<Brain aria-hidden className="size-6 text-lilac-600" />}
            action={
              ability && ability.sessions > 0 ? (
                <Badge tone="neutral">
                  {t('ability.sessionsFrom', { count: ability.sessions })}
                </Badge>
              ) : null
            }
          />

          {!ability || ability.sessions === 0 ? (
            <p className="mt-4 text-base text-ink-soft">{t('ability.noData')}</p>
          ) : (
            <>
              <p className="mt-4 flex flex-wrap items-center gap-2 text-base text-ink-soft">
                <span className="font-semibold text-ink">{t('ability.load')}:</span>
                <Badge tone={ability.load === 'heavy' ? 'warning' : 'sage'}>
                  {t(`load.${ability.load}` as TranslationKey)}
                </Badge>
                <span>{t('ability.loadDesc')}</span>
              </p>

              <ul className="mt-4 grid gap-3.5 md:grid-cols-2">
                {ability.domains.map((domain) => (
                  <li
                    key={domain.domain}
                    className="rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-ink">
                        {t(`domain.${domain.domain}` as TranslationKey)}
                      </h3>
                      <TrendBadge trend={domain.trend} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-ink-muted">{t('ability.level')}</dt>
                        <dd className="mt-1">
                          <Badge tone={DIFFICULTY_TONE[domain.level]}>
                            {t(DIFFICULTY_LABEL[domain.level])}
                          </Badge>
                        </dd>
                      </div>
                      {/* Only worth a column when the engine actually wants to move. */}
                      {domain.suggestedLevel !== domain.level ? (
                        <div>
                          <dt className="text-ink-muted">{t('ability.next')}</dt>
                          <dd className="mt-1">
                            <Badge tone={DIFFICULTY_TONE[domain.suggestedLevel]}>
                              {t(DIFFICULTY_LABEL[domain.suggestedLevel])}
                            </Badge>
                          </dd>
                        </div>
                      ) : null}
                    </dl>

                    <ProgressBar
                      className="mt-3"
                      value={Math.round(domain.confidence * 100)}
                      label={`${t(`domain.${domain.domain}` as TranslationKey)} — ${t('ability.confidence')}`}
                      valueText={t(confidenceKey(domain.confidence))}
                      size="sm"
                      tone="lilac"
                    />

                    <p className="mt-2 text-sm text-ink-muted">
                      {t('perf.sessions', { count: domain.sessions })} ·{' '}
                      {t('perf.accuracy')} {Math.round(domain.accuracy * 100)}%
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-line pt-4">
                <h3 className="font-display text-lg font-semibold text-ink">
                  {t('ability.pipeline')}
                </h3>
                <p className="mt-1.5 text-base text-ink-soft">{t('ability.pipelineDesc')}</p>
              </div>
            </>
          )}
        </Card>

        {insights.length === 0 && (!ability || ability.sessions === 0) ? (
          <EmptyState
            title={t('perf.empty')}
            description={t('perf.emptyDesc', { name: patientName })}
            icon={<Sparkles className="size-7" />}
          />
        ) : null}

        {/* Required framing, kept at the foot of the screen it applies to. */}
        <Card tone="sunken">
          <p className="flex items-start gap-3 text-base text-ink-soft">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            {t('insights.disclaimer')}
          </p>
        </Card>
      </div>
    </div>
  );
}

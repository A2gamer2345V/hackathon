'use client';

import { CircleAlert, Info, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { useTranslation } from '@/lib/providers/language-provider';
import type { AiInsight } from '@/lib/types';

/**
 * The caregiver's "here is what I noticed" feed.
 *
 * Everything shown is a statement about activity inside ElderEase — accuracy on a
 * puzzle, how often someone played, how many hints were used. It never claims to
 * be a medical observation, and each card carries the numbers behind the
 * sentence so a caregiver can judge it for themselves rather than take the
 * engine's word for it.
 */
export function InsightsCard({
  insights,
  patientName,
  limit,
  showDisclaimer = true,
}: {
  insights: AiInsight[];
  patientName: string;
  /** Cap for the dashboard summary; omit to show everything. */
  limit?: number;
  showDisclaimer?: boolean;
}) {
  const { t } = useTranslation();

  if (insights.length === 0) {
    return (
      <EmptyState
        title={t('insights.empty')}
        description={t('insights.emptyDesc')}
        icon={<Sparkles className="size-7" />}
      />
    );
  }

  const shown = typeof limit === 'number' ? insights.slice(0, limit) : insights;

  return (
    <Card>
      <CardHeader
        title={t('insights.title')}
        description={t('insights.subtitle')}
        icon={<Sparkles aria-hidden className="size-6 text-sage-600" />}
      />

      <ul className="mt-4 space-y-4">
        {shown.map((insight) => (
          <li key={insight.id}>
            <InsightRow insight={insight} patientName={patientName} />
          </li>
        ))}
      </ul>

      {showDisclaimer ? (
        <p className="mt-5 flex items-start gap-3 border-t border-line pt-4 text-sm text-ink-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('insights.disclaimer')}
        </p>
      ) : null}
    </Card>
  );
}

function InsightRow({ insight, patientName }: { insight: AiInsight; patientName: string }) {
  const { t } = useTranslation();
  const attention = insight.severity === 'attention';

  // Icon follows the *kind* of observation, never the severity alone, so an
  // improvement and a decline never look alike in a glance.
  const Icon = insight.titleKey.startsWith('insight.improving')
    ? TrendingUp
    : attention
      ? CircleAlert
      : insight.titleKey.startsWith('insight.declining') ||
          insight.titleKey.startsWith('insight.quiet') ||
          insight.titleKey.startsWith('insight.slower')
        ? TrendingDown
        : Sparkles;

  // The engine leaves `{name}` to the view so the patient's name is never baked
  // into stored data.
  const params = { name: patientName, ...insight.params };

  return (
    <article className="rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-start gap-2 text-lg font-semibold text-ink">
          <Icon
            aria-hidden
            className={attention ? 'mt-0.5 size-5 shrink-0 text-warning' : 'mt-0.5 size-5 shrink-0 text-sage-600'}
          />
          {t(insight.titleKey, params)}
        </h3>
        <Badge tone={attention ? 'warning' : 'sage'}>
          {t(attention ? 'caregiver.severity.attention' : 'caregiver.severity.info')}
        </Badge>
      </div>

      <p className="mt-2 text-base text-ink-soft">{t(insight.bodyKey, params)}</p>

      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="font-semibold text-ink-soft">{t('insights.why')}</dt>
          <dd className="text-ink-muted">{t(insight.evidenceKey, params)}</dd>
        </div>
        {insight.recommendationKey ? (
          <div>
            <dt className="font-semibold text-ink-soft">{t('insights.recommendation')}</dt>
            <dd className="text-ink-muted">{t(insight.recommendationKey, params)}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-3 text-sm text-ink-muted">
        {t('insights.period', { days: insight.periodDays })}
      </p>
    </article>
  );
}

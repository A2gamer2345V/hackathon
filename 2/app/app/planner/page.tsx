'use client';

import { useMemo, useState } from 'react';
import { Info, RefreshCw, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { RecommendationCard } from '@/components/features/recommendation-card';
import { CompanionHint } from '@/components/companion/companion-dock';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { recommendationService } from '@/lib/services/recommendations';

/**
 * The AI activity planner.
 *
 * It suggests things to do based on what has been played recently. It is not an
 * assessment of anybody, and the note at the bottom of the page says so.
 */
export default function PlannerPage() {
  const { t } = useTranslation();
  const { hydrated, patient, sessions, ability, recognitionPeople } = useAppState();
  const [offset, setOffset] = useState(0);

  const ranked = useMemo(
    () =>
      recommendationService.forPatient({
        sessions,
        preferred: patient?.preferredActivities ?? [],
        ability,
        recognitionPeople,
        limit: 6,
      }),
    [ability, patient?.preferredActivities, recognitionPeople, sessions],
  );

  const featured = ranked.length > 0 ? ranked[offset % ranked.length] : null;
  const others = ranked.filter((item) => item.id !== featured?.id).slice(0, 3);

  return (
    <div className="pb-4">
      <PageHeader
        title={t('planner.title')}
        subtitle={t('planner.subtitle')}
        icon={<Sparkles className="size-6" />}
        action={
          ranked.length > 1 ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setOffset((n) => n + 1)}
              iconLeft={<RefreshCw aria-hidden className="size-5" />}
            >
              {t('planner.refresh')}
            </Button>
          ) : undefined
        }
      />

      {!hydrated ? (
        <LoadingState label={t('state.loading')} rows={3} />
      ) : !featured ? (
        <EmptyState
          title={t('state.emptyTitle')}
          description={t('progress.emptyDesc')}
          icon={<Sparkles className="size-7" />}
        />
      ) : (
        <div className="space-y-6">
          <RecommendationCard recommendation={featured} />

          {others.length > 0 ? (
            <section aria-labelledby="planner-others">
              <h2
                id="planner-others"
                className="mb-3 font-display text-xl font-semibold text-ink sm:text-2xl"
              >
                {t('planner.otherIdeas')}
              </h2>
              <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {others.map((item) => (
                  <li key={item.id}>
                    <RecommendationCard recommendation={item} variant="compact" />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Honesty note: recommendations are not a clinical judgement. */}
          <Card tone="sunken">
            <p className="flex items-start gap-3 text-base text-ink-soft">
              <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
              {t('planner.disclaimer')}
            </p>
          </Card>

          <CompanionHint text={t('companion.ctx.planner')} />
        </div>
      )}
    </div>
  );
}

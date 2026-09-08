'use client';

import Link from 'next/link';
import { Clock, Play, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/providers/language-provider';
import { GAMES_BY_ID } from '@/lib/data/games';
import { REASON_KEY } from '@/lib/services/recommendations';
import { cn } from '@/lib/utils';
import type { Recommendation } from '@/lib/types';
import { GAME_ICON } from './game-icons';

/**
 * A suggested activity.
 *
 * Lavender marks everything chosen for the patient by the app, and the card
 * always says *why* in plain words. It suggests activities — it makes no
 * assessment of the person.
 */
export function RecommendationCard({
  recommendation,
  variant = 'feature',
  className,
}: {
  recommendation: Recommendation;
  variant?: 'feature' | 'compact';
  className?: string;
}) {
  const { t } = useTranslation();
  const game = GAMES_BY_ID[recommendation.gameId];
  const Icon = GAME_ICON[game.id];
  const feature = variant === 'feature';

  return (
    <article
      data-surface=""
      className={cn(
        'card rounded-[var(--radius-tile)] border border-lilac-200 bg-lilac-50 shadow-soft',
        feature ? 'p-5 sm:p-6' : 'p-4',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className={cn(
            'grid shrink-0 place-items-center rounded-[18px] bg-lilac-100 text-lilac-600',
            feature ? 'size-16' : 'size-12',
          )}
        >
          <Icon className={feature ? 'size-8' : 'size-6'} strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <Badge tone="lilac" icon={<Sparkles className="size-4" />}>
            {t('planner.badge')}
          </Badge>
          <h3
            className={cn(
              'mt-2 font-display font-semibold text-ink',
              feature ? 'text-2xl' : 'text-lg',
            )}
          >
            {t(game.nameKey)}
          </h3>
          <p className="mt-1 text-base text-ink-soft">{t(game.descriptionKey)}</p>
        </div>
      </div>

      {feature ? (
        <div className="mt-4 rounded-[var(--radius-control)] border border-lilac-200 bg-white/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-lilac-600">
            {t('planner.why')}
          </h4>
          <p className="mt-1 text-base text-ink-soft">{t(REASON_KEY[recommendation.reason])}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">{t(REASON_KEY[recommendation.reason])}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/app/games/${game.id}`}
          className={cn(
            'inline-flex items-center justify-center gap-2.5 rounded-[16px] border border-lilac-600 bg-lilac-500 font-semibold text-ink-inverse shadow-soft transition-colors hover:bg-lilac-600',
            feature ? 'min-h-[3.5rem] px-6 py-3 text-lg' : 'min-h-[3rem] px-5 py-2.5 text-base',
          )}
        >
          <Play aria-hidden className="size-5" />
          {t('planner.startActivity')}
        </Link>
        <Badge tone="neutral" icon={<Clock className="size-4" />}>
          {t('planner.duration', { count: recommendation.estimatedMinutes })}
        </Badge>
      </div>
    </article>
  );
}

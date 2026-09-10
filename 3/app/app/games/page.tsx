'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Gamepad2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { GameCard } from '@/components/features/game-card';
import { LoadingState } from '@/components/ui/states';
import { CompanionHint } from '@/components/companion/companion-dock';
import { GAMES } from '@/lib/data/games';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { MIN_RECOGNITION_PEOPLE } from '@/lib/ai/engine';
import { cn } from '@/lib/utils';
import { COGNITIVE_DOMAINS, type GameCategory } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

/** One filter per cognitive domain, plus "all". Derived from the domain list so
 *  adding a domain cannot leave a category unreachable. */
const CATEGORY_LABEL: Record<GameCategory, TranslationKey> = {
  memory: 'games.memory',
  recognition: 'games.recognition',
  'problem-solving': 'games.problem-solving',
  attention: 'games.attention',
};

const FILTERS: { value: GameCategory | 'all'; labelKey: TranslationKey; href: string }[] = [
  { value: 'all', labelKey: 'games.all', href: '/app/games' },
  ...COGNITIVE_DOMAINS.map((domain) => ({
    value: domain,
    labelKey: CATEGORY_LABEL[domain],
    href: `/app/games?category=${domain}`,
  })),
];

function isCategory(value: string | null): value is GameCategory {
  return value !== null && (COGNITIVE_DOMAINS as string[]).includes(value);
}

export default function GamesPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<LoadingState label={t('state.loading')} rows={3} />}>
      <GamesBrowser />
    </Suspense>
  );
}

function GamesBrowser() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const { hydrated, configFor, recognitionPeople } = useAppState();

  const raw = params.get('category');
  const category: GameCategory | 'all' = isCategory(raw) ? raw : 'all';

  const games = useMemo(
    () => (category === 'all' ? GAMES : GAMES.filter((game) => game.category === category)),
    [category],
  );

  const heading = category === 'all' ? t('games.title') : t(CATEGORY_LABEL[category]);

  return (
    <div className="pb-4">
      <PageHeader
        title={heading}
        subtitle={t('games.subtitle')}
        icon={<Gamepad2 className="size-6" />}
      />

      <nav aria-label={t('games.filter')} className="mb-5">
        <ul className="flex flex-wrap gap-2.5">
          {FILTERS.map((filter) => {
            const active = filter.value === category;
            return (
              <li key={filter.value}>
                <Link
                  href={filter.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-[3rem] items-center rounded-full border px-5 text-base font-semibold transition-colors',
                    active
                      ? 'border-sage-700 bg-sage-600 text-ink-inverse'
                      : 'border-line-strong bg-surface-raised text-ink hover:bg-sage-50',
                  )}
                >
                  {t(filter.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <li key={game.id}>
            {/* The level shown comes from the same call the activity itself
                makes, so the card never promises a level different from the one
                that starts. Before hydration there is no stored history to read,
                so no level is claimed at all. */}
            <GameCard
              game={game}
              level={hydrated ? (configFor(game.id)?.difficulty ?? undefined) : undefined}
              needsSetup={
                hydrated &&
                game.needsFamilyData === true &&
                recognitionPeople < MIN_RECOGNITION_PEOPLE
              }
            />
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <CompanionHint text={t('companion.ctx.games')} />
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Clock, Play, Sparkles, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/providers/language-provider';
import { cn } from '@/lib/utils';
import type { DifficultyLevel, Game } from '@/lib/types';
import { ACCENTS } from './accent';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE } from './difficulty';
import { GAME_ICON } from './game-icons';

export function GameCard({
  game,
  /** The level the adaptive engine has chosen. Falls back to the catalogue's. */
  level,
  /** True when the activity cannot run yet — Faces & Names with nobody added. */
  needsSetup = false,
  className,
}: {
  game: Game;
  level?: DifficultyLevel;
  needsSetup?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const Icon = GAME_ICON[game.id];
  const tone = ACCENTS[game.accent];
  const shown = level ?? game.baseDifficulty;

  return (
    <Link
      href={`/app/games/${game.id}`}
      className={cn(
        'group flex h-full flex-col rounded-[var(--radius-tile)] border p-5 shadow-soft transition-colors hover:shadow-lift',
        tone.surface,
        tone.hover,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('grid size-16 place-items-center rounded-[18px]', tone.bubble)}
      >
        <Icon className="size-8" strokeWidth={1.75} />
      </span>

      <h3 className="mt-4 font-display text-xl font-semibold text-ink">{t(game.nameKey)}</h3>
      <p className="mt-1.5 flex-1 text-base text-ink-soft">{t(game.descriptionKey)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* One badge, not two: when the engine has chosen, the level is named
            inside that sentence rather than repeated beside it. */}
        {level ? (
          <Badge tone={DIFFICULTY_TONE[shown]} icon={<Sparkles className="size-4" />}>
            {t('games.setForYou', { level: t(DIFFICULTY_LABEL[shown]) })}
          </Badge>
        ) : (
          <Badge tone={DIFFICULTY_TONE[shown]}>{t(DIFFICULTY_LABEL[shown])}</Badge>
        )}
        <Badge tone="neutral" icon={<Clock className="size-4" />}>
          {t('common.minutes', { count: game.estimatedMinutes })}
        </Badge>
      </div>

      {needsSetup ? (
        <span className="mt-4 inline-flex items-center gap-2 font-semibold text-clay-600">
          <UserPlus aria-hidden className="size-5" />
          {t('games.needsSetupTitle')}
        </span>
      ) : (
        <span className="mt-4 inline-flex items-center gap-2 font-semibold text-sage-700">
          <Play aria-hidden className="size-5" />
          {t('games.play')}
        </span>
      )}
    </Link>
  );
}

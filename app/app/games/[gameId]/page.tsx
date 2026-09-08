'use client';

import { use } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { GameShell } from '@/components/games/game-shell';
import { GAME_PLAY } from '@/components/games/registry';
import { GAMES_BY_ID, isGameId } from '@/lib/data/games';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * One activity. The shell owns the instructions, scoring and result screen; the
 * component from the registry only draws the play area.
 */
export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { t } = useTranslation();

  if (!isGameId(gameId)) {
    return (
      <ErrorState
        title={t('state.errorTitle')}
        description={t('state.errorDesc')}
        action={
          <ButtonLink href="/app/games" size="lg">
            {t('games.backToGames')}
          </ButtonLink>
        }
      />
    );
  }

  const game = GAMES_BY_ID[gameId];
  const Play = GAME_PLAY[gameId];

  return <GameShell game={game}>{(handle) => <Play handle={handle} />}</GameShell>;
}

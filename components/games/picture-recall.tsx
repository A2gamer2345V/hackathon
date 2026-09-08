'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { PICTURES } from '@/lib/data/game-content';
import type { PictureItem } from '@/lib/data/game-content';
import { PICTURE_ICON } from '@/components/games/visuals';
import { ChoiceGrid, ChoiceTile, GamePrompt, TileLabel } from '@/components/games/game-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/providers/language-provider';
import { shuffle } from '@/lib/utils';
import type { PlayHandle } from '@/components/games/game-shell';

const ROUNDS = 3;
const OPTIONS = 4;
const PAUSE_MS = 1400;

/**
 * Picture Recall — look at a few pictures, then find them again.
 *
 * The study step has no countdown; the person moves on when they say they are
 * ready.
 */
export function PictureRecall({ handle }: { handle: PlayHandle }) {
  const { t } = useTranslation();

  const { studied, rounds } = useMemo(() => {
    const deck = shuffle(PICTURES);
    const targets = deck.slice(0, ROUNDS);
    const rest = deck.slice(ROUNDS);
    return {
      studied: targets,
      rounds: targets.map((target, index) => ({
        target,
        options: shuffle([target, ...rest.slice(index * (OPTIONS - 1), (index + 1) * (OPTIONS - 1))]),
      })),
    };
  }, []);

  const [phase, setPhase] = useState<'study' | 'quiz'>('study');
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (phase === 'quiz') handle.setProgress(round + 1, ROUNDS);
  }, [phase, round, handle]);

  const current = rounds[round];

  const choose = (option: PictureItem) => {
    if (picked) return;
    const wasCorrect = option.id === current.target.id;
    setPicked(option.id);
    setCorrect((n) => n + (wasCorrect ? 1 : 0));
    handle.feedback(wasCorrect, wasCorrect ? undefined : t(current.target.labelKey));

    timer.current = setTimeout(() => {
      if (round + 1 >= ROUNDS) {
        handle.complete(correct + (wasCorrect ? 1 : 0), ROUNDS);
        return;
      }
      setPicked(null);
      setRound((n) => n + 1);
    }, PAUSE_MS);
  };

  if (phase === 'study') {
    return (
      <div>
        <GamePrompt hint={t('games.readyWhenYouAre')}>{t('games.remember')}</GamePrompt>

        <Card tone="sage" className="mx-auto max-w-3xl">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {studied.map((picture) => {
              const Icon = PICTURE_ICON[picture.id];
              return (
                <li
                  key={picture.id}
                  className="flex flex-col items-center gap-2 rounded-[var(--radius-tile)] border-2 border-sage-200 bg-surface-raised p-5"
                >
                  <Icon aria-hidden className="size-14 text-sage-700 sm:size-16" strokeWidth={1.5} />
                  <span className="text-lg font-semibold text-ink">{t(picture.labelKey)}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="mt-6 flex justify-center">
          <Button
            size="xl"
            onClick={() => setPhase('quiz')}
            iconLeft={<Eye aria-hidden className="size-5" />}
          >
            {t('games.imReady')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <GamePrompt>{t('games.prompt.whichSeen')}</GamePrompt>

      <ChoiceGrid columns={4}>
        {current.options.map((option) => {
          const Icon = PICTURE_ICON[option.id];
          const isTarget = option.id === current.target.id;
          const status = !picked ? 'none' : isTarget ? 'correct' : picked === option.id ? 'wrong' : 'none';
          return (
            <ChoiceTile
              key={option.id}
              label={t(option.labelKey)}
              status={status}
              dimmed={Boolean(picked) && status === 'none'}
              disabled={Boolean(picked)}
              onClick={() => choose(option)}
              className="min-h-[8.5rem]"
            >
              <Icon aria-hidden className="size-12 sm:size-14" strokeWidth={1.5} />
              <TileLabel>{t(option.labelKey)}</TileLabel>
            </ChoiceTile>
          );
        })}
      </ChoiceGrid>
    </div>
  );
}

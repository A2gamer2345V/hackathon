'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChoiceGrid, ChoiceTile, GamePrompt } from '@/components/games/game-ui';
import { useTranslation } from '@/lib/providers/language-provider';
import { shuffle } from '@/lib/utils';
import type { PlayHandle } from '@/components/games/game-shell';

const PER_ROUND = 8;
const ROUNDS = 2;
const ROUND_PAUSE_MS = 1200;

/**
 * Number Tap — tap the numbers from smallest to largest.
 *
 * A tap on the wrong number does nothing except offer a gentle line; the number
 * stays available so the person can simply try again.
 */
export function NumberTap({ handle }: { handle: PlayHandle }) {
  const { t } = useTranslation();

  const rounds = useMemo(() => {
    const easy = Array.from({ length: PER_ROUND }, (_, i) => i + 1);
    const pool = Array.from({ length: 24 }, (_, i) => i + 1);
    const harder = [...shuffle(pool).slice(0, PER_ROUND)].sort((a, b) => a - b);
    return [easy, harder].map((values) => ({ values, tiles: shuffle(values) }));
  }, []);

  const [round, setRound] = useState(0);
  const [step, setStep] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [missedHere, setMissedHere] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    handle.setProgress(round + 1, ROUNDS);
  }, [round, handle]);

  const current = rounds[round];
  const target = current.values[step];

  const tap = (value: number) => {
    if (timer.current) return;

    if (value !== target) {
      setMissedHere(true);
      handle.feedback(false);
      return;
    }

    const scored = firstTry + (missedHere ? 0 : 1);
    setFirstTry(scored);
    setMissedHere(false);

    if (step + 1 < current.values.length) {
      setStep((n) => n + 1);
      return;
    }

    // Round finished.
    handle.feedback(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (round + 1 >= ROUNDS) {
        handle.complete(scored, PER_ROUND * ROUNDS);
        return;
      }
      setStep(0);
      setRound((n) => n + 1);
    }, ROUND_PAUSE_MS);
  };

  return (
    <div>
      <GamePrompt hint={t('game.number-tap.how')}>
        {t('games.prompt.tapNext', { number: target })}
      </GamePrompt>

      <ChoiceGrid columns={4}>
        {current.tiles.map((value) => {
          const done = current.values.indexOf(value) < step;
          return (
            <ChoiceTile
              key={value}
              label={String(value)}
              status={done ? 'correct' : 'none'}
              dimmed={done}
              disabled={done}
              onClick={() => tap(value)}
              className="min-h-[6.5rem]"
            >
              <span className="font-display text-3xl font-semibold tabular-nums sm:text-4xl">
                {value}
              </span>
            </ChoiceTile>
          );
        })}
      </ChoiceGrid>
    </div>
  );
}

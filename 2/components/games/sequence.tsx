'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GamePrompt } from '@/components/games/game-ui';
import { useTranslation } from '@/lib/providers/language-provider';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';
import { cn } from '@/lib/utils';
import type { PlayHandle } from '@/components/games/game-shell';

const LENGTHS = [3, 4, 5];
const TILES = [1, 2, 3, 4] as const;
const START_MS = 700;
const ON_MS = 750;
const OFF_MS = 380;
const PAUSE_MS = 1300;

/** Each tile has a number as well as a tint — the pattern is never colour alone. */
const TILE_STYLE: Record<number, { idle: string; lit: string }> = {
  1: { idle: 'bg-sage-100 border-sage-300 text-sage-800', lit: 'bg-sage-500 border-sage-700 text-ink-inverse' },
  2: { idle: 'bg-sky-100 border-sky-300 text-ink', lit: 'bg-sky-500 border-sky-600 text-ink-inverse' },
  3: { idle: 'bg-sun-100 border-sun-300 text-ink', lit: 'bg-sun-500 border-sun-600 text-ink' },
  4: { idle: 'bg-lilac-100 border-lilac-200 text-lilac-600', lit: 'bg-lilac-500 border-lilac-600 text-ink-inverse' },
};

function makeSequence(length: number): number[] {
  const out: number[] = [];
  while (out.length < length) {
    const next = TILES[Math.floor(Math.random() * TILES.length)];
    if (out[out.length - 1] !== next) out.push(next);
  }
  return out;
}

/**
 * Sequence — watch the buttons light up, then tap them in the same order.
 *
 * The pattern replays at a comfortable pace and each lit button is announced,
 * so the activity works without watching the screen closely.
 */
export function Sequence({ handle }: { handle: PlayHandle }) {
  const { t } = useTranslation();
  const motionOk = useMotionOk();

  const rounds = useMemo(() => LENGTHS.map((length) => makeSequence(length)), []);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'watch' | 'repeat'>('watch');
  const [active, setActive] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [locked, setLocked] = useState(false);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sequence = rounds[index];

  useEffect(
    () => () => {
      if (advance.current) clearTimeout(advance.current);
    },
    [],
  );

  useEffect(() => {
    handle.setProgress(index + 1, rounds.length);
  }, [index, rounds.length, handle]);

  // Play the pattern back.
  useEffect(() => {
    if (phase !== 'watch') return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let i = 0;

    const run = () => {
      if (i >= sequence.length) {
        timeouts.push(setTimeout(() => setPhase('repeat'), 400));
        return;
      }
      setActive(sequence[i]);
      timeouts.push(
        setTimeout(() => {
          setActive(null);
          i += 1;
          timeouts.push(setTimeout(run, OFF_MS));
        }, ON_MS),
      );
    };

    timeouts.push(setTimeout(run, START_MS));
    return () => {
      timeouts.forEach(clearTimeout);
      setActive(null);
    };
  }, [phase, sequence]);

  const nextRound = (scored: number) => {
    advance.current = setTimeout(() => {
      advance.current = null;
      if (index + 1 >= rounds.length) {
        handle.complete(scored, rounds.length);
        return;
      }
      setStep(0);
      setLocked(false);
      setIndex((n) => n + 1);
      setPhase('watch');
    }, PAUSE_MS);
  };

  const tap = (tile: number) => {
    if (phase !== 'repeat' || locked) return;

    if (tile !== sequence[step]) {
      setLocked(true);
      handle.feedback(false);
      nextRound(correct);
      return;
    }

    if (step + 1 < sequence.length) {
      setStep((n) => n + 1);
      return;
    }

    const scored = correct + 1;
    setCorrect(scored);
    setLocked(true);
    handle.feedback(true);
    nextRound(scored);
  };

  return (
    <div>
      <GamePrompt hint={phase === 'repeat' ? t('games.round', { current: step + 1, total: sequence.length }) : undefined}>
        {phase === 'watch' ? t('games.prompt.watch') : t('games.prompt.yourTurn')}
      </GamePrompt>

      {/* Announces each lit button so the pattern is available without sight. */}
      <p aria-live="polite" className="sr-only">
        {active ? t('games.tile', { number: active }) : ''}
      </p>

      <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
        {TILES.map((tile) => {
          const lit = active === tile;
          const style = TILE_STYLE[tile];
          return (
            <button
              key={tile}
              type="button"
              onClick={() => tap(tile)}
              disabled={phase !== 'repeat' || locked}
              aria-label={t('games.tile', { number: tile })}
              className={cn(
                'flex aspect-square items-center justify-center rounded-[var(--radius-tile)] border-2',
                'font-display text-4xl font-semibold transition-all duration-200 sm:text-5xl',
                'focus-visible:outline-3 focus-visible:outline-offset-3',
                'disabled:cursor-default',
                lit ? style.lit : style.idle,
                lit && motionOk && 'scale-[1.04]',
                phase === 'repeat' && !locked && 'hover:brightness-95',
              )}
            >
              <span aria-hidden>{tile}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

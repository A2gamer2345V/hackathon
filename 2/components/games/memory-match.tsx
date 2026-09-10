'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Check, HelpCircle, X } from 'lucide-react';
import { PICTURES } from '@/lib/data/game-content';
import type { PictureItem } from '@/lib/data/game-content';
import { PICTURE_ICON } from '@/components/games/visuals';
import { GamePrompt } from '@/components/games/game-ui';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useTranslation } from '@/lib/providers/language-provider';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';
import { cn, shuffle } from '@/lib/utils';
import type { PlayHandle } from '@/components/games/game-shell';

/**
 * Memory Match — find the pairs.
 *
 * The design problem this screen solves: people were reading the face-down cards
 * as a loading state. So a face-down card is now unmistakably a card — a warm
 * patterned back, a large question mark, and the words "Tap to reveal" printed on
 * it. Nothing on this screen pulses, spins or shimmers.
 *
 * Four states, each different in colour, border, icon and text, so they are
 * distinguishable without relying on colour alone:
 *   hidden    — patterned back, "Tap to reveal"
 *   revealed  — picture and its name, raised surface
 *   matched   — green, ticked, the word "Pair found!"
 *   not-a-pair— amber outline for a moment, then both turn back over
 *
 * There is no timer and no move limit. The only number that matters is
 * "Pairs Found: 3 / 8", which only ever goes up.
 */

const FLIP_BACK_MS = 1400;

interface CardModel {
  key: string;
  picture: PictureItem;
}

type CardState = 'hidden' | 'revealed' | 'matched' | 'not-a-pair';

export function MemoryMatch({ handle }: { handle: PlayHandle }) {
  const { t } = useTranslation();
  const motionOk = useMotionOk();

  // The engine decides how many pairs; clamped to the pictures we actually have.
  const pairs = Math.max(2, Math.min(handle.config.pairs, PICTURES.length));

  // Built once per attempt — GameShell remounts this component on "play again".
  const cards = useMemo<CardModel[]>(() => {
    const chosen = shuffle(PICTURES).slice(0, pairs);
    const deck = chosen.flatMap((picture) => [
      { key: `${picture.id}-a`, picture },
      { key: `${picture.id}-b`, picture },
    ]);
    return shuffle(deck);
  }, [pairs]);

  const [matched, setMatched] = useState<string[]>([]);
  const [open, setOpen] = useState<string[]>([]);
  /** Set while a mismatched pair is being shown, so both can be styled as such. */
  const [missed, setMissed] = useState<string[]>([]);
  const [turns, setTurns] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busy = missed.length > 0;
  const done = matched.length === pairs;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    handle.setProgress(matched.length, pairs);
  }, [matched, pairs, handle]);

  // Finishing is announced on this screen first, then handed to the shell so the
  // person sees the completed board before it is replaced.
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => {
      // Accuracy that means something: pairs found per turn taken. A flawless
      // game is pairs/pairs, so the engine reads a real number rather than 100%
      // every time.
      handle.complete(pairs, Math.max(turns, pairs), {
        key: 'memoryMatch.summaryTurns',
        values: { total: pairs, turns: Math.max(turns, pairs) },
      });
    }, 1100);
    return () => clearTimeout(id);
    // `turns` is read at the moment the board completes and must not re-arm this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const stateOf = (card: CardModel): CardState => {
    if (matched.includes(card.picture.id)) return 'matched';
    if (missed.includes(card.key)) return 'not-a-pair';
    if (open.includes(card.key)) return 'revealed';
    return 'hidden';
  };

  const flip = (card: CardModel) => {
    if (busy || done || open.includes(card.key) || matched.includes(card.picture.id)) return;

    const next = [...open, card.key];
    setOpen(next);
    if (next.length < 2) return;

    setTurns((n) => n + 1);
    const first = cards.find((c) => c.key === next[0]);

    if (first && first.picture.id === card.picture.id) {
      setMatched((prev) => [...prev, card.picture.id]);
      setOpen([]);
      handle.feedback(true);
      return;
    }

    // Not a pair. Both faces stay up long enough to be read and remembered,
    // marked as "not a pair" rather than simply vanishing.
    handle.feedback(false);
    setMissed(next);
    timer.current = setTimeout(() => {
      setOpen([]);
      setMissed([]);
    }, FLIP_BACK_MS);
  };

  return (
    <div>
      <GamePrompt hint={t('games.subtitle')}>{t('memoryMatch.instruction')}</GamePrompt>

      {/* ------------------------------------------------ score and help */}
      <div className="mx-auto mb-5 flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <div className="w-full flex-1">
          <ProgressBar
            value={matched.length}
            max={pairs}
            label={t('memoryMatch.pairsLabel')}
            valueText={t('memoryMatch.pairsFound', { done: matched.length, total: pairs })}
          />
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          iconLeft={<HelpCircle aria-hidden className="size-5" />}
          className="w-full shrink-0 sm:w-auto"
        >
          {t('memoryMatch.howTitle')}
        </Button>
      </div>

      {showHelp ? (
        <div className="mx-auto mb-5 max-w-xl rounded-[var(--radius-card)] border-2 border-sage-300 bg-sage-50 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-sage-800">
            <BookOpen aria-hidden className="size-5" />
            {t('memoryMatch.howTitle')}
          </h2>
          <ol className="mt-3 space-y-2.5 text-lg text-ink">
            {(['how1', 'how2', 'how3', 'how4', 'how5'] as const).map((step, i) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-sage-200 text-base font-semibold text-sage-800"
                >
                  {i + 1}
                </span>
                <span>{t(`memoryMatch.${step}`)}</span>
              </li>
            ))}
          </ol>
          <Button size="lg" onClick={() => setShowHelp(false)} className="mt-4 w-full sm:w-auto">
            {t('memoryMatch.gotIt')}
          </Button>
        </div>
      ) : null}

      {done ? (
        <p
          role="status"
          className="mx-auto mb-5 max-w-xl rounded-[var(--radius-card)] border-2 border-sage-500 bg-sage-100 p-4 text-center font-display text-xl font-semibold text-sage-800"
        >
          {t('memoryMatch.allFound')}
        </p>
      ) : null}

      {/* ------------------------------------------------------- the board */}
      <div
        className={cn(
          'mx-auto grid max-w-3xl gap-3 sm:gap-4',
          pairs <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4',
        )}
      >
        {cards.map((card, index) => {
          const state = stateOf(card);
          const Icon = PICTURE_ICON[card.picture.id];
          const name = t(card.picture.labelKey);
          const number = index + 1;

          const label =
            state === 'matched'
              ? t('memoryMatch.matchedCard', { number, name })
              : state === 'hidden'
                ? t('memoryMatch.faceDown', { number })
                : t('memoryMatch.revealed', { number, name });

          return (
            <motion.button
              key={card.key}
              type="button"
              onClick={() => flip(card)}
              disabled={state === 'matched' || busy || done}
              aria-label={label}
              // A gentle lift when a pair is found; a small nudge when it is not.
              // Both are skipped entirely when reduced motion is on.
              animate={
                motionOk && state === 'matched'
                  ? { scale: [1, 1.06, 1] }
                  : motionOk && state === 'not-a-pair'
                    ? { x: [0, -5, 5, -3, 0] }
                    : undefined
              }
              transition={{ duration: 0.4 }}
              className={cn(
                'relative flex aspect-[3/4] min-h-[7rem] flex-col items-center justify-center gap-1.5',
                'rounded-[var(--radius-tile)] border-[3px] p-2 transition-colors duration-200',
                'focus-visible:outline-3 focus-visible:outline-offset-3',
                state === 'matched' && 'border-sage-600 bg-sage-100 text-sage-800',
                state === 'revealed' && 'border-sky-500 bg-surface-raised text-ink shadow-lift',
                state === 'not-a-pair' && 'border-sun-500 bg-sun-100 text-ink',
                state === 'hidden' &&
                  'border-sage-500 bg-sage-100 text-sage-800 shadow-soft hover:bg-sage-200 hover:shadow-lift active:scale-[0.98] cursor-pointer',
              )}
            >
              {state === 'hidden' ? (
                <>
                  {/* A card back, not a placeholder: a patterned panel with a
                      large "?" and words on it. */}
                  <span
                    aria-hidden
                    className="absolute inset-1.5 rounded-[12px] border-2 border-dashed border-sage-400/80"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, rgba(255,255,255,.55) 0 6px, transparent 6px 12px)',
                    }}
                  />
                  <span aria-hidden className="relative font-display text-4xl font-bold sm:text-5xl">
                    ?
                  </span>
                  <span aria-hidden className="relative text-xs font-semibold sm:text-sm">
                    {t('memoryMatch.tapToReveal')}
                  </span>
                </>
              ) : (
                <>
                  {state === 'matched' ? (
                    <span
                      aria-hidden
                      className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-sage-600 text-ink-inverse"
                    >
                      <Check className="size-4" />
                    </span>
                  ) : null}
                  {state === 'not-a-pair' ? (
                    <span
                      aria-hidden
                      className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-sun-500 text-ink"
                    >
                      <X className="size-4" />
                    </span>
                  ) : null}

                  {/* Large on purpose — no small icons anywhere on this board. */}
                  <Icon aria-hidden className="size-12 sm:size-14" strokeWidth={1.6} />
                  <span className="line-clamp-1 text-sm font-semibold sm:text-base">{name}</span>
                  {state === 'matched' ? (
                    <span className="text-xs font-semibold text-sage-700 sm:text-sm">
                      {t('memoryMatch.matched')}
                    </span>
                  ) : null}
                </>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Why two cards just turned back over — announced, and visible. */}
      <p
        aria-live="polite"
        className={
          busy
            ? 'mx-auto mt-5 max-w-xl rounded-[var(--radius-control)] border-2 border-sun-500 bg-sun-100 p-3.5 text-center text-lg font-semibold text-ink'
            : 'sr-only'
        }
      >
        {busy ? t('memoryMatch.notAPair') : ''}
      </p>
    </div>
  );
}

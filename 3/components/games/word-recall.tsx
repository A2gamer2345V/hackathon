'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { WORDS, pickThemed } from '@/lib/data/game-content';
import type { WordItem } from '@/lib/data/game-content';
import { ChoiceGrid, ChoiceTile, GamePrompt } from '@/components/games/game-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/providers/language-provider';
import { shuffle } from '@/lib/utils';
import type { PlayHandle } from '@/components/games/game-shell';

const TO_REMEMBER = 4;
const DISTRACTORS = 4;
const REVIEW_MS = 2600;

/**
 * Word Recall — read a few words, then pick them out of a longer list.
 *
 * Choosing extra words is not punished: the score counts the words that were
 * remembered, never the ones that were not.
 */
export function WordRecall({ handle }: { handle: PlayHandle }) {
  const { t } = useTranslation();

  const { studied, options } = useMemo(() => {
    // The words to remember lean towards things this person cares about — a
    // gardener is asked to hold on to "flower" rather than an arbitrary noun,
    // which is easier to picture and worth more when it comes back. The
    // distractors are drawn from whatever is left, so they stay plausible
    // without being themed clues in their own right.
    const targets = pickThemed(WORDS, TO_REMEMBER, handle.interests, shuffle);
    const chosen = new Set(targets.map((word) => word.id));
    const extras = shuffle(WORDS.filter((word) => !chosen.has(word.id))).slice(0, DISTRACTORS);
    return { studied: targets, options: shuffle([...targets, ...extras]) };
    // Interests are read once per run on purpose: re-picking the deck mid-play
    // would swap the words out from under someone who is trying to recall them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [phase, setPhase] = useState<'study' | 'quiz'>('study');
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const targetIds = useMemo(() => studied.map((word) => word.id), [studied]);

  const toggle = (word: WordItem) => {
    if (checked) return;
    setSelected((prev) =>
      prev.includes(word.id) ? prev.filter((id) => id !== word.id) : [...prev, word.id],
    );
  };

  const check = () => {
    const found = selected.filter((id) => targetIds.includes(id)).length;
    setChecked(true);
    handle.feedback(found === TO_REMEMBER);
    timer.current = setTimeout(() => handle.complete(found, TO_REMEMBER), REVIEW_MS);
  };

  if (phase === 'study') {
    return (
      <div>
        <GamePrompt hint={t('games.readyWhenYouAre')}>{t('games.remember')}</GamePrompt>

        <Card tone="sky" className="mx-auto max-w-2xl">
          <ul className="grid grid-cols-2 gap-3">
            {studied.map((word) => (
              <li
                key={word.id}
                className="rounded-[var(--radius-tile)] border-2 border-sky-300/70 bg-surface-raised px-4 py-6 text-center font-display text-2xl font-semibold text-ink sm:text-3xl"
              >
                {t(word.labelKey)}
              </li>
            ))}
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
      <GamePrompt hint={t('games.pickCount', { count: TO_REMEMBER })}>
        {t('games.prompt.pickWords')}
      </GamePrompt>

      <ChoiceGrid columns={4}>
        {options.map((word) => {
          const isTarget = targetIds.includes(word.id);
          const isSelected = selected.includes(word.id);
          const status = !checked
            ? 'none'
            : isTarget
              ? 'correct'
              : isSelected
                ? 'wrong'
                : 'none';
          return (
            <ChoiceTile
              key={word.id}
              label={t(word.labelKey)}
              selected={isSelected}
              status={status}
              dimmed={checked && status === 'none'}
              disabled={checked}
              onClick={() => toggle(word)}
              className="min-h-[6rem]"
            >
              <span className="font-display text-xl font-semibold sm:text-2xl">
                {t(word.labelKey)}
              </span>
            </ChoiceTile>
          );
        })}
      </ChoiceGrid>

      {!checked ? (
        <div className="mt-6 flex justify-center">
          <Button size="xl" onClick={check} disabled={selected.length === 0}>
            {t('games.checkAnswer')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

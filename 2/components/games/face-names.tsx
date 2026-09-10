'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { GamePrompt, ChoiceGrid, ChoiceTile, TileLabel } from '@/components/games/game-ui';
import { HintButton, type PlayHandle } from '@/components/games/game-shell';
import { Portrait } from '@/components/features/portrait';
import { RELATION_KEY, relationshipLabel } from '@/components/features/relationship';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { MIN_RECOGNITION_PEOPLE } from '@/lib/ai/engine';
import { shuffle } from '@/lib/utils';
import type { FamilyMember, Relationship } from '@/lib/types';

/**
 * Faces & Names — recognising the people who are actually in this person's life.
 *
 * The people come from the family records a caregiver has entered, never from a
 * stock photo set, which is what makes the activity worth doing. Two kinds of
 * question, both drawn from the same records:
 *   "Who is this person?"  → pick the name
 *   "Who is Meena to you?" → pick the relationship
 *
 * Everything the engine varies lives in `handle.config`: how many rounds, how
 * many choices, and how alike the wrong answers are. With "high" similarity the
 * distractors are chosen from the same kind of relationship, which is a much
 * harder question than telling a daughter from a neighbour.
 */

/** Relationships that feel alike, for building believable wrong answers. */
const SIMILAR: Relationship[][] = [
  ['son', 'daughter', 'grandson', 'granddaughter'],
  ['wife', 'husband'],
  ['brother', 'sister'],
  ['mother', 'father'],
  ['friend', 'neighbour', 'carer', 'other'],
];

type Mode = 'who' | 'relation';

interface Round {
  person: FamilyMember;
  mode: Mode;
  /** Names or relationship labels, already shuffled. Exactly one is right. */
  options: string[];
  answer: string;
}

export function FaceNames({ handle }: { handle: PlayHandle }) {
  const { t } = useTranslation();
  const { family, role } = useAppState();

  const people = useMemo(() => family.filter((f) => f.inRecognitionGame), [family]);

  const labelFor = useCallback(
    (person: FamilyMember) => relationshipLabel(person, t),
    [t],
  );

  // Built once per attempt. The shell remounts on "play again", which reshuffles.
  const rounds = useMemo<Round[]>(() => {
    if (people.length < MIN_RECOGNITION_PEOPLE) return [];

    const { rounds: wanted, choices, distractorSimilarity } = handle.config;
    const order = shuffle(people);
    const count = Math.min(wanted, Math.max(order.length, 1) * 2);

    return Array.from({ length: count }, (_, i) => {
      const person = order[i % order.length];
      // Relationship questions only once names are being handled comfortably.
      const mode: Mode = distractorSimilarity === 'low' || i % 3 !== 2 ? 'who' : 'relation';

      if (mode === 'who') {
        const pool =
          distractorSimilarity === 'high'
            ? // Same sort of relationship — a much closer call.
              people.filter(
                (p) =>
                  p.id !== person.id &&
                  SIMILAR.some(
                    (group) =>
                      group.includes(p.relationship) && group.includes(person.relationship),
                  ),
              )
            : people.filter((p) => p.id !== person.id);
        const others = shuffle(pool.length >= choices - 1 ? pool : people.filter((p) => p.id !== person.id))
          .slice(0, Math.max(0, choices - 1))
          .map((p) => p.name);
        return {
          person,
          mode,
          options: shuffle([person.name, ...others]),
          answer: person.name,
        };
      }

      const answer = labelFor(person);
      const group = SIMILAR.find((g) => g.includes(person.relationship)) ?? [];
      const near = distractorSimilarity === 'low' ? [] : group.filter((r) => r !== person.relationship);
      const rest = (Object.keys(RELATION_KEY) as Relationship[]).filter(
        (r) => r !== person.relationship && r !== 'other' && !near.includes(r),
      );
      const others = [...shuffle(near), ...shuffle(rest)]
        .slice(0, Math.max(0, choices - 1))
        .map((r) => t(RELATION_KEY[r]));

      return { person, mode, options: shuffle([answer, ...others]), answer };
    });
  }, [handle.config, labelFor, people, t]);

  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const round = rounds[index];

  useEffect(() => {
    if (rounds.length > 0) handle.setProgress(index + 1, rounds.length);
  }, [handle, index, rounds.length]);

  // ------------------------------------------------------------ not ready yet
  if (people.length < MIN_RECOGNITION_PEOPLE) {
    return (
      <EmptyState
        icon={<UserPlus className="size-8" />}
        title={t('faceNames.noPeopleTitle')}
        description={t('faceNames.noPeopleDesc')}
        action={
          // Only a caregiver can add people, so only they are offered the link.
          role === 'caregiver' ? (
            <ButtonLink href="/care/family" size="lg" iconLeft={<UserPlus className="size-5" />}>
              {t('family.add')}
            </ButtonLink>
          ) : undefined
        }
      />
    );
  }

  if (!round) return null;

  const answered = picked !== null;

  const choose = (option: string) => {
    if (answered) return;
    setPicked(option);
    const wasRight = option === round.answer;
    if (wasRight) setCorrect((n) => n + 1);
    handle.feedback(wasRight, wasRight ? undefined : round.answer);

    setTimeout(() => {
      if (index + 1 >= rounds.length) {
        handle.complete(wasRight ? correct + 1 : correct, rounds.length);
        return;
      }
      setIndex((n) => n + 1);
      setPicked(null);
      setHint(null);
    }, 1500);
  };

  const giveHint = () => {
    setHintsUsed((n) => n + 1);
    setHint(
      round.mode === 'who'
        ? t('faceNames.hintLetter', { letter: round.person.name.charAt(0) })
        : t('faceNames.hintRelation', { relation: labelFor(round.person) }),
    );
  };

  return (
    <div>
      <GamePrompt hint={hint ?? undefined}>
        {round.mode === 'who'
          ? t('faceNames.whoIsThis')
          : t('faceNames.whoIsThisTo', { name: round.person.name })}
      </GamePrompt>

      {/* The face, large and central. A relationship question already names the
          person, so the picture is decorative there and must not announce them. */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <Portrait
          seed={round.person.id}
          name={round.mode === 'who' ? t('faceNames.photoOf') : round.person.name}
          photo={round.person.photo}
          size={184}
          labelled={round.mode === 'who'}
        />
        {!round.person.photo ? (
          <span className="text-sm text-ink-muted">{t('faceNames.noPhoto')}</span>
        ) : null}
      </div>

      <ChoiceGrid columns={round.options.length > 3 ? 4 : 2}>
        {round.options.map((option) => (
          <ChoiceTile
            key={option}
            label={option}
            onClick={() => choose(option)}
            disabled={answered}
            status={
              !answered
                ? 'none'
                : option === round.answer
                  ? 'correct'
                  : option === picked
                    ? 'wrong'
                    : 'none'
            }
            dimmed={answered && option !== round.answer && option !== picked}
          >
            <TileLabel>{option}</TileLabel>
          </ChoiceTile>
        ))}
      </ChoiceGrid>

      <div className="mt-6 flex justify-center">
        <HintButton handle={handle} used={hintsUsed} onHint={giveHint} />
      </div>
    </div>
  );
}

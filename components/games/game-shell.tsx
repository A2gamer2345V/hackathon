'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Lightbulb, PartyPopper, Play, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { CompanionCharacter } from '@/components/companion/companion-character';
import { GAME_ICON } from '@/components/features/game-icons';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE, REASON_LABEL } from '@/components/features/difficulty';
import { ACCENTS } from '@/components/features/accent';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useCompanion } from '@/lib/providers/companion-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';
import { pickRandom } from '@/lib/utils';
import type { Game, GameConfig } from '@/lib/types';
import type { MessageValues, TranslationKey } from '@/lib/i18n';

/**
 * The frame every activity runs inside.
 *
 * It owns the three phases (instructions → playing → result), the encouraging
 * feedback line, and the single write to the session service. Individual games
 * only worry about their own play area and call `complete` when they finish.
 *
 * It is also where the adaptive engine meets the games: the shell asks the engine
 * for a `GameConfig` and hands it to the activity through the play handle, so no
 * game contains difficulty logic of its own. On the way back out it records what
 * actually happened — accuracy, mistakes, hints, pace — which is what the engine
 * reads next time.
 *
 * There is no timer and no losing state anywhere in here: the result screen
 * reports what was answered and thanks the person for taking part.
 */

/**
 * A game's own wording for the result line.
 *
 * "You got 6 of 9 right" is the wrong sentence for a pairs game, so an activity
 * may phrase its own — as a translation key, never as English text.
 */
export interface ResultSummary {
  key: TranslationKey;
  values?: MessageValues;
}

export interface PlayHandle {
  /** What the engine chose for this run: rounds, choices, pairs, hints. */
  config: GameConfig;
  /**
   * Show a short encouraging line. Never negative.
   *
   * Also how the shell measures the run: each call is one answer, and a `false`
   * counts a mistake, so games do not have to keep score twice.
   */
  feedback: (wasCorrect: boolean, answer?: string) => void;
  /** Update the "Round x of y" indicator. */
  setProgress: (current: number, total: number) => void;
  /** Call when the person uses a hint, so the engine can see it was needed. */
  noteHint: () => void;
  /** Finish the activity and show the result screen. */
  complete: (correct: number, total: number, summary?: ResultSummary) => void;
}

/** Used until the store has hydrated, so the intro screen is never empty. */
function fallbackConfig(game: Game): GameConfig {
  const shape =
    game.baseDifficulty === 'hard'
      ? { rounds: 8, choices: 4, pairs: 8 }
      : game.baseDifficulty === 'medium'
        ? { rounds: 6, choices: 3, pairs: 6 }
        : { rounds: 4, choices: 2, pairs: 4 };
  return {
    gameId: game.id,
    difficulty: game.baseDifficulty,
    ...shape,
    distractorSimilarity: 'low',
    hintsAllowed: 2,
    timeLimitSeconds: null,
    rationale: ['first-time'],
  };
}

const PRAISE: TranslationKey[] = ['feedback.wellDone', 'feedback.greatJob', 'feedback.thatsRight'];

/**
 * The counters for one run: answers, mistakes, hints, and the gaps between
 * answers that become the average response time.
 *
 * Deliberately outside React's reactive graph. None of it is rendered, every
 * write comes from an event handler, and `complete` needs the very latest
 * numbers — including the answer given moments earlier in the same tick, which
 * a value captured by an earlier render would miss and undercount.
 *
 * The numbers live in closure variables rather than as properties, so the
 * object handed to the games is itself never mutated.
 */
function createTally() {
  let mistakes = 0;
  let hints = 0;
  let answers = 0;
  let lastAt = 0;
  let gaps: number[] = [];

  return {
    /** One answer given; also records how long it took since the last one. */
    answer(wasCorrect: boolean) {
      const now = Date.now();
      if (lastAt > 0) gaps.push((now - lastAt) / 1000);
      lastAt = now;
      answers += 1;
      if (!wasCorrect) mistakes += 1;
    },
    hint() {
      hints += 1;
    },
    reset() {
      mistakes = 0;
      hints = 0;
      answers = 0;
      lastAt = 0;
      gaps = [];
    },
    read() {
      return { mistakes, hints, answers, gaps };
    },
  };
}

type Phase = 'intro' | 'playing' | 'result';

export function GameShell({
  game,
  children,
}: {
  game: Game;
  /** Receives the handle; remount happens automatically on "play again". */
  children: (handle: PlayHandle) => ReactNode;
}) {
  const { t } = useTranslation();
  const { recordSession, configFor, sessions } = useAppState();
  const { encourage } = useCompanion();
  const motionOk = useMotionOk();

  const [phase, setPhase] = useState<Phase>('intro');
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgressState] = useState({ current: 0, total: 0 });
  const [note, setNote] = useState('');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [resultLine, setResultLine] = useState<ResultSummary | null>(null);
  const [summary, setSummary] = useState({ seconds: 0, mistakes: 0, hints: 0 });

  // State rather than a ref: `complete` is handed to the game through `handle`,
  // which is created during render, and a ref must not be read from there.
  // The value is only ever written in `start`, so a render is always in flight
  // anyway when it changes.
  const [startedAt, setStartedAt] = useState(0);

  // Created once per shell and reset at the start of each run. See `createTally`
  // for why the run's counters sit outside React state.
  const [tally] = useState(createTally);

  // Memoised, and that matters: `config` is part of `handle`, and games watch
  // `handle` from effects. A fresh object every render would make those effects
  // re-run forever. `configFor` only changes when the data behind it changes.
  const config = useMemo(
    () => configFor(game.id) ?? fallbackConfig(game),
    [configFor, game],
  );

  const Icon = GAME_ICON[game.id];
  const tone = ACCENTS[game.accent];

  // What to say about the level, kindly, based on the last run of this activity.
  const levelNote = useMemo<TranslationKey | null>(() => {
    const last = sessions
      .filter((s) => s.gameId === game.id)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
    if (!last) return null;
    const order = ['easy', 'medium', 'hard'];
    const before = order.indexOf(last.difficulty);
    const now = order.indexOf(config.difficulty);
    if (now > before) return 'games.levelUp';
    if (now < before) return 'games.levelDown';
    return 'games.levelSame';
  }, [config.difficulty, game.id, sessions]);

  const feedback = useCallback(
    (wasCorrect: boolean, answer?: string) => {
      tally.answer(wasCorrect);

      if (wasCorrect) {
        setNote(t(pickRandom(PRAISE)));
        return;
      }
      // The gentlest correction we can give: name the answer, move on.
      setNote(answer ? t('feedback.niceTry', { answer }) : t('feedback.takeYourTime'));
    },
    [t, tally],
  );

  // Bails when nothing changed. Games call this from an effect on every render,
  // and a new object each time would be a re-render each time.
  const setProgress = useCallback((current: number, total: number) => {
    setProgressState((prev) =>
      prev.current === current && prev.total === total ? prev : { current, total },
    );
  }, []);

  const noteHint = useCallback(() => {
    tally.hint();
  }, [tally]);

  const complete = useCallback(
    (correct: number, total: number, line?: ResultSummary) => {
      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - (startedAt || Date.now())) / 1000),
      );
      const counters = tally.read();
      const answered = Math.max(counters.answers, 1);
      const averageResponseSeconds =
        counters.gaps.length > 0
          ? Math.round((counters.gaps.reduce((a, b) => a + b, 0) / counters.gaps.length) * 10) / 10
          : total > 0
            ? Math.round((durationSeconds / answered) * 10) / 10
            : null;

      setScore({ correct, total });
      setResultLine(line ?? null);
      setSummary({ seconds: durationSeconds, mistakes: counters.mistakes, hints: counters.hints });
      setPhase('result');
      setNote('');

      recordSession({
        gameId: game.id,
        difficulty: config.difficulty,
        correct,
        total,
        // Trust the activity's own count when it reports one; fall back to the
        // shell's tally for games that only report a final score.
        mistakes: counters.mistakes || Math.max(0, total - correct),
        hintsUsed: counters.hints,
        durationSeconds,
        averageResponseSeconds,
        // "Finish for now" reports 0 of 0 — recorded honestly as not completed.
        completed: total > 0,
      });
    },
    [config.difficulty, game.id, recordSession, startedAt, tally],
  );

  const handle = useMemo<PlayHandle>(
    () => ({ config, feedback, setProgress, noteHint, complete }),
    [complete, config, feedback, noteHint, setProgress],
  );

  const start = () => {
    setStartedAt(Date.now());
    setNote('');
    setScore({ correct: 0, total: 0 });
    setResultLine(null);
    setSummary({ seconds: 0, mistakes: 0, hints: 0 });
    setProgressState({ current: 0, total: 0 });
    // Reset in place: the same accumulator has already been handed to the game.
    tally.reset();
    setAttempt((n) => n + 1);
    setPhase('playing');
  };

  // A warm word once the activity is over, spoken if voice guidance is on.
  useEffect(() => {
    if (phase !== 'result') return;
    encourage(t('feedback.keepGoing'));
  }, [phase, encourage, t]);

  return (
    <div className="pb-4">
      {/* ---------------------------------------------------------- header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app/games"
          className="inline-flex min-h-[3rem] items-center gap-2 rounded-[var(--radius-control)] px-3 font-semibold text-sage-700 hover:bg-sage-50"
        >
          <ArrowLeft aria-hidden className="size-5" />
          {t('games.backToGames')}
        </Link>

        {phase === 'playing' && progress.total > 0 ? (
          <Badge tone="sage">
            {t('games.round', { current: progress.current, total: progress.total })}
          </Badge>
        ) : null}
      </div>

      {phase === 'intro' ? (
        <Card className="mx-auto max-w-2xl text-center">
          <span
            aria-hidden
            className={`mx-auto grid size-20 place-items-center rounded-[22px] ${tone.bubble}`}
          >
            <Icon className="size-10" strokeWidth={1.75} />
          </span>

          <h1 className="mt-4 font-display text-2xl font-semibold text-ink sm:text-3xl">
            {t(game.nameKey)}
          </h1>
          <p className="mx-auto mt-2 max-w-prose text-lg text-ink-soft">
            {t(game.descriptionKey)}
          </p>

          <div className="mt-5 rounded-[var(--radius-control)] bg-sage-50 p-4 text-left">
            <h2 className="text-base font-semibold text-sage-800">{t('games.howToPlay')}</h2>
            <p className="mt-1 text-lg text-ink">{t(game.howToKey)}</p>
          </div>

          {/* The level, and a kind word about why it is what it is. */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge tone={DIFFICULTY_TONE[config.difficulty]} icon={<Sparkles className="size-4" />}>
              {t('games.setForYou', { level: t(DIFFICULTY_LABEL[config.difficulty]) })}
            </Badge>
            <Badge tone="neutral" icon={<Clock className="size-4" />}>
              {t('common.minutes', { count: game.estimatedMinutes })}
            </Badge>
          </div>

          {levelNote ? (
            <p className="mt-3 text-lg font-semibold text-sage-800">{t(levelNote)}</p>
          ) : null}

          <p className="mt-4 text-base text-ink-muted">{t('games.subtitle')}</p>

          <Button
            size="xl"
            onClick={start}
            className="mt-5 w-full sm:w-auto"
            iconLeft={<Play aria-hidden className="size-5" />}
          >
            {t('games.start')}
          </Button>

          {/* Kept last and quiet: useful to a caregiver, ignorable by the patient. */}
          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-base font-semibold text-ink-soft">
              {t('games.whyThisLevel')}
            </summary>
            <p className="mt-2 text-base text-ink-soft">{t('games.setForYouWhy')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink-soft">
              {config.rationale.map((reason) => (
                <li key={reason}>{t(REASON_LABEL[reason])}</li>
              ))}
            </ul>
          </details>
        </Card>
      ) : null}

      {phase === 'playing' ? (
        <div>
          {/* live encouragement, announced but never blocking */}
          <p
            aria-live="polite"
            className={
              note
                ? 'mb-4 rounded-[var(--radius-control)] border border-sage-200 bg-sage-50 p-3.5 text-center text-lg font-semibold text-sage-800'
                : 'sr-only'
            }
          >
            {note}
          </p>

          <div key={attempt}>{children(handle)}</div>

          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => complete(0, 0)}
              className="text-ink-soft"
            >
              {t('games.exit')}
            </Button>
          </div>
        </div>
      ) : null}

      {phase === 'result' ? (
        <motion.div
          initial={motionOk ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card tone="sage" className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center">
              <CompanionCharacter state="encouraging" size={132} />
            </div>

            <h1 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
              {t('games.result.title')}
            </h1>

            {score.total > 0 ? (
              <>
                <p className="mt-2 text-xl text-ink-soft">
                  {resultLine
                    ? t(resultLine.key, resultLine.values)
                    : t('games.result.summary', { correct: score.correct, total: score.total })}
                </p>
                <div className="mx-auto mt-5 max-w-sm">
                  <ProgressBar
                    value={score.correct}
                    max={score.total}
                    label={t('games.answered')}
                    valueText={`${score.correct} / ${score.total}`}
                  />
                </div>

                <dl className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-3 text-left">
                  <div className="rounded-[var(--radius-control)] bg-white/70 p-3 text-center">
                    <dt className="text-sm text-ink-soft">{t('games.timeTaken')}</dt>
                    <dd className="text-lg font-semibold text-ink">
                      {Math.floor(summary.seconds / 60)}m {summary.seconds % 60}s
                    </dd>
                  </div>
                  <div className="rounded-[var(--radius-control)] bg-white/70 p-3 text-center">
                    <dt className="text-sm text-ink-soft">{t('games.mistakesMade')}</dt>
                    <dd className="text-lg font-semibold text-ink">{summary.mistakes}</dd>
                  </div>
                  <div className="rounded-[var(--radius-control)] bg-white/70 p-3 text-center">
                    <dt className="text-sm text-ink-soft">{t('games.hintsTaken')}</dt>
                    <dd className="text-lg font-semibold text-ink">{summary.hints}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-2 text-xl text-ink-soft">{t('feedback.takeYourTime')}</p>
            )}

            <p className="mx-auto mt-4 flex max-w-prose items-center justify-center gap-2 text-lg font-semibold text-sage-800">
              <PartyPopper aria-hidden className="size-5" />
              {t('games.result.encourage')}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="xl"
                onClick={start}
                iconLeft={<RefreshCw aria-hidden className="size-5" />}
              >
                {t('games.playAgain')}
              </Button>
              <ButtonLink href="/app/games" variant="secondary" size="xl">
                {t('games.backToGames')}
              </ButtonLink>
            </div>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}

/**
 * The hint button every activity shares.
 *
 * Kept here so a hint looks and behaves the same everywhere, and so the count is
 * always reported to the engine rather than silently used up.
 */
export function HintButton({
  handle,
  used,
  onHint,
}: {
  handle: PlayHandle;
  used: number;
  onHint: () => void;
}) {
  const { t } = useTranslation();
  const left = handle.config.hintsAllowed - used;
  if (handle.config.hintsAllowed === 0) return null;

  return (
    <Button
      variant="secondary"
      size="lg"
      disabled={left <= 0}
      onClick={() => {
        handle.noteHint();
        onHint();
      }}
      iconLeft={<Lightbulb aria-hidden className="size-5" />}
    >
      {left > 0 ? `${t('games.hint')} · ${t('games.hintsLeft', { count: left })}` : t('games.hintsNone')}
    </Button>
  );
}

import { GAMES, GAMES_BY_ID } from '@/lib/data/games';
import {
  COGNITIVE_DOMAINS,
  DIFFICULTY_ORDER,
  type AbilityProfile,
  type AdaptationReason,
  type AiInsight,
  type CognitiveDomain,
  type CognitiveLoad,
  type CognitiveStage,
  type DifficultyLevel,
  type DomainAbility,
  type GameConfig,
  type GameId,
  type GameSession,
  type GameStats,
  type PatientProfile,
  type PerformanceTrend,
} from '@/lib/types';

/**
 * The adaptive engine. One place, not a copy inside every game.
 *
 *     patient details + preferences
 *     + every activity session (accuracy, mistakes, pace, hints, how often)
 *              │
 *              ▼
 *        this module
 *              │
 *              ├── abilityProfile()  → what each domain should be set to
 *              ├── configureGame()   → the knobs one activity runs with
 *              ├── gameStats()       → the caregiver's per-activity rollup
 *              └── buildInsights()   → plain-language "here is what I noticed,
 *                                      and here is why I changed something"
 *
 * Two rules shape everything below.
 *
 * First, it never tells anyone they failed. A poor run lowers the level and the
 * person is offered an easier one warmly; the words live in the locale files as
 * `games.levelDown` ("Let's try an easier level.").
 *
 * Second, it does not diagnose. The caregiver's recorded cognitive stage is an
 * *input* it respects as a ceiling — the engine never writes it, never revises it
 * and never infers it. What it produces are statements about how activities went
 * inside the app, which is a different kind of claim from a clinical one.
 */

/** Sessions considered when deciding the next level. */
const RECENT_WINDOW = 5;
/** Sessions considered when calling a trend. */
const TREND_WINDOW = 8;
/** Accuracy at or above this, with hints unused, earns a harder level. */
const STEP_UP_ACCURACY = 0.85;
/** Below this, the level comes down. */
const STEP_DOWN_ACCURACY = 0.6;
/** Accuracy change that counts as a real move rather than noise. */
const TREND_DELTA = 0.08;
/** Sessions needed before a trend is claimed at all. */
const MIN_TREND_SESSIONS = 4;
/** People with photos needed before Faces & Names can run. */
export const MIN_RECOGNITION_PEOPLE = 3;

// ------------------------------------------------------------------ helpers

function indexOfLevel(level: DifficultyLevel): number {
  return Math.max(0, DIFFICULTY_ORDER.indexOf(level));
}

function levelAt(index: number): DifficultyLevel {
  return DIFFICULTY_ORDER[Math.min(DIFFICULTY_ORDER.length - 1, Math.max(0, index))];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function newestFirst(sessions: GameSession[]): GameSession[] {
  return [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

/**
 * The runs that are allowed to say anything about ability.
 *
 * A run that was stopped part-way carries no score — it is recorded as 0 of 0,
 * because nothing was asked and nothing was answered. Averaging that in would
 * mean someone who opened a puzzle, found it tiring and put the tablet down had
 * their difficulty lowered and a decline reported to their caregiver, purely for
 * having stopped. Abandonment is a fact about the day, not about the person's
 * memory, so it is counted as engagement (`attempts`) and excluded from every
 * accuracy, trend and level decision.
 */
function scored(sessions: GameSession[]): GameSession[] {
  return sessions.filter((s) => s.state === 'completed');
}

/**
 * The hardest level the caregiver's recorded stage allows.
 *
 * This is a comfort ceiling, not an assessment: someone recorded at an advanced
 * stage is never handed a hard puzzle just because one good run happened.
 */
function ceilingForStage(stage: CognitiveStage): DifficultyLevel {
  switch (stage) {
    case 'advanced':
      return 'easy';
    case 'moderate':
      return 'medium';
    default:
      return 'hard';
  }
}

function daysBetween(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - then) / 86_400_000);
}

// ------------------------------------------------------------------- input

/**
 * Everything the engine is allowed to look at.
 *
 * Passing it in — rather than reaching into storage — is what keeps the engine
 * pure and testable, and makes it impossible for one patient's sessions to leak
 * into another's profile: the caller decides whose data this is.
 */
export interface EngineInput {
  patient: PatientProfile;
  /** This patient's sessions only. */
  sessions: GameSession[];
  /** People with a photo who are switched on for the recognition activity. */
  recognitionPeople: number;
  /** Injectable for tests and for stable server rendering. */
  now?: Date;
}

// ------------------------------------------------------------ domain ability

function domainSessions(sessions: GameSession[], domain: CognitiveDomain): GameSession[] {
  return scored(sessions).filter((s) => GAMES_BY_ID[s.gameId]?.category === domain);
}

/** Accuracy in the older half vs the newer half of a window. */
function splitAccuracy(sessions: GameSession[]): { before: number; after: number } | null {
  if (sessions.length < MIN_TREND_SESSIONS) return null;
  const window = newestFirst(sessions).slice(0, TREND_WINDOW).reverse();
  const half = Math.floor(window.length / 2);
  return {
    before: mean(window.slice(0, half).map((s) => s.accuracy)),
    after: mean(window.slice(half).map((s) => s.accuracy)),
  };
}

function trendOf(sessions: GameSession[]): PerformanceTrend {
  const split = splitAccuracy(sessions);
  if (!split) return 'not-enough-data';
  const delta = split.after - split.before;
  if (delta >= TREND_DELTA) return 'improving';
  if (delta <= -TREND_DELTA) return 'declining';
  return 'steady';
}

/**
 * Decides one domain's level from its recent sessions.
 *
 * The starting point is the level those sessions were actually played at, so the
 * engine moves one step at a time and never jumps a person from easy to hard.
 */
function abilityFor(
  domain: CognitiveDomain,
  sessions: GameSession[],
  ceiling: DifficultyLevel,
): DomainAbility {
  const all = domainSessions(sessions, domain);
  const recent = newestFirst(all).slice(0, RECENT_WINDOW);

  if (recent.length === 0) {
    // Nothing to go on: start at the gentlest setting the catalogue offers here.
    const base = GAMES.filter((g) => g.category === domain).map((g) => g.baseDifficulty);
    const start = levelAt(
      Math.min(
        indexOfLevel(ceiling),
        base.length === 0 ? 0 : Math.min(...base.map(indexOfLevel)),
      ),
    );
    return {
      domain,
      level: start,
      suggestedLevel: start,
      trend: 'not-enough-data',
      confidence: 0,
      sessions: 0,
      accuracy: 0,
    };
  }

  const accuracy = mean(recent.map((s) => s.accuracy));
  const hints = mean(recent.map((s) => s.hintsUsed));
  // Highest level actually played recently — where the person currently is.
  const level = levelAt(
    Math.min(indexOfLevel(ceiling), Math.max(...recent.map((s) => indexOfLevel(s.difficulty)))),
  );

  let suggested = indexOfLevel(level);
  if (accuracy >= STEP_UP_ACCURACY && hints <= 0.5 && recent.length >= 3) suggested += 1;
  else if (accuracy < STEP_DOWN_ACCURACY || hints >= 2) suggested -= 1;

  return {
    domain,
    level,
    suggestedLevel: levelAt(Math.min(indexOfLevel(ceiling), suggested)),
    trend: trendOf(all),
    confidence: Math.min(1, recent.length / RECENT_WINDOW),
    sessions: all.length,
    accuracy,
  };
}

/** Overall load: are the activities currently asking a lot, or a little? */
function loadFor(domains: DomainAbility[], sessions: GameSession[]): CognitiveLoad {
  const played = domains.filter((d) => d.sessions > 0);
  if (played.length === 0) return 'light';
  const levelMean = mean(played.map((d) => indexOfLevel(d.level)));
  const recentHints = mean(newestFirst(scored(sessions)).slice(0, 6).map((s) => s.hintsUsed));
  if (levelMean >= 1.5 || recentHints >= 2) return 'heavy';
  if (levelMean >= 0.6) return 'moderate';
  return 'light';
}

export function abilityProfile(input: EngineInput): AbilityProfile {
  const now = input.now ?? new Date();
  const ceiling = ceilingForStage(input.patient.cognitive.stage);
  const domains = COGNITIVE_DOMAINS.map((domain) => abilityFor(domain, input.sessions, ceiling));
  return {
    patientId: input.patient.id,
    generatedAt: now.toISOString(),
    domains,
    load: loadFor(domains, input.sessions),
    // Finished runs only — this number is what the estimates rest on, and it
    // would overstate the evidence if it counted runs nobody completed.
    sessions: scored(input.sessions).length,
  };
}

// ---------------------------------------------------------- game configuration

/** Per-activity shape of a level. Games read only the knobs they understand. */
const SHAPE: Record<DifficultyLevel, { rounds: number; choices: number; pairs: number }> = {
  easy: { rounds: 4, choices: 2, pairs: 4 },
  medium: { rounds: 6, choices: 3, pairs: 6 },
  hard: { rounds: 8, choices: 4, pairs: 8 },
};

const SIMILARITY: Record<DifficultyLevel, GameConfig['distractorSimilarity']> = {
  easy: 'low',
  medium: 'medium',
  hard: 'high',
};

/**
 * Turns the ability profile into the settings one activity actually runs with.
 *
 * `rationale` is a list of keys, not a sentence, so the "why" shown next to the
 * activity is translated like everything else.
 */
export function configureGame(gameId: GameId, input: EngineInput): GameConfig {
  const game = GAMES_BY_ID[gameId];
  const profile = abilityProfile(input);
  const ability =
    profile.domains.find((d) => d.domain === game.category) ?? profile.domains[0];

  const attempts = newestFirst(input.sessions.filter((s) => s.gameId === gameId));
  const mine = scored(attempts);
  const recent = mine.slice(0, RECENT_WINDOW);
  const rationale: AdaptationReason[] = [];

  let level = ability.suggestedLevel;

  if (recent.length === 0) {
    level = levelAt(
      Math.min(
        indexOfLevel(ceilingForStage(input.patient.cognitive.stage)),
        indexOfLevel(game.baseDifficulty),
      ),
    );
    rationale.push('first-time');
  } else {
    const accuracy = mean(recent.map((s) => s.accuracy));
    const hints = mean(recent.map((s) => s.hintsUsed));
    const pace = recent
      .map((s) => s.averageResponseSeconds)
      .filter((v): v is number => v !== null);

    if (accuracy >= STEP_UP_ACCURACY) rationale.push('high-accuracy');
    else if (accuracy < STEP_DOWN_ACCURACY) rationale.push('low-accuracy');
    else rationale.push('holding-steady');

    if (hints >= 2) rationale.push('many-hints');
    else if (hints === 0) rationale.push('no-hints-needed');

    // Pace only ever explains the choice; it never overrides accuracy.
    if (pace.length >= 4) {
      const older = mean(pace.slice(Math.ceil(pace.length / 2)));
      const newer = mean(pace.slice(0, Math.floor(pace.length / 2)));
      if (newer <= older * 0.8) rationale.push('quick-answers');
      else if (newer >= older * 1.25) rationale.push('slower-answers');
    }

    // Measured from any visit, finished or not: someone who opened the activity
    // yesterday and stopped has not been away, and does not need easing back in.
    const gap = daysBetween(attempts[0].completedAt, input.now ?? new Date());
    if (gap >= 7) {
      // Back after a while: start one step below where they left off.
      level = levelAt(indexOfLevel(level) - 1);
      rationale.push('returning-after-break');
    }
  }

  if (input.patient.cognitive.stage !== 'not-recorded') rationale.push('caregiver-stage');

  const shape = { ...SHAPE[level] };

  // Faces & Names can only ask about people who have actually been added, and it
  // cannot offer more choices than there are people to choose between.
  if (game.needsFamilyData) {
    if (input.recognitionPeople < MIN_RECOGNITION_PEOPLE) rationale.push('few-people-added');
    shape.choices = Math.max(2, Math.min(shape.choices, input.recognitionPeople - 1 || 2));
    shape.rounds = Math.max(2, Math.min(shape.rounds, input.recognitionPeople * 2));
  }

  // Sudoku counts blanks, not rounds — more blanks is the harder puzzle.
  if (gameId === 'sudoku') {
    shape.rounds = level === 'easy' ? 4 : level === 'medium' ? 10 : 22;
  }

  return {
    gameId,
    difficulty: level,
    rounds: shape.rounds,
    choices: shape.choices,
    pairs: shape.pairs,
    distractorSimilarity: SIMILARITY[level],
    // Someone leaning on hints keeps them; someone flying gets one, quietly.
    hintsAllowed: rationale.includes('many-hints') ? 3 : level === 'hard' ? 1 : 2,
    // No timers. They frighten people, and a slow answer is not a wrong answer.
    timeLimitSeconds: null,
    rationale,
  };
}

// ------------------------------------------------------------- per-game stats

export function gameStats(gameId: GameId, sessions: GameSession[]): GameStats {
  const attempts = newestFirst(sessions.filter((s) => s.gameId === gameId));
  // Every figure below describes finished runs. `abandoned` is reported beside
  // them so a caregiver can see "played six times, stopped early twice" rather
  // than two silent zeroes dragging the average down.
  const mine = scored(attempts);
  const abandoned = attempts.filter((s) => s.state === 'abandoned').length;

  if (mine.length === 0) {
    return {
      gameId,
      sessions: 0,
      abandoned,
      accuracy: 0,
      bestAccuracy: 0,
      averageDurationSeconds: 0,
      averageResponseSeconds: null,
      totalMistakes: 0,
      totalHints: 0,
      currentDifficulty: GAMES_BY_ID[gameId].baseDifficulty,
      trend: 'not-enough-data',
      lastPlayedAt: attempts[0]?.completedAt,
    };
  }

  const paces = mine.map((s) => s.averageResponseSeconds).filter((v): v is number => v !== null);

  return {
    gameId,
    sessions: mine.length,
    abandoned,
    accuracy: mean(mine.map((s) => s.accuracy)),
    bestAccuracy: Math.max(...mine.map((s) => s.accuracy)),
    averageDurationSeconds: Math.round(mean(mine.map((s) => s.durationSeconds))),
    averageResponseSeconds: paces.length === 0 ? null : Math.round(mean(paces) * 10) / 10,
    totalMistakes: mine.reduce((sum, s) => sum + s.mistakes, 0),
    totalHints: mine.reduce((sum, s) => sum + s.hintsUsed, 0),
    currentDifficulty: mine[0].difficulty,
    trend: trendOf(mine),
    // Any visit counts as having played, so "last played" matches what the
    // person would remember doing.
    lastPlayedAt: attempts[0].completedAt,
  };
}

export function allGameStats(sessions: GameSession[]): GameStats[] {
  return GAMES.map((game) => gameStats(game.id, sessions));
}

// ----------------------------------------------------------------- insights

const PERIOD_DAYS = 14;

function pct(value: number): number {
  return Math.round(value * 100);
}

/**
 * The caregiver-facing "what I noticed, and why".
 *
 * Every insight is keys plus numbers — no finished sentences — so it reads
 * naturally in all fifteen languages, and the numbers behind it are always shown
 * alongside it rather than hidden. Note the wording of the declining case: the
 * locale calls it "Activity change detected in {domain}", which is what the data
 * supports, rather than anything about a condition getting worse.
 */
export function buildInsights(input: EngineInput): AiInsight[] {
  const now = input.now ?? new Date();
  const stamp = now.toISOString();
  const name = input.patient.name.split(' ')[0];
  const profile = abilityProfile(input);
  const insights: AiInsight[] = [];

  const push = (
    id: string,
    key: string,
    params: Record<string, string | number>,
    severity: AiInsight['severity'],
    periodDays = PERIOD_DAYS,
  ) => {
    insights.push({
      id: `ins_${input.patient.id}_${id}`,
      patientId: input.patient.id,
      titleKey: `${key}.title` as AiInsight['titleKey'],
      bodyKey: `${key}.body` as AiInsight['bodyKey'],
      evidenceKey: `${key}.evidence` as AiInsight['evidenceKey'],
      recommendationKey: `${key}.rec` as AiInsight['recommendationKey'],
      params: { name, ...params },
      periodDays,
      severity,
      createdAt: stamp,
    });
  };

  // ---- per-domain movement, worst news first so it is not buried
  const ranked = [...profile.domains]
    .filter((d) => d.sessions >= MIN_TREND_SESSIONS)
    .sort((a, b) => Number(b.trend === 'declining') - Number(a.trend === 'declining'));

  for (const domain of ranked) {
    const split = splitAccuracy(domainSessions(input.sessions, domain.domain));
    if (!split) continue;
    const params = {
      domain: `{{domain.${domain.domain}}}`,
      before: pct(split.before),
      after: pct(split.after),
      sessions: Math.min(domain.sessions, TREND_WINDOW),
      days: PERIOD_DAYS,
      level: `{{games.difficulty.${domain.suggestedLevel}}}`,
    };
    if (domain.trend === 'declining') push(`decline_${domain.domain}`, 'insight.declining', params, 'attention');
    else if (domain.trend === 'improving') push(`improve_${domain.domain}`, 'insight.improving', params, 'info');
    else push(`steady_${domain.domain}`, 'insight.steady', params, 'info');
  }

  // ---- per-game signals the domain view would hide
  for (const game of GAMES) {
    const attempts = newestFirst(input.sessions.filter((s) => s.gameId === game.id));
    const mine = scored(attempts);
    const gameLabel = `{{game.${game.id}.name}}`;

    // Stopping part-way is worth telling a caregiver about — but as engagement,
    // not as a score. It usually means the activity is too long or too hard right
    // now, which is something they can act on, and it is deliberately phrased as
    // an observation about the activity rather than about the person.
    //
    // A third of visits, and at least three of them: one abandoned run is an
    // interrupted afternoon, not a pattern, and saying so would train a caregiver
    // to ignore this screen.
    const stopped = attempts.filter((s) => s.state === 'abandoned').length;
    if (stopped >= 3 && stopped * 3 >= attempts.length) {
      push(
        `stopping_${game.id}`,
        'insight.stopping',
        { game: gameLabel, after: stopped, sessions: attempts.length },
        'info',
      );
    }

    if (mine.length < MIN_TREND_SESSIONS) continue;

    const paces = mine.slice(0, TREND_WINDOW).map((s) => s.averageResponseSeconds);
    const known = paces.filter((v): v is number => v !== null);
    if (known.length >= MIN_TREND_SESSIONS) {
      const newer = mean(known.slice(0, Math.floor(known.length / 2)));
      const older = mean(known.slice(Math.ceil(known.length / 2)));
      if (older > 0 && newer >= older * 1.3) {
        push(
          `slower_${game.id}`,
          'insight.slower',
          {
            game: gameLabel,
            before: Math.round(older * 10) / 10,
            after: Math.round(newer * 10) / 10,
            sessions: known.length,
          },
          'attention',
        );
      }
    }

    const recentHints = mine.slice(0, RECENT_WINDOW).reduce((sum, s) => sum + s.hintsUsed, 0);
    if (recentHints >= 5) {
      push(
        `hints_${game.id}`,
        'insight.hints',
        { game: gameLabel, after: recentHints, sessions: Math.min(mine.length, RECENT_WINDOW) },
        'info',
      );
    }
  }

  // ---- how often they are playing at all
  const recentCount = input.sessions.filter(
    (s) => daysBetween(s.completedAt, now) < 7,
  ).length;
  const priorCount = input.sessions.filter((s) => {
    const age = daysBetween(s.completedAt, now);
    return age >= 7 && age < 14;
  }).length;
  if (priorCount >= 3 && recentCount < priorCount * 0.7) {
    push('quiet', 'insight.quiet', { after: recentCount, before: priorCount, days: 7 }, 'attention', 7);
  }

  // ---- what they choose to play, which is worth knowing on its own
  const counts = new Map<GameId, number>();
  for (const session of input.sessions) {
    if (daysBetween(session.completedAt, now) >= PERIOD_DAYS) continue;
    counts.set(session.gameId, (counts.get(session.gameId) ?? 0) + 1);
  }
  const favourite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (favourite && favourite[1] >= 3) {
    push(
      'favourite',
      'insight.favourite',
      { game: `{{game.${favourite[0]}.name}}`, after: favourite[1], days: PERIOD_DAYS },
      'info',
    );
  }

  // ---- a setup gap the caregiver can actually fix
  if (input.recognitionPeople < MIN_RECOGNITION_PEOPLE) {
    push('needsPeople', 'insight.needsPeople', { after: input.recognitionPeople }, 'attention');
  }

  return insights;
}

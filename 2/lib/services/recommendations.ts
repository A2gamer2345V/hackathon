import type {
  AbilityProfile,
  DifficultyLevel,
  GameId,
  GameSession,
  Recommendation,
  RecommendationReason,
} from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n/locales/en';
import { GAMES, GAMES_BY_ID } from '@/lib/data/games';
import { MIN_RECOGNITION_PEOPLE } from '@/lib/ai/engine';

/**
 * Which activity to offer next.
 *
 * This ranks *activities to try*, from in-app history only. It is not a
 * cognitive assessment and produces no clinical output — the reason codes it
 * emits are deliberately about preference and variety, not about ability.
 *
 * How hard the activity will be is not decided here: the level comes from the
 * adaptive engine's ability profile, so what the card promises is what the game
 * actually does.
 */

interface Signals {
  playCounts: Record<string, number>;
  lastPlayed: Record<string, number>;
  accuracy: Record<string, { correct: number; total: number }>;
}

function collectSignals(sessions: GameSession[]): Signals {
  const playCounts: Record<string, number> = {};
  const lastPlayed: Record<string, number> = {};
  const accuracy: Record<string, { correct: number; total: number }> = {};

  for (const session of sessions) {
    playCounts[session.gameId] = (playCounts[session.gameId] ?? 0) + 1;
    const at = new Date(session.completedAt).getTime();
    if (!Number.isNaN(at)) {
      lastPlayed[session.gameId] = Math.max(lastPlayed[session.gameId] ?? 0, at);
    }
    const acc = accuracy[session.gameId] ?? { correct: 0, total: 0 };
    acc.correct += session.correct;
    acc.total += session.total;
    accuracy[session.gameId] = acc;
  }
  return { playCounts, lastPlayed, accuracy };
}

const DAY_MS = 86_400_000;

function scoreGame(
  gameId: GameId,
  signals: Signals,
  preferred: GameId[],
  now: number,
): { score: number; reason: RecommendationReason } {
  const plays = signals.playCounts[gameId] ?? 0;
  const last = signals.lastPlayed[gameId];
  const daysSince = last ? (now - last) / DAY_MS : Infinity;
  const acc = signals.accuracy[gameId];
  const ratio = acc && acc.total > 0 ? acc.correct / acc.total : null;

  let score = 0.4;
  let reason: RecommendationReason = 'variety';

  // Something they have chosen before, but not in the last day or two.
  if (preferred.includes(gameId)) {
    score += 0.22;
    reason = 'recent-favourite';
  }

  // Space activities out: a game untouched for a few days is a good pick.
  if (daysSince === Infinity) {
    score += 0.2;
    reason = plays === 0 ? 'not-tried-recently' : reason;
  } else if (daysSince >= 3) {
    score += 0.18;
    reason = 'not-tried-recently';
  } else if (daysSince < 1) {
    score -= 0.3;
  }

  // Where they do well, offer more of it — framed as building on a strength,
  // never as a deficit to remediate.
  if (ratio !== null && ratio >= 0.8) {
    score += 0.12;
    if (reason === 'variety') reason = 'builds-on-strength';
  }

  // After a quiet stretch, prefer the gentlest options.
  const totalPlays = Object.values(signals.playCounts).reduce((a, b) => a + b, 0);
  if (totalPlays < 3 && GAMES_BY_ID[gameId].baseDifficulty === 'easy') {
    score += 0.15;
    reason = 'gentle-restart';
  }

  return { score: Math.max(0, Math.min(1, score)), reason };
}

export interface RecommendationInput {
  /** This patient's sessions only. */
  sessions: GameSession[];
  preferred?: GameId[];
  /** From the adaptive engine, so the level shown is the level that will run. */
  ability?: AbilityProfile | null;
  /** People available to the recognition activity; below the minimum it is hidden. */
  recognitionPeople?: number;
  limit?: number;
  now?: number;
}

function levelFor(gameId: GameId, ability: AbilityProfile | null | undefined): DifficultyLevel {
  const game = GAMES_BY_ID[gameId];
  if (!ability) return game.baseDifficulty;
  const domain = ability.domains.find((d) => d.domain === game.category);
  return domain?.suggestedLevel ?? game.baseDifficulty;
}

export const recommendationService = {
  /** Ranked recommendations, best first. */
  forPatient(input: RecommendationInput): Recommendation[] {
    const { sessions, preferred = [], ability = null, recognitionPeople = 0, limit = 4 } = input;
    const signals = collectSignals(sessions);
    const now = input.now ?? Date.now();

    return GAMES
      // Never recommend an activity that cannot run: Faces & Names needs people.
      .filter((game) => !game.needsFamilyData || recognitionPeople >= MIN_RECOGNITION_PEOPLE)
      .map((game) => {
        const { score, reason } = scoreGame(game.id, signals, preferred, now);
        return {
          id: `rec_${game.id}`,
          gameId: game.id,
          reason,
          difficulty: levelFor(game.id, ability),
          estimatedMinutes: game.estimatedMinutes,
          score,
        } satisfies Recommendation;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },

  /** The single headline recommendation, with a stable tiebreak. */
  top(input: RecommendationInput): Recommendation | null {
    return recommendationService.forPatient({ ...input, limit: 1 })[0] ?? null;
  },
};

/**
 * Reason codes mapped to translation keys. The service never returns
 * pre-translated prose, so a recommendation reads in the patient's own
 * language and stays in step when the language is changed.
 */
export const REASON_KEY: Record<RecommendationReason, TranslationKey> = {
  'recent-favourite': 'planner.reason.recent-favourite',
  'not-tried-recently': 'planner.reason.not-tried-recently',
  'builds-on-strength': 'planner.reason.builds-on-strength',
  'gentle-restart': 'planner.reason.gentle-restart',
  variety: 'planner.reason.variety',
};

import type { Game, GameId } from '@/lib/types';

/**
 * The game catalogue. Names/instructions are translation keys so that switching
 * language re-labels every game without touching this file.
 *
 * `baseDifficulty` is only the starting point for someone with no history. From
 * the second session on, the adaptive engine decides the level — see
 * `lib/ai/engine.ts`.
 */
export const GAMES: Game[] = [
  {
    id: 'memory-match',
    category: 'memory',
    nameKey: 'game.memory-match.name',
    descriptionKey: 'game.memory-match.desc',
    howToKey: 'game.memory-match.how',
    baseDifficulty: 'easy',
    estimatedMinutes: 5,
    accent: 'sage',
  },
  {
    id: 'face-names',
    category: 'recognition',
    nameKey: 'game.face-names.name',
    descriptionKey: 'game.face-names.desc',
    howToKey: 'game.face-names.how',
    baseDifficulty: 'easy',
    estimatedMinutes: 4,
    accent: 'rose',
    needsFamilyData: true,
  },
  {
    id: 'sudoku',
    category: 'problem-solving',
    nameKey: 'game.sudoku.name',
    descriptionKey: 'game.sudoku.desc',
    howToKey: 'game.sudoku.how',
    baseDifficulty: 'easy',
    estimatedMinutes: 8,
    accent: 'lilac',
  },
  {
    id: 'picture-recall',
    category: 'memory',
    nameKey: 'game.picture-recall.name',
    descriptionKey: 'game.picture-recall.desc',
    howToKey: 'game.picture-recall.how',
    baseDifficulty: 'easy',
    estimatedMinutes: 4,
    accent: 'clay',
  },
  {
    id: 'word-recall',
    category: 'memory',
    nameKey: 'game.word-recall.name',
    descriptionKey: 'game.word-recall.desc',
    howToKey: 'game.word-recall.how',
    baseDifficulty: 'medium',
    estimatedMinutes: 4,
    accent: 'sky',
  },
  {
    id: 'number-tap',
    category: 'attention',
    nameKey: 'game.number-tap.name',
    descriptionKey: 'game.number-tap.desc',
    howToKey: 'game.number-tap.how',
    baseDifficulty: 'easy',
    estimatedMinutes: 3,
    accent: 'sun',
  },
  {
    id: 'sequence',
    category: 'attention',
    nameKey: 'game.sequence.name',
    descriptionKey: 'game.sequence.desc',
    howToKey: 'game.sequence.how',
    baseDifficulty: 'medium',
    estimatedMinutes: 4,
    accent: 'sky',
  },
];

export const GAMES_BY_ID: Record<GameId, Game> = GAMES.reduce(
  (acc, game) => {
    acc[game.id] = game;
    return acc;
  },
  {} as Record<GameId, Game>,
);

export function gamesInCategory(category: Game['category']): Game[] {
  return GAMES.filter((g) => g.category === category);
}

export function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && value in GAMES_BY_ID;
}

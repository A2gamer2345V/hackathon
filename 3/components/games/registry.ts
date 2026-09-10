'use client';

import type { ComponentType } from 'react';
import { MemoryMatch } from '@/components/games/memory-match';
import { FaceNames } from '@/components/games/face-names';
import { Sudoku } from '@/components/games/sudoku';
import { PictureRecall } from '@/components/games/picture-recall';
import { WordRecall } from '@/components/games/word-recall';
import { NumberTap } from '@/components/games/number-tap';
import { Sequence } from '@/components/games/sequence';
import type { PlayHandle } from '@/components/games/game-shell';
import type { GameId } from '@/lib/types';

/**
 * Which component plays which activity. Adding a game means adding it to the
 * catalogue in `lib/data/games.ts` and to this map — nothing else changes.
 *
 * Every play component receives the same `handle`, which also carries the
 * adaptive `config` the AI engine chose for this session.
 */
export const GAME_PLAY: Record<GameId, ComponentType<{ handle: PlayHandle }>> = {
  'memory-match': MemoryMatch,
  'face-names': FaceNames,
  sudoku: Sudoku,
  'picture-recall': PictureRecall,
  'word-recall': WordRecall,
  'number-tap': NumberTap,
  sequence: Sequence,
};

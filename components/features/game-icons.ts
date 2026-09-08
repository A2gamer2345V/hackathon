import {
  Grid3x3,
  Hash,
  Images,
  LayoutGrid,
  Target,
  Type,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { GameId } from '@/lib/types';

/** One recognisable icon per activity, used on cards and inside the game. */
export const GAME_ICON: Record<GameId, LucideIcon> = {
  'memory-match': LayoutGrid,
  'face-names': UsersRound,
  sudoku: Grid3x3,
  'picture-recall': Images,
  'word-recall': Type,
  'number-tap': Hash,
  sequence: Target,
};

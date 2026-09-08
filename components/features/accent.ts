import type { Game } from '@/lib/types';

/**
 * Category accents.
 *
 * Colour is decoration only — every surface that uses an accent also carries a
 * label or an icon, so nothing is communicated by hue alone.
 */
export type Accent = Game['accent'];

interface AccentClasses {
  /** Tinted tile background + border. */
  surface: string;
  /** Icon bubble. */
  bubble: string;
  /** Border shown on hover/focus for interactive tiles. */
  hover: string;
  /** Text colour for small accented labels. */
  text: string;
}

export const ACCENTS: Record<Accent, AccentClasses> = {
  sage: {
    surface: 'bg-sage-50 border-sage-200',
    bubble: 'bg-sage-100 text-sage-700',
    hover: 'hover:border-sage-400 hover:bg-sage-100/70',
    text: 'text-sage-800',
  },
  clay: {
    surface: 'bg-clay-100 border-clay-300/70',
    bubble: 'bg-white/70 text-clay-600',
    hover: 'hover:border-clay-500 hover:bg-clay-100',
    text: 'text-clay-600',
  },
  sky: {
    surface: 'bg-sky-100 border-sky-300/70',
    bubble: 'bg-white/70 text-sky-600',
    hover: 'hover:border-sky-500 hover:bg-sky-100',
    text: 'text-sky-600',
  },
  sun: {
    surface: 'bg-sun-100 border-sun-300/70',
    bubble: 'bg-white/70 text-sun-600',
    hover: 'hover:border-sun-500 hover:bg-sun-100',
    text: 'text-sun-600',
  },
  lilac: {
    surface: 'bg-lilac-50 border-lilac-200',
    bubble: 'bg-lilac-100 text-lilac-600',
    hover: 'hover:border-lilac-400 hover:bg-lilac-100/70',
    text: 'text-lilac-600',
  },
  rose: {
    surface: 'bg-rose-100 border-rose-300/70',
    bubble: 'bg-white/70 text-rose-600',
    hover: 'hover:border-rose-500 hover:bg-rose-100',
    text: 'text-rose-600',
  },
};

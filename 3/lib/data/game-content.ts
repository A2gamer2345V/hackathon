import type { TranslationKey } from '@/lib/i18n/locales/en';
import type { InterestTag } from '@/lib/types';

/**
 * The words and pictures the activities are built from.
 *
 * Only identifiers, translation keys and interest tags live here — no React and
 * no copy. That keeps the content translatable in all fifteen languages and
 * keeps mock data out of the components that render it.
 *
 * The `tags` are what make theming real: when a caregiver records that someone
 * follows cricket or loves flowers, the adaptive engine biases an activity's
 * content towards items carrying those tags instead of picking at random. An
 * untagged item is always eligible, so a person with no recorded interests still
 * gets a full, varied set.
 */

// ------------------------------------------------------------------ pictures

export type PictureId =
  | 'apple'
  | 'flower'
  | 'sun'
  | 'house'
  | 'car'
  | 'cat'
  | 'bird'
  | 'fish'
  | 'tree'
  | 'umbrella'
  | 'key'
  | 'book'
  | 'clock'
  | 'cup'
  | 'dog'
  | 'guitar'
  | 'radio'
  | 'film'
  | 'ball'
  | 'trophy'
  | 'bicycle'
  | 'train'
  | 'temple'
  | 'mountain'
  | 'boat'
  | 'palette'
  | 'glasses'
  | 'moon';

export interface PictureItem {
  id: PictureId;
  labelKey: TranslationKey;
  /** Interests this picture speaks to. Empty means "suits everyone". */
  tags: InterestTag[];
}

/** Everyday objects, chosen to be recognisable across cultures. */
export const PICTURES: PictureItem[] = [
  { id: 'apple', labelKey: 'picture.apple', tags: ['cooking'] },
  { id: 'flower', labelKey: 'picture.flower', tags: ['flowers', 'gardening'] },
  { id: 'sun', labelKey: 'picture.sun', tags: [] },
  { id: 'house', labelKey: 'picture.house', tags: ['family'] },
  { id: 'car', labelKey: 'picture.car', tags: ['travel'] },
  { id: 'cat', labelKey: 'picture.cat', tags: ['cats'] },
  { id: 'bird', labelKey: 'picture.bird', tags: ['birds'] },
  { id: 'fish', labelKey: 'picture.fish', tags: ['fishing'] },
  { id: 'tree', labelKey: 'picture.tree', tags: ['gardening'] },
  { id: 'umbrella', labelKey: 'picture.umbrella', tags: [] },
  { id: 'key', labelKey: 'picture.key', tags: [] },
  { id: 'book', labelKey: 'picture.book', tags: ['reading'] },
  { id: 'clock', labelKey: 'picture.clock', tags: [] },
  { id: 'cup', labelKey: 'picture.cup', tags: ['tea', 'cooking'] },
  { id: 'dog', labelKey: 'picture.dog', tags: ['dogs'] },
  { id: 'guitar', labelKey: 'picture.guitar', tags: ['music', 'singing'] },
  { id: 'radio', labelKey: 'picture.radio', tags: ['radio', 'music'] },
  { id: 'film', labelKey: 'picture.film', tags: ['films'] },
  { id: 'ball', labelKey: 'picture.ball', tags: ['cricket', 'football'] },
  { id: 'trophy', labelKey: 'picture.trophy', tags: ['cricket', 'football'] },
  { id: 'bicycle', labelKey: 'picture.bicycle', tags: ['travel'] },
  { id: 'train', labelKey: 'picture.train', tags: ['travel'] },
  { id: 'temple', labelKey: 'picture.temple', tags: ['temple'] },
  { id: 'mountain', labelKey: 'picture.mountain', tags: ['travel'] },
  { id: 'boat', labelKey: 'picture.boat', tags: ['fishing', 'travel'] },
  { id: 'palette', labelKey: 'picture.palette', tags: ['painting'] },
  { id: 'glasses', labelKey: 'picture.glasses', tags: ['reading'] },
  { id: 'moon', labelKey: 'picture.moon', tags: [] },
];

// --------------------------------------------------------------------- words

export interface WordItem {
  id: string;
  labelKey: TranslationKey;
  tags: InterestTag[];
}

/** Short, concrete nouns — easier to hold in mind than abstract words. */
export const WORDS: WordItem[] = [
  { id: 'apple', labelKey: 'word.apple', tags: ['cooking'] },
  { id: 'water', labelKey: 'word.water', tags: [] },
  { id: 'chair', labelKey: 'word.chair', tags: [] },
  { id: 'flower', labelKey: 'word.flower', tags: ['flowers', 'gardening'] },
  { id: 'book', labelKey: 'word.book', tags: ['reading'] },
  { id: 'moon', labelKey: 'word.moon', tags: [] },
  { id: 'river', labelKey: 'word.river', tags: ['fishing'] },
  { id: 'bread', labelKey: 'word.bread', tags: ['cooking'] },
  { id: 'garden', labelKey: 'word.garden', tags: ['gardening', 'flowers'] },
  { id: 'letter', labelKey: 'word.letter', tags: ['reading'] },
  { id: 'window', labelKey: 'word.window', tags: [] },
  { id: 'lamp', labelKey: 'word.lamp', tags: [] },
  { id: 'tea', labelKey: 'word.tea', tags: ['tea'] },
  { id: 'song', labelKey: 'word.song', tags: ['music', 'singing'] },
  { id: 'market', labelKey: 'word.market', tags: [] },
  { id: 'rain', labelKey: 'word.rain', tags: [] },
  { id: 'temple', labelKey: 'word.temple', tags: ['temple'] },
  { id: 'train', labelKey: 'word.train', tags: ['travel'] },
];

// ------------------------------------------------------------------ theming

/**
 * Picks `count` items, preferring ones that match the person's interests.
 *
 * Themed items come first, then untagged everyday items, then anything else —
 * so a cricket follower sees a bat and a trophy among the cards, but never ends
 * up with too few cards to play because their interests are narrow.
 *
 * `shuffleFn` is injected so callers control randomness (and tests can pin it).
 */
export function pickThemed<T extends { tags: InterestTag[] }>(
  pool: T[],
  count: number,
  interests: InterestTag[],
  shuffleFn: <U>(items: U[]) => U[],
): T[] {
  if (interests.length === 0) return shuffleFn(pool).slice(0, count);

  const wanted = new Set(interests);
  const themed: T[] = [];
  const neutral: T[] = [];
  const rest: T[] = [];

  for (const item of pool) {
    if (item.tags.some((tag) => wanted.has(tag))) themed.push(item);
    else if (item.tags.length === 0) neutral.push(item);
    else rest.push(item);
  }

  // Roughly half themed keeps it personal without becoming repetitive.
  const themedTarget = Math.min(themed.length, Math.max(1, Math.ceil(count / 2)));
  const picked = shuffleFn(themed).slice(0, themedTarget);
  const filler = shuffleFn([...neutral, ...rest]);
  for (const item of filler) {
    if (picked.length >= count) break;
    picked.push(item);
  }
  return shuffleFn(picked).slice(0, count);
}

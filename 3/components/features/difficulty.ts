import type { BadgeTone } from '@/components/ui/badge';
import type { TranslationKey } from '@/lib/i18n/locales/en';
import type { AdaptationReason, DifficultyLevel } from '@/lib/types';

/**
 * One shared vocabulary for difficulty, so the card, the activity and the
 * caregiver's charts all name the same level the same way.
 */
export const DIFFICULTY_LABEL: Record<DifficultyLevel, TranslationKey> = {
  easy: 'games.difficulty.easy',
  medium: 'games.difficulty.medium',
  hard: 'games.difficulty.hard',
};

export const DIFFICULTY_TONE: Record<DifficultyLevel, BadgeTone> = {
  easy: 'sage',
  medium: 'sky',
  hard: 'lilac',
};

/**
 * Why the engine chose this level, in words a caregiver can check.
 *
 * The patient-facing copy never says "you did badly" — the reason keys are
 * written as observations, and a step down reads as an invitation.
 */
export const REASON_LABEL: Record<AdaptationReason, TranslationKey> = {
  'first-time': 'games.reason.first-time',
  'high-accuracy': 'games.reason.high-accuracy',
  'low-accuracy': 'games.reason.low-accuracy',
  'quick-answers': 'games.reason.quick-answers',
  'slower-answers': 'games.reason.slower-answers',
  'many-hints': 'games.reason.many-hints',
  'no-hints-needed': 'games.reason.no-hints-needed',
  'returning-after-break': 'games.reason.returning-after-break',
  'holding-steady': 'games.reason.holding-steady',
  'caregiver-stage': 'games.reason.caregiver-stage',
  'few-people-added': 'games.reason.few-people-added',
};

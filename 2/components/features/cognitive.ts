import type { BadgeTone } from '@/components/ui/badge';
import type { TranslationKey } from '@/lib/i18n';
import type { CognitiveStage } from '@/lib/types';

/**
 * How a recorded cognitive stage is written and coloured, in one place, so the
 * roster badge and the profile form can never disagree about what a stage is.
 *
 * The tones deliberately stop short of `danger`. This value is reference
 * information a caregiver or clinician entered — not a result the app produced,
 * and not an alarm — so it is never dressed up as one.
 */

export const STAGES: CognitiveStage[] = [
  'not-recorded',
  'no-concern',
  'early',
  'moderate',
  'advanced',
];

export const STAGE_KEY: Record<CognitiveStage, TranslationKey> = {
  'not-recorded': 'cognitive.stage.not-recorded',
  'no-concern': 'cognitive.stage.no-concern',
  early: 'cognitive.stage.early',
  moderate: 'cognitive.stage.moderate',
  advanced: 'cognitive.stage.advanced',
};

export const STAGE_TONE: Record<CognitiveStage, BadgeTone> = {
  'not-recorded': 'neutral',
  'no-concern': 'sage',
  early: 'sky',
  moderate: 'sun',
  advanced: 'clay',
};

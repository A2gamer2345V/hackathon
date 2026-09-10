import { normaliseTranscript } from './parser';
import type { CareIntent } from './care-intents';

/**
 * Intent parsing for the caregiver assistant.
 *
 * Same approach as the patient parser — weighted substring matching over phrase
 * fragments — with two differences worth knowing about.
 *
 * The phrase lists are shorter and lean English/Hindi/Bengali/Assamese. That is
 * not an oversight: caregivers on this app are overwhelmingly typing rather than
 * speaking, often on a phone in a hospital corridor, and the honest position is
 * to cover the languages we can actually cover well and let everything else fall
 * through to `UNKNOWN` with a list of examples, rather than to ship thin
 * transliterations that half-match and act on the wrong record.
 *
 * The second difference is `argument`. "Switch to Kamala" carries a name, and
 * that name is returned here as *plain text and nothing more*. It is never an
 * id. The caller matches it against the roster the server returned and acts only
 * on an id from that list, so no amount of odd input can address a record the
 * signed-in caregiver does not already own.
 */

interface CarePattern {
  intent: CareIntent;
  phrases: string[];
  weight?: number;
  /** Text after the matched phrase is captured as `argument`. */
  captures?: boolean;
}

const PATTERNS: CarePattern[] = [
  {
    intent: 'CARE_SWITCH_PATIENT',
    weight: 4,
    captures: true,
    phrases: [
      'switch to',
      'change to',
      'show me',
      'open patient',
      'switch patient to',
      'go to patient',
      'badlo',
      'dikhao',
      'बदलो',
      'दिखाओ',
      'দেখাও',
      'সলনি কৰক',
    ],
  },
  {
    intent: 'CARE_SUMMARY',
    weight: 4,
    phrases: [
      'how is she doing',
      'how is he doing',
      'how are they doing',
      'how is it going',
      'how is today going',
      'how is today',
      'how did today go',
      'how was today',
      'how is the day',
      'how are things',
      'summary',
      'give me a summary',
      'update',
      'status',
      'kaisa hai',
      'kaisi hai',
      'aaj kaisa',
      'कैसा है',
      'कैसी है',
      'आज कैसा',
      'কেমন আছে',
      'আজ কেমন',
      'কেনে আছে',
    ],
  },
  {
    intent: 'CARE_NEXT_REMINDER',
    weight: 4,
    phrases: [
      'next reminder',
      'what is next',
      'whats next',
      'next medicine',
      'when is the medicine',
      'next dose',
      'agla reminder',
      'dawa kab',
      'अगला रिमाइंडर',
      'दवा कब',
      'পরের ওষুধ',
      'ওষুধ কখন',
      'পিছৰ ঔষধ',
    ],
  },
  {
    intent: 'CARE_ALERT_COUNT',
    weight: 4,
    phrases: [
      'any alerts',
      'new alerts',
      'unread alerts',
      'anything i should know',
      'anything new',
      'koi alert',
      'कोई अलर्ट',
      'নতুন সতর্কতা',
    ],
  },
  {
    intent: 'CARE_WHO',
    weight: 4,
    phrases: [
      'who am i looking at',
      'which patient',
      'who is selected',
      'current patient',
      'kaun sa patient',
      'कौन सा मरीज़',
      'কোন রোগী',
    ],
  },
  {
    intent: 'CARE_ALERTS',
    weight: 2,
    phrases: ['alerts', 'alert', 'warnings', 'अलर्ट', 'সতর্কতা'],
  },
  {
    intent: 'CARE_INSIGHTS',
    weight: 2,
    phrases: [
      'insights',
      'insight',
      'what have you noticed',
      'observations',
      'अंतर्दृष्टि',
      'অন্তর্দৃষ্টি',
    ],
  },
  {
    intent: 'CARE_PERFORMANCE',
    weight: 2,
    phrases: [
      'performance',
      'per game',
      'accuracy',
      'scores',
      'results',
      'प्रदर्शन',
      'কর্মক্ষমতা',
    ],
  },
  {
    intent: 'CARE_ACTIVITY',
    weight: 2,
    phrases: [
      'activity log',
      'activity',
      'what did she do',
      'what did he do',
      'today log',
      'गतिविधि',
      'কার্যকলাপ',
      'কাৰ্যকলাপ',
    ],
  },
  {
    intent: 'CARE_REMINDERS',
    phrases: [
      'reminders',
      'reminder list',
      'medicines',
      'medication',
      'रिमाइंडर',
      'दवाइयाँ',
      'ওষুধ',
      'ঔষধ',
    ],
  },
  {
    intent: 'CARE_PATIENTS',
    weight: 2,
    phrases: [
      'my patients',
      'patients',
      'patient list',
      'everyone',
      'मरीज़',
      'रोगी',
      'রোগীরা',
    ],
  },
  {
    intent: 'CARE_PROGRESS',
    phrases: ['progress', 'this week', 'weekly', 'प्रगति', 'অগ্রগতি', 'অগ্ৰগতি'],
  },
  {
    intent: 'CARE_FAMILY',
    phrases: ['family', 'family tree', 'relatives', 'परिवार', 'পরিবার'],
  },
  {
    intent: 'CARE_PROFILE',
    weight: 2,
    phrases: [
      'patient profile',
      'profile',
      'details',
      'preferences',
      'interests',
      'प्रोफ़ाइल',
      'প্রোফাইল',
    ],
  },
  {
    intent: 'CARE_SETTINGS',
    phrases: ['settings', 'my account', 'password', 'सेटिंग', 'সেটিংস'],
  },
  {
    intent: 'CARE_DASHBOARD',
    phrases: ['dashboard', 'home', 'overview', 'डैशबोर्ड', 'ড্যাশবোর্ড'],
  },
  {
    intent: 'CARE_BACK',
    weight: 2,
    phrases: ['go back', 'back', 'previous', 'वापस', 'পিছনে'],
  },
  {
    intent: 'CARE_REPEAT',
    weight: 2,
    phrases: ['repeat', 'say again', 'pardon', 'फिर से', 'আবার বলুন'],
  },
  {
    intent: 'CARE_STOP',
    weight: 3,
    phrases: ['stop', 'be quiet', 'stop talking', 'रुको', 'থামুন'],
  },
  {
    intent: 'CARE_HELP',
    phrases: [
      'help',
      'what can you do',
      'what can i ask',
      'commands',
      'मदद',
      'सहायता',
      'সাহায্য',
      'সহায়',
    ],
  },
];

export interface ParsedCareCommand {
  intent: CareIntent;
  /** 0–1 rough confidence. Below the threshold the intent becomes UNKNOWN. */
  confidence: number;
  transcript: string;
  /**
   * Free text captured after a phrase such as "switch to". Plain words only —
   * the caller resolves it against data it already has, and never treats it as
   * an identifier.
   */
  argument?: string;
  matchedPhrase?: string;
}

const MIN_CONFIDENCE = 0.3;

export function parseCareCommand(input: string): ParsedCareCommand {
  const transcript = normaliseTranscript(input);
  if (!transcript) return { intent: 'UNKNOWN', confidence: 0, transcript: input };

  let best: { pattern: CarePattern; score: number; phrase: string; at: number } | null = null;

  for (const pattern of PATTERNS) {
    for (const phrase of pattern.phrases) {
      const needle = normaliseTranscript(phrase);
      if (!needle) continue;
      const at = transcript.indexOf(needle);
      if (at === -1) continue;

      const coverage = needle.length / Math.max(transcript.length, needle.length);
      const score = needle.length * (pattern.weight ?? 1) + coverage * 4;

      if (!best || score > best.score) best = { pattern, score, phrase, at };
    }
  }

  if (!best) return { intent: 'UNKNOWN', confidence: 0, transcript: input };

  const confidence = Math.min(1, 0.35 + best.score / 30);
  if (confidence < MIN_CONFIDENCE) {
    return { intent: 'UNKNOWN', confidence, transcript: input, matchedPhrase: best.phrase };
  }

  const argument = best.pattern.captures
    ? transcript.slice(best.at + normaliseTranscript(best.phrase).length).trim()
    : undefined;

  // "Show me" with nothing after it is a half-finished sentence, not a request
  // to switch to a patient called "". Treat it as unrecognised so the assistant
  // asks rather than guesses.
  if (best.pattern.captures && !argument) {
    return { intent: 'UNKNOWN', confidence, transcript: input, matchedPhrase: best.phrase };
  }

  return {
    intent: best.pattern.intent,
    confidence,
    transcript: input,
    argument: argument || undefined,
    matchedPhrase: best.phrase,
  };
}

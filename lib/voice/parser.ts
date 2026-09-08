import type { LanguageCode } from '@/lib/i18n/languages';
import type { Intent } from './intents';

/**
 * Language-independent intent parsing.
 *
 * Each intent carries phrase fragments in several languages (plus romanised
 * spellings, because elders often speak Hindi/Assamese while the recogniser
 * returns Latin text, and typed input is frequently romanised too). Matching is
 * substring-based on a normalised transcript, scored so that longer and more
 * specific phrases win over short generic ones.
 *
 * This is a prototype NLU. The exported `parseCommand` signature is what a
 * server-side classifier would implement, so the swap is a one-file change.
 */

interface IntentPattern {
  intent: Intent;
  /** Phrases in any supported language. Order does not matter. */
  phrases: string[];
  /** Extra weight for intents that should beat a more generic sibling. */
  weight?: number;
}

/**
 * Normalises a transcript for matching: lowercase, strip punctuation, collapse
 * whitespace. Indic scripts pass through unchanged apart from punctuation.
 */
export function normaliseTranscript(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:"'`()\[\]{}<>/\\|~^*_=+—–।॥]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PATTERNS: IntentPattern[] = [
  {
    intent: 'OPEN_MEMORY_GAMES',
    weight: 2,
    phrases: [
      'memory game',
      'memory games',
      'matching game',
      'remember game',
      'picture recall',
      'memory khel',
      'yaad',
      'yaaddasht',
      'smriti',
      'याददाश्त',
      'मेमोरी गेम',
      'याददाश्त का खेल',
      'স্মৃতির খেলা',
      'মেমরি গেম',
      'স্মৃতিৰ খেল',
      'hriatrengna infiamna',
      'jingkai jingkynmaw',
      'mon te rakha kheli',
    ],
  },
  {
    intent: 'OPEN_ATTENTION_GAMES',
    weight: 2,
    phrases: [
      'attention game',
      'attention games',
      'focus game',
      'number tap',
      'colour match',
      'color match',
      'shape sort',
      'dhyan',
      'ध्यान का खेल',
      'ध्यान वाला खेल',
      'মনোযোগের খেলা',
      'মনোযোগৰ খেল',
      'ngaihvenna infiamna',
      'dhyan diya kheli',
    ],
  },
  {
    intent: 'OPEN_GAMES',
    phrases: [
      'game',
      'games',
      'play',
      'let us play',
      'lets play',
      'activity',
      'activities',
      'khel',
      'khelna',
      'khelna hai',
      'khelte',
      'खेल',
      'खेलना',
      'गेम',
      'খেলা',
      'খেলতে',
      'খেল',
      'infiamna',
      'jingkai',
      'kamal·ani',
      'kheli',
      'lamsa',
      'erne',
      'kelang',
      'kechi',
    ],
  },
  {
    intent: 'NEXT_REMINDER',
    weight: 3,
    phrases: [
      'when is my medicine',
      'when is my medication',
      'next medicine',
      'next reminder',
      'what is next',
      'when do i take',
      'dawa kab',
      'dawai kab',
      'meri dawa',
      'दवा कब',
      'दवाई कब',
      'मेरी दवा',
      'ওষুধ কখন',
      'আমার ওষুধ',
      'ঔষধ কেতিয়া',
      'damdawi engtik',
      'dawai kitia',
    ],
  },
  {
    intent: 'OPEN_REMINDERS',
    phrases: [
      'reminder',
      'reminders',
      'my medicines',
      'medicine list',
      'show reminders',
      'yaad dila',
      'yaad dilao',
      'reminder dikhao',
      'याद',
      'याद दिलावे',
      'रिमाइंडर',
      'মনে করিয়ে',
      'মনত পেলোৱা',
      'hriatchhuahna',
      'jingpynkynmaw',
      'khumnai',
      'kachiroi',
      'anungtet',
      'migom',
      'ku·nachenganiko',
      'mon te rakhibole',
      'गोसोखां',
      'নিংশিংবা',
    ],
  },
  {
    intent: 'OPEN_MY_DAY',
    phrases: [
      'my day',
      'today',
      'my plan',
      'todays plan',
      'daily plan',
      'routine',
      'schedule',
      'mera din',
      'aaj ka plan',
      'aaj kya',
      'मेरा दिन',
      'आज की योजना',
      'आज क्या',
      'আমার দিন',
      'আজকের পরিকল্পনা',
      'মোৰ দিন',
      'ka sngi jong nga',
      'ka nichhun',
      'anga sal',
      'ang sal',
      'moi laga din',
      'ne aning',
      'ni ani',
      'ngo lo',
      'आंनि सान',
      'ঐগী নুমিৎ',
    ],
  },
  {
    intent: 'OPEN_PROGRESS',
    phrases: [
      'progress',
      'how am i doing',
      'my score',
      'my results',
      'this week',
      'pragati',
      'meri pragati',
      'प्रगति',
      'कैसा कर रहा',
      'অগ্রগতি',
      'অগ্ৰগতি',
      'hmasawnna',
      'jingmih',
      'thangnai',
      'kedam',
      'age barha',
    ],
  },
  {
    intent: 'OPEN_PLANNER',
    phrases: [
      'recommend',
      'recommended',
      'suggestion',
      'suggest something',
      'made for me',
      'what should i do',
      'kya karu',
      'sujhav',
      'सुझाव',
      'मेरे लिए',
      'क्या करूँ',
      'আমার জন্য',
      'পরামর্শ',
      'মোৰ বাবে',
      'পৰামৰ্শ',
    ],
  },
  {
    intent: 'START_RECOMMENDED',
    weight: 3,
    phrases: [
      'start the activity',
      'start recommended',
      'start my activity',
      'shuru karo',
      'गतिविधि शुरू',
      'শুরু করুন',
      'আৰম্ভ কৰক',
    ],
  },
  {
    intent: 'OPEN_CARE_CIRCLE',
    weight: 2,
    phrases: [
      'care circle',
      'my family',
      'call my daughter',
      'call my son',
      'contact caregiver',
      'family',
      'parivar',
      'beti ko',
      'परिवार',
      'देखभाल मंडली',
      'পরিবার',
      'যত্ন-বৃত্ত',
      'যত্নৰ বৃত্ত',
    ],
  },
  {
    intent: 'OPEN_SETTINGS',
    phrases: [
      'settings',
      'setting',
      'change language',
      'preferences',
      'options',
      'setting kholo',
      'bhasha badlo',
      'सेटिंग',
      'भाषा बदल',
      'সেটিংস',
      'ভাষা বদল',
      'ছেটিংছ',
      'ভাষা সলনি',
    ],
  },
  {
    intent: 'OPEN_HOME',
    phrases: [
      'go home',
      'home',
      'main screen',
      'start screen',
      'ghar',
      'home chalo',
      'होम',
      'घर',
      'হোম',
      'ঘৰলৈ',
      'nok',
      'ki',
      'in lam',
      'ïing',
      'hem',
      'okum',
    ],
  },
  {
    intent: 'GO_BACK',
    weight: 2,
    phrases: [
      'go back',
      'back',
      'previous',
      'peeche',
      'wapas',
      'वापस',
      'पीछे',
      'পিছনে',
      'পিছলৈ',
      'phai noh',
      'hnungtir',
    ],
  },
  {
    intent: 'REPEAT',
    weight: 2,
    phrases: [
      'repeat',
      'say again',
      'say that again',
      'pardon',
      'phir se',
      'dobara',
      'फिर से',
      'दोबारा',
      'আবার বলুন',
      'পুনৰ কওক',
    ],
  },
  {
    intent: 'SLOWER_SPEECH',
    weight: 3,
    phrases: [
      'slower',
      'speak slower',
      'speak slowly',
      'too fast',
      'dheere',
      'dheere bolo',
      'धीरे',
      'धीरे बोलो',
      'ধীরে বলুন',
      'লাহে লাহে',
    ],
  },
  {
    intent: 'FASTER_SPEECH',
    weight: 3,
    phrases: [
      'faster',
      'speak faster',
      'too slow',
      'tez bolo',
      'तेज़ बोलो',
      'দ্রুত বলুন',
      'বেগেৰে কওক',
    ],
  },
  {
    intent: 'LARGER_TEXT',
    weight: 3,
    phrases: [
      'bigger text',
      'larger text',
      'text bigger',
      'text larger',
      'bigger letters',
      'make it bigger',
      'make it larger',
      'zoom in',
      'text size',
      'cannot read',
      "can't read",
      'bada karo',
      'बड़ा करो',
      'अक्षर बड़े',
      'লেখা বড়',
      'আখৰ ডাঙৰ',
    ],
  },
  {
    intent: 'HIGH_CONTRAST',
    weight: 3,
    phrases: [
      'high contrast',
      'brighter',
      'hard to see',
      'contrast',
      'साफ़ दिखाओ',
      'गहरा',
      'গাঢ়',
    ],
  },
  {
    intent: 'STOP_SPEAKING',
    weight: 3,
    phrases: ['stop', 'be quiet', 'stop talking', 'chup', 'रुको', 'चुप', 'থামুন', 'ৰওক'],
  },
  {
    intent: 'HELP',
    phrases: [
      'help',
      'i need help',
      'what can i say',
      'what can you do',
      'confused',
      'madad',
      'मदद',
      'सहायता',
      'সাহায্য',
      'সহায়',
      'jingïarap',
      'ṭanpuina',
      'modot',
      'nemtsü',
      'rwchapmung',
      'dakgipa',
      'kroi',
      'migbo',
      'मदद',
      'মতেং',
    ],
  },
];

export interface ParsedCommand {
  intent: Intent;
  /** 0–1 rough confidence. Below `MIN_CONFIDENCE` we treat it as UNKNOWN. */
  confidence: number;
  transcript: string;
  matchedPhrase?: string;
}

const MIN_CONFIDENCE = 0.3;

/**
 * Resolves free text in any supported language to a controlled intent.
 * `language` is accepted so a future per-language model can be selected; the
 * prototype matches across all languages, which is more forgiving when a
 * recogniser returns romanised text for an Indic language.
 */
export function parseCommand(input: string, _language?: LanguageCode): ParsedCommand {
  const transcript = normaliseTranscript(input);
  if (!transcript) return { intent: 'UNKNOWN', confidence: 0, transcript: input };

  let best: { intent: Intent; score: number; phrase: string } | null = null;

  for (const pattern of PATTERNS) {
    for (const phrase of pattern.phrases) {
      const needle = normaliseTranscript(phrase);
      if (!needle || !transcript.includes(needle)) continue;

      // Longer matches are more specific; weighted intents outrank generic ones.
      const coverage = needle.length / Math.max(transcript.length, needle.length);
      const score = needle.length * (pattern.weight ?? 1) + coverage * 4;

      if (!best || score > best.score) {
        best = { intent: pattern.intent, score, phrase };
      }
    }
  }

  if (!best) return { intent: 'UNKNOWN', confidence: 0, transcript: input };

  // Map the raw score onto a readable 0–1 band. Exact short commands such as
  // "help" and long specific phrases should both land comfortably above the
  // threshold; incidental one-word overlaps land below it.
  const confidence = Math.min(1, 0.35 + best.score / 30);
  return {
    intent: confidence >= MIN_CONFIDENCE ? best.intent : 'UNKNOWN',
    confidence,
    transcript: input,
    matchedPhrase: best.phrase,
  };
}

/**
 * The language registry.
 *
 * Every entry is a first-class supported language of the product. What varies
 * between them is:
 *   - how much of the UI string set is translated today — counted from the
 *     dictionaries by `coverageRatio` in ./index rather than declared here, so
 *     the badge on a language card cannot drift away from the actual strings
 *   - `speechRecognitionLocale` / `speechSynthesisLocale` — the BCP-47 tags we
 *     hand to a speech provider. These are *requests*, not guarantees: browser
 *     support for these locales is detected at runtime (see lib/voice).
 *
 * `voiceExpectation` records what we honestly expect from a typical browser so
 * the UI can set the right expectation *before* the user commits to a language.
 * It is never used in place of a real runtime capability check.
 */

export const LANGUAGE_CODES = [
  'en',
  'hi',
  'as',
  'bn',
  'mni',
  'brx',
  'kha',
  'grt',
  'lus',
  'trp',
  'ne',
  'nag',
  'njo',
  'mrg',
  'mjw',
] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

/** What we expect a typical browser to offer, before runtime detection. */
export type VoiceExpectation = 'likely' | 'limited' | 'unlikely';

export interface LanguageDefinition {
  code: LanguageCode;
  /** English name, for caregivers and for screen readers set to English. */
  name: string;
  /** The name written the way its own speakers write it. */
  nativeName: string;
  /** Two-letter-ish badge shown on the selection card instead of a flag. */
  script: string;
  /** Where the language is mainly spoken — helps elders recognise their own. */
  region: string;
  /**
   * Locale requested from the speech-recognition provider. A `fallbackLocale`
   * is used when the primary one is not offered by the device — e.g. Bodo
   * speakers are usually also served acceptably by Hindi acoustic models.
   */
  speechRecognitionLocale: string;
  speechRecognitionFallbackLocale?: string;
  speechSynthesisLocale: string;
  speechSynthesisFallbackLocale?: string;
  voiceExpectation: VoiceExpectation;
  /**
   * The BCP-47 tag handed to `Intl` for dates, times and numbers.
   *
   * Several languages here have no CLDR data of their own, so asking `Intl` for
   * them would silently fall back to whatever the device happens to be set to —
   * an English UI could end up showing German month names. Naming a real locale
   * that matches the script the dictionary is written in keeps the date beside
   * the sentence readable: Meitei is written here in Bengali script, so it
   * formats as `bn-IN`; Khasi is written in Latin, so `en-IN`.
   *
   * This is a formatting choice, not a claim that the language *is* that locale.
   */
  formatLocale: string;
  /** Text direction; all currently supported languages are LTR. */
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: Record<LanguageCode, LanguageDefinition> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'En',
    region: 'India / International',
    speechRecognitionLocale: 'en-IN',
    speechRecognitionFallbackLocale: 'en-US',
    speechSynthesisLocale: 'en-IN',
    speechSynthesisFallbackLocale: 'en-US',
    formatLocale: 'en-IN',
    voiceExpectation: 'likely',
    dir: 'ltr',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'हि',
    region: 'North India',
    speechRecognitionLocale: 'hi-IN',
    speechSynthesisLocale: 'hi-IN',
    formatLocale: 'hi-IN',
    voiceExpectation: 'likely',
    dir: 'ltr',
  },
  as: {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'অ',
    region: 'Assam',
    speechRecognitionLocale: 'as-IN',
    speechRecognitionFallbackLocale: 'bn-IN',
    speechSynthesisLocale: 'as-IN',
    speechSynthesisFallbackLocale: 'bn-IN',
    formatLocale: 'as-IN',
    voiceExpectation: 'limited',
    dir: 'ltr',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'বা',
    region: 'West Bengal / Assam',
    speechRecognitionLocale: 'bn-IN',
    speechSynthesisLocale: 'bn-IN',
    formatLocale: 'bn-IN',
    voiceExpectation: 'likely',
    dir: 'ltr',
  },
  mni: {
    code: 'mni',
    name: 'Meitei (Manipuri)',
    nativeName: 'মৈতৈলোন্',
    script: 'মৈ',
    region: 'Manipur',
    speechRecognitionLocale: 'mni-IN',
    speechRecognitionFallbackLocale: 'bn-IN',
    speechSynthesisLocale: 'mni-IN',
    speechSynthesisFallbackLocale: 'bn-IN',
    // Written here in Bengali script, so it formats like Bengali.
    formatLocale: 'bn-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  brx: {
    code: 'brx',
    name: 'Bodo',
    nativeName: 'बर’',
    script: 'बर',
    region: 'Assam',
    speechRecognitionLocale: 'brx-IN',
    speechRecognitionFallbackLocale: 'hi-IN',
    speechSynthesisLocale: 'brx-IN',
    speechSynthesisFallbackLocale: 'hi-IN',
    // Devanagari script, so Hindi numerals and month names read correctly.
    formatLocale: 'hi-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  kha: {
    code: 'kha',
    name: 'Khasi',
    nativeName: 'Ka Ktien Khasi',
    script: 'Kh',
    region: 'Meghalaya',
    speechRecognitionLocale: 'kha-IN',
    speechRecognitionFallbackLocale: 'en-IN',
    speechSynthesisLocale: 'kha-IN',
    speechSynthesisFallbackLocale: 'en-IN',
    formatLocale: 'en-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  grt: {
    code: 'grt',
    name: 'Garo',
    nativeName: 'A·chik Ku·si',
    script: 'Ga',
    region: 'Meghalaya',
    speechRecognitionLocale: 'grt-IN',
    speechRecognitionFallbackLocale: 'en-IN',
    speechSynthesisLocale: 'grt-IN',
    speechSynthesisFallbackLocale: 'en-IN',
    formatLocale: 'en-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  lus: {
    code: 'lus',
    name: 'Mizo',
    nativeName: 'Mizo ṭawng',
    script: 'Mi',
    region: 'Mizoram',
    speechRecognitionLocale: 'lus-IN',
    speechRecognitionFallbackLocale: 'en-IN',
    speechSynthesisLocale: 'lus-IN',
    speechSynthesisFallbackLocale: 'en-IN',
    formatLocale: 'en-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  trp: {
    code: 'trp',
    name: 'Kokborok (Tripuri)',
    nativeName: 'Kokborok',
    script: 'Ko',
    region: 'Tripura',
    speechRecognitionLocale: 'trp-IN',
    speechRecognitionFallbackLocale: 'bn-IN',
    speechSynthesisLocale: 'trp-IN',
    speechSynthesisFallbackLocale: 'bn-IN',
    // Kokborok is written in Latin script in these dictionaries.
    formatLocale: 'en-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  ne: {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    script: 'ने',
    region: 'Sikkim / Darjeeling',
    speechRecognitionLocale: 'ne-NP',
    speechRecognitionFallbackLocale: 'hi-IN',
    speechSynthesisLocale: 'ne-NP',
    speechSynthesisFallbackLocale: 'hi-IN',
    formatLocale: 'ne-NP',
    voiceExpectation: 'limited',
    dir: 'ltr',
  },
  nag: {
    code: 'nag',
    name: 'Nagamese',
    nativeName: 'Nagamese',
    script: 'Na',
    region: 'Nagaland',
    speechRecognitionLocale: 'nag-IN',
    speechRecognitionFallbackLocale: 'as-IN',
    speechSynthesisLocale: 'nag-IN',
    speechSynthesisFallbackLocale: 'as-IN',
    // Nagamese is written in Latin script here.
    formatLocale: 'en-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  njo: {
    code: 'njo',
    name: 'Ao',
    nativeName: 'Ao',
    script: 'Ao',
    region: 'Nagaland',
    speechRecognitionLocale: 'njo-IN',
    speechRecognitionFallbackLocale: 'en-IN',
    speechSynthesisLocale: 'njo-IN',
    speechSynthesisFallbackLocale: 'en-IN',
    formatLocale: 'en-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  mrg: {
    code: 'mrg',
    name: 'Mishing',
    nativeName: 'Mising Agom',
    script: 'Ms',
    region: 'Assam',
    speechRecognitionLocale: 'mrg-IN',
    speechRecognitionFallbackLocale: 'as-IN',
    speechSynthesisLocale: 'mrg-IN',
    speechSynthesisFallbackLocale: 'as-IN',
    // Mishing is written in Latin script here.
    formatLocale: 'en-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
  mjw: {
    code: 'mjw',
    name: 'Karbi',
    nativeName: 'Arleng Alam',
    script: 'Ka',
    region: 'Assam',
    speechRecognitionLocale: 'mjw-IN',
    speechRecognitionFallbackLocale: 'as-IN',
    speechSynthesisLocale: 'mjw-IN',
    speechSynthesisFallbackLocale: 'as-IN',
    // Karbi is written in Latin script here.
    formatLocale: 'en-IN',
    voiceExpectation: 'unlikely',
    dir: 'ltr',
  },
};

export const LANGUAGE_LIST: LanguageDefinition[] = LANGUAGE_CODES.map((c) => LANGUAGES[c]);

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function getLanguage(code: LanguageCode): LanguageDefinition {
  return LANGUAGES[code] ?? LANGUAGES[DEFAULT_LANGUAGE];
}

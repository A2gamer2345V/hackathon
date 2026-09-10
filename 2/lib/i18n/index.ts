import type { Dictionary, TranslationKey } from './locales/en';
import en from './locales/en';
import hi from './locales/hi';
import bn from './locales/bn';
import as from './locales/as';
import ne from './locales/ne';
import mni from './locales/mni';
import brx from './locales/brx';
import kha from './locales/kha';
import grt from './locales/grt';
import lus from './locales/lus';
import trp from './locales/trp';
import nag from './locales/nag';
import njo from './locales/njo';
import mrg from './locales/mrg';
import mjw from './locales/mjw';
import { DEFAULT_LANGUAGE, type LanguageCode } from './languages';

export type { Dictionary, TranslationKey };

/**
 * All dictionaries are bundled. They are small plain objects (a few KB each),
 * and the target audience is on slow connections where a second round-trip for
 * a language file is worse than the bytes.
 */
const DICTIONARIES: Record<LanguageCode, Partial<Dictionary>> = {
  en,
  hi,
  bn,
  as,
  ne,
  mni,
  brx,
  kha,
  grt,
  lus,
  trp,
  nag,
  njo,
  mrg,
  mjw,
};

export type MessageValues = Record<string, string | number>;

/** Replaces `{placeholders}` in a translated string. */
export function formatMessage(template: string, values?: MessageValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

/**
 * Resolves values written as `{{other.key}}` into their own translation.
 *
 * The adaptive engine builds sentences out of pieces — a domain name, a
 * difficulty level — that each need translating before they are dropped into the
 * surrounding sentence. Resolution is one level deep on purpose: a nested key's
 * own placeholders are left alone, so no value can loop back on itself.
 */
function resolveValues(
  language: LanguageCode,
  values: MessageValues | undefined,
): MessageValues | undefined {
  if (!values) return values;
  let changed = false;
  const out: MessageValues = {};
  for (const [key, value] of Object.entries(values)) {
    const nested = typeof value === 'string' ? /^\{\{([\w.-]+)\}\}$/.exec(value) : null;
    if (nested) {
      changed = true;
      out[key] = lookup(language, nested[1] as TranslationKey);
    } else {
      out[key] = value;
    }
  }
  return changed ? out : values;
}

function lookup(language: LanguageCode, key: TranslationKey): string {
  const dictionary = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LANGUAGE];
  return dictionary[key] ?? en[key] ?? key;
}

/**
 * Resolves a key for a language, falling back to English when the language has
 * no string for it, and finally to the key itself so a missing key is visible
 * in development rather than rendering as an empty element.
 */
export function translate(
  language: LanguageCode,
  key: TranslationKey,
  values?: MessageValues,
): string {
  return formatMessage(lookup(language, key), resolveValues(language, values));
}

/** True when the language itself has this string (i.e. no English fallback). */
export function hasTranslation(language: LanguageCode, key: TranslationKey): boolean {
  return Boolean(DICTIONARIES[language]?.[key]);
}

/** Share of the English key set that a language actually translates, 0–1. */
export function coverageRatio(language: LanguageCode): number {
  const total = Object.keys(en).length;
  const translated = Object.keys(DICTIONARIES[language] ?? {}).length;
  return total === 0 ? 0 : Math.min(1, translated / total);
}

export type Translator = (key: TranslationKey, values?: MessageValues) => string;

export function createTranslator(language: LanguageCode): Translator {
  return (key, values) => translate(language, key, values);
}

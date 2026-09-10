'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { createTranslator, type MessageValues, type TranslationKey } from '@/lib/i18n';
import {
  DEFAULT_LANGUAGE,
  getLanguage,
  isLanguageCode,
  type LanguageCode,
  type LanguageDefinition,
} from '@/lib/i18n/languages';
import { readValue, STORAGE_KEYS, writeValue } from '@/lib/services/storage';

interface LanguageContextValue {
  language: LanguageCode;
  definition: LanguageDefinition;
  setLanguage: (code: LanguageCode) => void;
  t: (key: TranslationKey, values?: MessageValues) => string;
  /** False until the stored preference has been read on the client. */
  ready: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * The chosen language lives in a tiny module-level store rather than component
 * state. `null` means "not read from storage yet", which is what both the server
 * and the first client render see — so the markup agrees — and the stored value
 * is adopted when the first subscriber attaches, with no state written from an
 * effect.
 */
let current: LanguageCode | null = null;
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (current === null) {
    const stored = readValue<string>(STORAGE_KEYS.language, DEFAULT_LANGUAGE);
    current = isLanguageCode(stored) ? stored : DEFAULT_LANGUAGE;
    onStoreChange();
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

const getSnapshot = () => current;
const getServerSnapshot = (): LanguageCode | null => null;

function publish(code: LanguageCode) {
  current = code;
  writeValue(STORAGE_KEYS.language, code);
  listeners.forEach((listener) => listener());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const language = stored ?? DEFAULT_LANGUAGE;
  const ready = stored !== null;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const def = getLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = def.dir;
  }, [language]);

  const setLanguage = useCallback((code: LanguageCode) => {
    publish(code);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const translator = createTranslator(language);
    return {
      language,
      definition: getLanguage(language),
      setLanguage,
      t: translator,
      ready,
    };
  }, [language, setLanguage, ready]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

/** Convenience hook for components that only need the translate function. */
export function useTranslation() {
  const { t, language, definition } = useLanguage();
  return { t, language, definition };
}

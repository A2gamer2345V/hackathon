import { getLanguage, type LanguageCode } from '@/lib/i18n/languages';

/**
 * Speech provider abstraction.
 *
 * The UI only ever calls `startListening(language)` and `speak(text, language)`.
 * The browser Web Speech implementation below is one provider; a server-backed
 * multilingual STT/TTS (Whisper, IndicWhisper, a TTS API) can be dropped in by
 * implementing the same two interfaces and registering it, without any UI
 * change.
 *
 * Nothing here assumes a language is supported. Support is *detected*, and the
 * result is surfaced to the user rather than silently failing.
 */

// --------------------------------------------------------------- capability

export type CapabilityLevel =
  /** The requested locale itself is available. */
  | 'native'
  /** A related locale will be used instead (e.g. Bengali voice for Assamese). */
  | 'fallback'
  /** Nothing usable on this device for this language. */
  | 'unavailable';

export interface VoiceCapability {
  recognition: CapabilityLevel;
  synthesis: CapabilityLevel;
  /** The locale that will actually be used, when one is available. */
  recognitionLocale?: string;
  synthesisLocale?: string;
}

// --------------------------------------------------- speech recognition API

export interface RecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type RecognitionErrorCode =
  | 'not-supported'
  | 'permission-denied'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'unknown';

export interface RecognitionHandlers {
  onResult: (result: RecognitionResult) => void;
  onError: (code: RecognitionErrorCode) => void;
  onEnd: () => void;
}

export interface SpeechRecognitionProvider {
  readonly id: string;
  isSupported(): boolean;
  /** Best-effort capability check for a language, without asking for the mic. */
  capabilityFor(language: LanguageCode): CapabilityLevel;
  start(language: LanguageCode, handlers: RecognitionHandlers): void;
  stop(): void;
}

export interface SpeakOptions {
  /** 0.5–1.5; mapped from the user's speech-speed preference. */
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface TextToSpeechProvider {
  readonly id: string;
  isSupported(): boolean;
  capabilityFor(language: LanguageCode): CapabilityLevel;
  speak(text: string, language: LanguageCode, options?: SpeakOptions): void;
  cancel(): void;
}

// ---------------------------------------------- browser Web Speech typings

interface BrowserSpeechRecognitionEventResultItem {
  transcript: string;
  confidence: number;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<BrowserSpeechRecognitionEventResultItem> & { isFinal: boolean }
  >;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ---------------------------------------------------- recognition provider

/**
 * Browser Web Speech recognition.
 *
 * Browsers expose no way to enumerate the locales their recogniser supports, so
 * `capabilityFor` reports `native` when the engine exists and the language has
 * broad platform support, `fallback` when we would have to request a related
 * locale, and only `unavailable` when the API is missing entirely. Any runtime
 * failure surfaces as an error the companion explains in words.
 */
class BrowserSpeechRecognitionProvider implements SpeechRecognitionProvider {
  readonly id = 'browser-web-speech';
  private instance: BrowserSpeechRecognition | null = null;

  isSupported(): boolean {
    return getRecognitionCtor() !== null;
  }

  capabilityFor(language: LanguageCode): CapabilityLevel {
    if (!this.isSupported()) return 'unavailable';
    const def = getLanguage(language);
    if (def.voiceExpectation === 'likely') return 'native';
    if (def.voiceExpectation === 'limited') return 'fallback';
    return def.speechRecognitionFallbackLocale ? 'fallback' : 'unavailable';
  }

  private localeFor(language: LanguageCode): string {
    const def = getLanguage(language);
    return this.capabilityFor(language) === 'native'
      ? def.speechRecognitionLocale
      : def.speechRecognitionFallbackLocale ?? def.speechRecognitionLocale;
  }

  start(language: LanguageCode, handlers: RecognitionHandlers): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      handlers.onError('not-supported');
      handlers.onEnd();
      return;
    }

    this.stop();

    let recognition: BrowserSpeechRecognition;
    try {
      recognition = new Ctor();
    } catch {
      handlers.onError('unknown');
      handlers.onEnd();
      return;
    }

    recognition.lang = this.localeFor(language);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alternative = result[0];
        if (!alternative) continue;
        handlers.onResult({
          transcript: alternative.transcript,
          confidence: alternative.confidence ?? 0.5,
          isFinal: result.isFinal,
        });
      }
    };

    recognition.onerror = (event) => {
      const map: Record<string, RecognitionErrorCode> = {
        'not-allowed': 'permission-denied',
        'service-not-allowed': 'permission-denied',
        'no-speech': 'no-speech',
        network: 'network',
        aborted: 'aborted',
        'language-not-supported': 'not-supported',
      };
      handlers.onError(map[event.error] ?? 'unknown');
    };

    recognition.onend = () => {
      this.instance = null;
      handlers.onEnd();
    };

    this.instance = recognition;
    try {
      recognition.start();
    } catch {
      // Chrome throws InvalidStateError if start() is called while already
      // running; treating it as an abort keeps the UI state machine honest.
      this.instance = null;
      handlers.onError('aborted');
      handlers.onEnd();
    }
  }

  stop(): void {
    if (!this.instance) return;
    try {
      this.instance.abort();
    } catch {
      /* already stopped */
    }
    this.instance = null;
  }
}

// ----------------------------------------------------------- TTS provider

class BrowserTextToSpeechProvider implements TextToSpeechProvider {
  readonly id = 'browser-speech-synthesis';

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private voices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    try {
      return window.speechSynthesis.getVoices();
    } catch {
      return [];
    }
  }

  /** Unlike recognition, synthesis voices *can* be enumerated — so we do. */
  private findVoice(locale: string): SpeechSynthesisVoice | null {
    const voices = this.voices();
    const target = locale.toLowerCase();
    const exact = voices.find((v) => v.lang.toLowerCase() === target);
    if (exact) return exact;
    const base = target.split('-')[0];
    return voices.find((v) => v.lang.toLowerCase().startsWith(base)) ?? null;
  }

  capabilityFor(language: LanguageCode): CapabilityLevel {
    if (!this.isSupported()) return 'unavailable';
    const def = getLanguage(language);
    if (this.findVoice(def.speechSynthesisLocale)) return 'native';
    if (def.speechSynthesisFallbackLocale && this.findVoice(def.speechSynthesisFallbackLocale)) {
      return 'fallback';
    }
    return 'unavailable';
  }

  private localeFor(language: LanguageCode): string | null {
    const def = getLanguage(language);
    if (this.findVoice(def.speechSynthesisLocale)) return def.speechSynthesisLocale;
    if (def.speechSynthesisFallbackLocale && this.findVoice(def.speechSynthesisFallbackLocale)) {
      return def.speechSynthesisFallbackLocale;
    }
    return null;
  }

  speak(text: string, language: LanguageCode, options?: SpeakOptions): void {
    if (!this.isSupported() || !text.trim()) {
      options?.onEnd?.();
      return;
    }
    const locale = this.localeFor(language);
    if (!locale) {
      // No voice for this language: the caller still shows the caption, which
      // is why every companion response is written on screen as well.
      options?.onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this.findVoice(locale);
      if (voice) utterance.voice = voice;
      utterance.lang = locale;
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = 1;
      utterance.onstart = () => options?.onStart?.();
      utterance.onend = () => options?.onEnd?.();
      utterance.onerror = () => options?.onEnd?.();
      window.speechSynthesis.speak(utterance);
    } catch {
      options?.onEnd?.();
    }
  }

  cancel(): void {
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

// ------------------------------------------------------------- registration

let recognitionProvider: SpeechRecognitionProvider = new BrowserSpeechRecognitionProvider();
let ttsProvider: TextToSpeechProvider = new BrowserTextToSpeechProvider();

/** Swap in a server-backed provider (Whisper etc.) without touching the UI. */
export function registerSpeechRecognitionProvider(provider: SpeechRecognitionProvider): void {
  recognitionProvider.stop();
  recognitionProvider = provider;
}

export function registerTextToSpeechProvider(provider: TextToSpeechProvider): void {
  ttsProvider.cancel();
  ttsProvider = provider;
}

export function getSpeechRecognitionProvider(): SpeechRecognitionProvider {
  return recognitionProvider;
}

export function getTextToSpeechProvider(): TextToSpeechProvider {
  return ttsProvider;
}

// ------------------------------------------------------------ facade calls

export function startListening(language: LanguageCode, handlers: RecognitionHandlers): void {
  recognitionProvider.start(language, handlers);
}

export function stopListening(): void {
  recognitionProvider.stop();
}

export function speak(text: string, language: LanguageCode, options?: SpeakOptions): void {
  ttsProvider.speak(text, language, options);
}

export function cancelSpeech(): void {
  ttsProvider.cancel();
}

export function detectCapability(language: LanguageCode): VoiceCapability {
  const def = getLanguage(language);
  const recognition = recognitionProvider.capabilityFor(language);
  const synthesis = ttsProvider.capabilityFor(language);
  return {
    recognition,
    synthesis,
    recognitionLocale:
      recognition === 'native'
        ? def.speechRecognitionLocale
        : recognition === 'fallback'
          ? def.speechRecognitionFallbackLocale ?? def.speechRecognitionLocale
          : undefined,
    synthesisLocale:
      synthesis === 'native'
        ? def.speechSynthesisLocale
        : synthesis === 'fallback'
          ? def.speechSynthesisFallbackLocale
          : undefined,
  };
}

/** Speech-synthesis voices load asynchronously in Chrome; this waits for them. */
export function onVoicesReady(callback: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {};
  const handler = () => callback();
  try {
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Some browsers populate synchronously and never fire the event.
    if (window.speechSynthesis.getVoices().length > 0) callback();
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
  } catch {
    return () => {};
  }
}

export const SPEECH_RATES: Record<'slow' | 'normal' | 'fast', number> = {
  slow: 0.72,
  normal: 0.95,
  fast: 1.15,
};

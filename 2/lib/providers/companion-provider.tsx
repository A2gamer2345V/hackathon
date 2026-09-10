'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { SpeechSpeed, TextScale } from '@/lib/types';
import { INTENT_HIGHLIGHTS, INTENT_ROUTES, type Intent } from '@/lib/voice/intents';
import { parseCommand, type ParsedCommand } from '@/lib/voice/parser';
import {
  cancelSpeech,
  detectCapability,
  onVoicesReady,
  speak,
  SPEECH_RATES,
  startListening,
  stopListening,
  type RecognitionErrorCode,
  type VoiceCapability,
} from '@/lib/voice/speech';
import { formatTime, nowMinutes, timeToMinutes } from '@/lib/utils/datetime';
import { makeId } from '@/lib/utils';
import { useLanguage } from './language-provider';
import { useAppState } from './app-state-provider';
import type { TranslationKey } from '@/lib/i18n';

/**
 * The Care Companion.
 *
 * It is the single place where spoken and typed commands are turned into
 * actions. Both paths call `runCommand`, which only ever acts on a value from
 * the fixed `Intent` union — raw transcript text never reaches the router or
 * application state.
 *
 * Everything the companion says is also written to `caption` and to `history`,
 * so a device with no voice for the chosen language loses no information.
 */

export type CompanionState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'pointing'
  | 'encouraging'
  | 'help';

export interface CompanionMessage {
  id: string;
  from: 'companion' | 'user';
  text: string;
  at: number;
}

interface SayOptions {
  /** Visual mood while the line is delivered. */
  state?: CompanionState;
  /** Open the companion panel so the caption is visible. */
  reveal?: boolean;
  /** Suppress speech even when voice guidance is on (e.g. page ambience). */
  silent?: boolean;
}

interface CompanionContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;

  state: CompanionState;
  caption: string;
  history: CompanionMessage[];
  transcript: string;
  highlight: string | null;

  capability: VoiceCapability;
  voiceSupported: boolean;
  speechSupported: boolean;
  listening: boolean;
  micError: RecognitionErrorCode | null;

  muted: boolean;
  toggleMuted: () => void;

  startVoice: () => void;
  stopVoice: () => void;
  /** Shared entry point for typed commands — same pipeline as voice. */
  submitText: (text: string) => void;
  say: (text: string, options?: SayOptions) => void;
  /** Convenience for game feedback: shows the encouraging pose. */
  encourage: (text: string) => void;
  clearHighlight: () => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

const RATE_FOR: Record<SpeechSpeed, number> = {
  slow: SPEECH_RATES.slow,
  normal: SPEECH_RATES.normal,
  fast: SPEECH_RATES.fast,
};

const NEXT_TEXT_SCALE: Record<TextScale, TextScale> = {
  normal: 'large',
  large: 'xlarge',
  xlarge: 'xlarge',
};

/** Spoken acknowledgement for each navigational intent. */
const INTENT_REPLY: Partial<Record<Intent, TranslationKey>> = {
  OPEN_GAMES: 'companion.say.openingGames',
  OPEN_MEMORY_GAMES: 'companion.say.openingMemory',
  OPEN_ATTENTION_GAMES: 'companion.say.openingAttention',
  OPEN_REMINDERS: 'companion.say.openingReminders',
  OPEN_MY_DAY: 'companion.say.openingMyDay',
  OPEN_PROGRESS: 'companion.say.openingProgress',
  OPEN_PLANNER: 'companion.say.openingPlanner',
  OPEN_SETTINGS: 'companion.say.openingSettings',
  OPEN_CARE_CIRCLE: 'companion.say.callCaregiver',
  OPEN_HOME: 'companion.say.goingHome',
};

export function CompanionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, definition } = useLanguage();
  const { patient, accessibility, reminders, updateAccessibility, updatePatient } = useAppState();

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CompanionState>('idle');
  const [caption, setCaption] = useState('');
  const [history, setHistory] = useState<CompanionMessage[]>([]);
  const [transcript, setTranscript] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<RecognitionErrorCode | null>(null);
  const [capability, setCapability] = useState<VoiceCapability>({
    recognition: 'unavailable',
    synthesis: 'unavailable',
  });

  const lastSpokenRef = useRef('');
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const muted = !accessibility.voiceGuidance;
  const rate = RATE_FOR[patient?.speechSpeed ?? 'normal'];

  // Capability depends on the language *and* on voices arriving asynchronously.
  useEffect(() => {
    const refresh = () => setCapability(detectCapability(language));
    refresh();
    return onVoicesReady(refresh);
  }, [language]);

  useEffect(
    () => () => {
      if (stateTimer.current) clearTimeout(stateTimer.current);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      stopListening();
      cancelSpeech();
    },
    [],
  );

  const pushMessage = useCallback((from: CompanionMessage['from'], text: string) => {
    setHistory((current) => [...current.slice(-11), { id: makeId('msg'), from, text, at: Date.now() }]);
  }, []);

  const settle = useCallback((delay = 2200) => {
    if (stateTimer.current) clearTimeout(stateTimer.current);
    stateTimer.current = setTimeout(() => setState('idle'), delay);
  }, []);

  const say = useCallback(
    (text: string, options?: SayOptions) => {
      if (!text) return;
      lastSpokenRef.current = text;
      setCaption(text);
      pushMessage('companion', text);
      if (options?.reveal) setOpen(true);

      const pose = options?.state ?? 'speaking';
      setState(pose);

      if (muted || options?.silent) {
        settle();
        return;
      }

      speak(text, language, {
        rate,
        onStart: () => setState(pose),
        onEnd: () => settle(600),
      });
      // Guard against providers that never fire onEnd (no voice installed).
      settle(Math.max(2600, text.length * 70));
    },
    [language, muted, pushMessage, rate, settle],
  );

  const encourage = useCallback(
    (text: string) => say(text, { state: 'encouraging' }),
    [say],
  );

  const flashHighlight = useCallback((target: string) => {
    setHighlight(target);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(null), 2600);
  }, []);

  const clearHighlight = useCallback(() => setHighlight(null), []);

  const nextReminder = useCallback(() => {
    const minutes = nowMinutes();
    const pending = reminders
      .filter((r) => r.status === 'pending')
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return pending.find((r) => timeToMinutes(r.time) >= minutes) ?? pending[0] ?? null;
  }, [reminders]);

  /**
   * The only bridge between recognised text and the application. It receives a
   * parsed intent, never a transcript, and each branch is an explicit action.
   */
  const runCommand = useCallback(
    (parsed: ParsedCommand) => {
      const intent = parsed.intent;

      const route = INTENT_ROUTES[intent];
      const target = INTENT_HIGHLIGHTS[intent];
      if (target) flashHighlight(target);

      switch (intent) {
        case 'OPEN_HOME':
        case 'OPEN_GAMES':
        case 'OPEN_MEMORY_GAMES':
        case 'OPEN_ATTENTION_GAMES':
        case 'OPEN_MY_DAY':
        case 'OPEN_REMINDERS':
        case 'OPEN_PROGRESS':
        case 'OPEN_PLANNER':
        case 'OPEN_SETTINGS':
        case 'OPEN_CARE_CIRCLE': {
          if (route) router.push(route);
          const key = INTENT_REPLY[intent];
          say(key ? t(key) : t('companion.highlighted'), { state: 'pointing' });
          return;
        }

        case 'START_RECOMMENDED': {
          router.push('/app/planner');
          say(t('companion.say.openingPlanner'), { state: 'pointing' });
          return;
        }

        case 'NEXT_REMINDER': {
          const reminder = nextReminder();
          if (!reminder) {
            say(t('companion.say.noReminders'), { state: 'encouraging' });
            return;
          }
          say(
            t('companion.say.nextReminder', {
              title: reminder.title,
              time: formatTime(reminder.time),
            }),
          );
          return;
        }

        case 'GO_BACK': {
          router.back();
          say(t('companion.say.goingBack'), { state: 'pointing' });
          return;
        }

        case 'REPEAT': {
          const previous = lastSpokenRef.current || t('companion.say.help');
          say(previous);
          return;
        }

        case 'SLOWER_SPEECH': {
          updatePatient({ speechSpeed: 'slow' });
          say(t('companion.say.slower'));
          return;
        }

        case 'FASTER_SPEECH': {
          updatePatient({ speechSpeed: 'fast' });
          say(t('companion.say.faster'));
          return;
        }

        case 'LARGER_TEXT': {
          updateAccessibility({ textScale: NEXT_TEXT_SCALE[accessibility.textScale] });
          say(t('companion.say.largerText'));
          return;
        }

        case 'HIGH_CONTRAST': {
          updateAccessibility({ highContrast: true });
          say(t('companion.say.contrast'));
          return;
        }

        case 'STOP_SPEAKING': {
          cancelSpeech();
          setState('idle');
          setCaption('');
          return;
        }

        case 'HELP': {
          say(t('companion.say.help'), { state: 'help', reveal: true });
          return;
        }

        case 'UNKNOWN':
        default: {
          say(t('companion.notUnderstood'), { state: 'help', reveal: true });
        }
      }
    },
    [
      accessibility.textScale,
      flashHighlight,
      nextReminder,
      router,
      say,
      t,
      updateAccessibility,
      updatePatient,
    ],
  );

  const handleCommandText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      pushMessage('user', trimmed);
      setTranscript(trimmed);
      setState('thinking');
      // A brief pause reads as consideration rather than a jump-cut.
      window.setTimeout(() => runCommand(parseCommand(trimmed, language)), 380);
    },
    [language, pushMessage, runCommand],
  );

  const stopVoice = useCallback(() => {
    stopListening();
    setListening(false);
    setState('idle');
  }, []);

  const startVoice = useCallback(() => {
    if (listening) {
      stopVoice();
      return;
    }

    setMicError(null);
    setOpen(true);

    if (capability.recognition === 'unavailable') {
      setMicError('not-supported');
      say(t('companion.voiceUnavailable', { language: definition.nativeName }), {
        state: 'help',
        reveal: true,
      });
      return;
    }

    cancelSpeech();
    setTranscript('');
    setListening(true);
    setState('listening');

    let finalTranscript = '';

    startListening(language, {
      onResult: ({ transcript: text, isFinal }) => {
        setTranscript(text);
        if (isFinal) finalTranscript = text;
      },
      onError: (code) => {
        setMicError(code);
        if (code === 'permission-denied') say(t('companion.micDenied'), { state: 'help' });
        else if (code === 'not-supported') {
          say(t('companion.voiceUnavailable', { language: definition.nativeName }), {
            state: 'help',
          });
        }
      },
      onEnd: () => {
        setListening(false);
        const heard = finalTranscript.trim();
        if (heard) handleCommandText(heard);
        else setState((current) => (current === 'listening' ? 'idle' : current));
      },
    });
  }, [
    capability.recognition,
    definition.nativeName,
    handleCommandText,
    language,
    listening,
    say,
    stopVoice,
    t,
  ]);

  const submitText = useCallback(
    (text: string) => {
      cancelSpeech();
      handleCommandText(text);
    },
    [handleCommandText],
  );

  const toggleMuted = useCallback(() => {
    const next = !accessibility.voiceGuidance;
    updateAccessibility({ voiceGuidance: next });
    if (!next) cancelSpeech();
  }, [accessibility.voiceGuidance, updateAccessibility]);

  // Moving to another page ends whatever the companion was doing. The pose and
  // highlight are adjusted during render — the pattern React documents for
  // "state that depends on a prop" — so the reset lands in the same render as
  // the navigation instead of causing a second pass.
  const [routeAt, setRouteAt] = useState(pathname);
  if (routeAt !== pathname) {
    setRouteAt(pathname);
    setHighlight(null);
    setState('idle');
  }

  // Stopping the speech synthesiser is a real side effect, so it stays here.
  useEffect(() => {
    cancelSpeech();
  }, [pathname]);

  const value = useMemo<CompanionContextValue>(
    () => ({
      open,
      setOpen,
      toggleOpen: () => setOpen((v) => !v),
      state,
      caption,
      history,
      transcript,
      highlight,
      capability,
      voiceSupported: capability.recognition !== 'unavailable',
      speechSupported: capability.synthesis !== 'unavailable',
      listening,
      micError,
      muted,
      toggleMuted,
      startVoice,
      stopVoice,
      submitText,
      say,
      encourage,
      clearHighlight,
    }),
    [
      caption,
      capability,
      clearHighlight,
      encourage,
      highlight,
      history,
      listening,
      micError,
      muted,
      open,
      say,
      startVoice,
      state,
      stopVoice,
      submitText,
      toggleMuted,
      transcript,
    ],
  );

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanion must be used inside <CompanionProvider>');
  return ctx;
}

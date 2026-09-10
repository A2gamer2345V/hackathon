'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, makeId } from '@/lib/utils';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useFormats } from '@/lib/hooks/use-formats';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';
import { isActiveOn, minutesOfTime } from '@/lib/utils/reminders';
import { CARE_ROUTES, type CareIntent } from '@/lib/voice/care-intents';
import { parseCareCommand } from '@/lib/voice/care-parser';
import { normaliseTranscript } from '@/lib/voice/parser';
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
import type { TranslationKey } from '@/lib/i18n';

/**
 * The Care Assistant — the caregiver's side of the companion.
 *
 * It is a different job from the patient's companion and is built separately on
 * purpose. The patient companion coaxes: it encourages, slows its own speech,
 * makes the text bigger. This one answers questions about a record — what
 * happened today, what is due next, whether anything needs attention — and moves
 * between screens. Sharing one component would have meant one of the two
 * audiences getting the other's manners.
 *
 * What it is not: it does not interpret, advise or diagnose. Every answer below
 * is a count or a time read back off data already on screen, in the same words
 * the screens themselves use. Where it summarises a day it says what the app
 * recorded and nothing about what that might mean — that judgement belongs to
 * the caregiver, who knows the person, and to their clinician.
 *
 * Recognised text never reaches the router or application state. It is resolved
 * to a `CareIntent` first, and the one intent that carries free text —
 * "switch to <name>" — resolves that text against the roster the server already
 * returned, so it can only ever land on a patient this caregiver owns.
 */

interface Message {
  id: string;
  from: 'assistant' | 'user';
  text: string;
  at: number;
}

/**
 * The example chips.
 *
 * Each carries its intent rather than its words. Tapping one dispatches that
 * intent directly instead of feeding the translated label back through a parser
 * that only reads a handful of languages — otherwise the chips would work in
 * English and quietly fail in Mizo, which is exactly the sort of thing that
 * looks fine in a demo and is useless to the people it was built for.
 */
const SUGGESTIONS: { key: TranslationKey; intent: CareIntent }[] = [
  { key: 'care.assistant.example.summary', intent: 'CARE_SUMMARY' },
  { key: 'care.assistant.example.next', intent: 'CARE_NEXT_REMINDER' },
  { key: 'care.assistant.example.alerts', intent: 'CARE_ALERT_COUNT' },
  { key: 'care.assistant.example.insights', intent: 'CARE_INSIGHTS' },
  { key: 'care.assistant.example.who', intent: 'CARE_WHO' },
  { key: 'care.assistant.example.help', intent: 'CARE_HELP' },
];

const HISTORY_LIMIT = 11;

export function CareAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, definition } = useTranslation();
  const formats = useFormats();
  const motionOk = useMotionOk();
  const {
    patient,
    patients,
    activities,
    reminders,
    sessions,
    alerts,
    selectPatient,
    accessibility,
    updateAccessibility,
  } = useAppState();

  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [caption, setCaption] = useState('');
  const [draft, setDraft] = useState('');
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [micError, setMicError] = useState<RecognitionErrorCode | null>(null);
  const [capability, setCapability] = useState<VoiceCapability>({
    recognition: 'unavailable',
    synthesis: 'unavailable',
  });

  const lastSaidRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Muting rides on the same preference as the patient companion, so a caregiver
  // who has turned voice off once has turned it off everywhere.
  const muted = !accessibility.voiceGuidance;

  useEffect(() => {
    const refresh = () => setCapability(detectCapability(language));
    refresh();
    return onVoicesReady(refresh);
  }, [language]);

  useEffect(
    () => () => {
      stopListening();
      cancelSpeech();
    },
    [],
  );

  useEffect(() => {
    cancelSpeech();
  }, [pathname]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Keep the newest exchange in view. Jumps rather than glides when the reader
  // has asked for reduced motion.
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTo({ top: log.scrollHeight, behavior: motionOk ? 'smooth' : 'auto' });
  }, [history, thinking, motionOk]);

  const push = useCallback((from: Message['from'], text: string) => {
    setHistory((current) => [
      ...current.slice(-HISTORY_LIMIT),
      { id: makeId('care-msg'), from, text, at: Date.now() },
    ]);
  }, []);

  const say = useCallback(
    (text: string) => {
      if (!text) return;
      lastSaidRef.current = text;
      setCaption(text);
      push('assistant', text);
      if (muted) return;
      speak(text, language, { rate: SPEECH_RATES.normal });
    },
    [language, muted, push],
  );

  // ------------------------------------------------------------- the answers

  const firstName = patient?.name.split(' ')[0] ?? '';

  /** The next reminder still due, by the same rule the reminder screens use. */
  const nextReminder = useCallback(() => {
    const today = formats.today();
    const weekday = formats.todayWeekday();
    const now = formats.nowMinutes();
    const due = reminders
      .filter((r) => r.status === 'pending' && isActiveOn(r, today, weekday))
      .sort((a, b) => minutesOfTime(a.time) - minutesOfTime(b.time));
    return due.find((r) => minutesOfTime(r.time) >= now) ?? due[0] ?? null;
  }, [formats, reminders]);

  /**
   * Today, in counts.
   *
   * Only runs played to the end are counted as played — a puzzle someone opened
   * and put down is reported separately or not at all, never as a poor result.
   */
  const summarise = useCallback(() => {
    if (!patient) return t('care.assistant.say.noPatient');
    const today = formats.today();
    const done = activities.filter((a) => a.completed).length;
    const played = sessions.filter(
      (s) => s.state === 'completed' && formats.dateOf(s.completedAt) === today,
    ).length;
    const weekday = formats.todayWeekday();
    const dueToday = reminders.filter((r) => isActiveOn(r, today, weekday));
    const taken = dueToday.filter((r) => r.status === 'completed').length;

    return t('care.assistant.say.summary', {
      name: firstName,
      done,
      total: activities.length,
      played,
      taken,
      due: dueToday.length,
    });
  }, [activities, firstName, formats, patient, reminders, sessions, t]);

  /**
   * Finds a patient by whatever the caregiver called them.
   *
   * The text is matched against the roster only. A name that matches nobody
   * returns null and the assistant says so — it never falls back to "the closest
   * one", because quietly switching a caregiver to the wrong person's record is
   * the single worst thing this feature could do.
   */
  const findPatient = useCallback(
    (spoken: string) => {
      const needle = normaliseTranscript(spoken);
      if (!needle) return null;
      const roster = patients.map((p) => ({ p, name: normaliseTranscript(p.name) }));
      return (
        roster.find((entry) => entry.name === needle)?.p ??
        roster.find((entry) => entry.name.split(' ').includes(needle))?.p ??
        roster.find((entry) => entry.name.startsWith(needle))?.p ??
        null
      );
    },
    [patients],
  );

  /**
   * The one place an intent turns into an action.
   *
   * Every branch is written out by hand and takes no input beyond the intent and,
   * for one case, a name that is resolved against the roster first. Nothing
   * recognised or typed reaches the router directly.
   */
  const execute = useCallback(
    (intent: CareIntent, argument?: string) => {
      const route = CARE_ROUTES[intent];

      if (route) {
        router.push(route);
        const label = SCREEN_LABEL[intent];
        say(label ? t('care.assistant.say.opening', { screen: t(label) }) : t('care.assistant.say.back'));
        return;
      }

      switch (intent) {
        case 'CARE_SUMMARY': {
          say(summarise());
          return;
        }

        case 'CARE_NEXT_REMINDER': {
          if (!patient) {
            say(t('care.assistant.say.noPatient'));
            return;
          }
          const reminder = nextReminder();
          say(
            reminder
              ? t('care.assistant.say.nextReminder', {
                  name: firstName,
                  title: reminder.title,
                  time: formats.wallTime(reminder.time),
                })
              : t('care.assistant.say.noReminders', { name: firstName }),
          );
          return;
        }

        case 'CARE_ALERT_COUNT': {
          const unread = alerts.filter((a) => !a.acknowledged);
          if (unread.length === 0) {
            say(t('care.assistant.say.noAlerts', { name: firstName }));
            return;
          }
          say(
            // No plural machinery in the dictionary, so the two shapes are two
            // strings. "1 unread alerts" reads like a bug and undermines trust
            // in every other number the assistant reports.
            t(unread.length === 1 ? 'care.assistant.say.alertsOne' : 'care.assistant.say.alerts', {
              count: unread.length,
              name: firstName,
              detail: unread[0].detail,
            }),
          );
          return;
        }

        case 'CARE_WHO': {
          say(
            patient
              ? t('care.assistant.say.viewing', {
                  name: patient.name,
                  zone: patient.timezone,
                  count: patients.length,
                })
              : t('care.assistant.say.noPatient'),
          );
          return;
        }

        case 'CARE_SWITCH_PATIENT': {
          const target = argument ? findPatient(argument) : null;
          if (!target) {
            say(
              t('care.assistant.say.noSuchPatient', {
                names: patients.map((p) => p.name).join(', ') || t('care.assistant.say.nobody'),
              }),
            );
            return;
          }
          if (target.id === patient?.id) {
            say(t('care.assistant.say.alreadyViewing', { name: target.name }));
            return;
          }
          selectPatient(target.id);
          say(t('care.assistant.say.switched', { name: target.name }));
          return;
        }

        case 'CARE_BACK': {
          router.back();
          say(t('care.assistant.say.back'));
          return;
        }

        case 'CARE_REPEAT': {
          say(lastSaidRef.current || t('care.assistant.say.help'));
          return;
        }

        case 'CARE_STOP': {
          cancelSpeech();
          setCaption('');
          return;
        }

        case 'CARE_HELP': {
          say(t('care.assistant.say.help'));
          return;
        }

        case 'UNKNOWN':
        default: {
          say(t('care.assistant.say.notUnderstood'));
        }
      }
    },
    [
      alerts,
      findPatient,
      firstName,
      formats,
      nextReminder,
      patient,
      patients,
      router,
      say,
      selectPatient,
      summarise,
      t,
    ],
  );

  const run = useCallback(
    (text: string) => {
      const parsed = parseCareCommand(text);
      execute(parsed.intent, parsed.argument);
    },
    [execute],
  );

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      cancelSpeech();
      push('user', trimmed);
      setTranscript('');
      setThinking(true);
      window.setTimeout(() => {
        setThinking(false);
        run(trimmed);
      }, 320);
    },
    [push, run],
  );

  /** A tapped example: show its words, then act on the intent it carries. */
  const tapSuggestion = useCallback(
    (label: string, intent: CareIntent) => {
      cancelSpeech();
      push('user', label);
      setThinking(true);
      window.setTimeout(() => {
        setThinking(false);
        execute(intent);
      }, 320);
    },
    [execute, push],
  );

  const stopVoice = useCallback(() => {
    stopListening();
    setListening(false);
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
      say(t('companion.voiceUnavailable', { language: definition.nativeName }));
      return;
    }

    cancelSpeech();
    setTranscript('');
    setListening(true);

    let heard = '';
    startListening(language, {
      onResult: ({ transcript: text, isFinal }) => {
        setTranscript(text);
        if (isFinal) heard = text;
      },
      onError: (code) => setMicError(code),
      onEnd: () => {
        setListening(false);
        if (heard.trim()) submit(heard);
      },
    });
  }, [capability.recognition, definition.nativeName, language, listening, say, stopVoice, submit, t]);

  const voiceSupported = capability.recognition !== 'unavailable';
  const speechSupported = capability.synthesis !== 'unavailable';

  const status = useMemo(() => {
    if (listening) return t('companion.state.listening');
    if (thinking) return t('companion.state.thinking');
    return t('care.assistant.ready');
  }, [listening, t, thinking]);

  return (
    <>
      {/* -------------------------------------------------------- launcher */}
      <div
        className={cn(
          'no-print fixed right-4 z-40 sm:right-6',
          'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6',
          open && 'pointer-events-none opacity-0',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-label={t('care.assistant.open')}
          className="group flex items-center gap-2.5 rounded-full border-2 border-lilac-200 bg-surface-raised py-2 pl-3 pr-4 shadow-lift transition-colors hover:border-lilac-400 hover:bg-lilac-50"
        >
          <span className="grid size-10 place-items-center rounded-full bg-lilac-100 text-lilac-600">
            <Bot aria-hidden className="size-6" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-bold text-ink">{t('care.assistant.name')}</span>
            <span className="block text-xs text-ink-soft">{t('care.assistant.askMe')}</span>
          </span>
        </button>
      </div>

      {/* ----------------------------------------------------------- panel */}
      <AnimatePresence>
        {open ? (
          <motion.div
            key="care-assistant-panel"
            role="dialog"
            aria-label={t('care.assistant.name')}
            initial={motionOk ? { opacity: 0, y: 24 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOk ? { opacity: 0, y: 24 } : { opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'no-print fixed z-50 flex flex-col overflow-hidden border border-line bg-surface-raised shadow-lift',
              'inset-x-0 bottom-0 max-h-[80dvh] rounded-t-[24px] pb-[env(safe-area-inset-bottom)]',
              'sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem] sm:rounded-[24px]',
            )}
          >
            <header className="flex items-start gap-3 border-b border-line bg-lilac-50 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lilac-100 text-lilac-600">
                <Bot aria-hidden className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-ink">
                  {t('care.assistant.name')}
                </p>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-lilac-600">
                  {listening ? (
                    <span aria-hidden className="flex items-end gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            'block h-3 w-1 rounded-full bg-lilac-500',
                            motionOk && 'animate-listen-bar',
                          )}
                          style={{ animationDelay: `${i * 130}ms` }}
                        />
                      ))}
                    </span>
                  ) : null}
                  {status}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateAccessibility({ voiceGuidance: muted })}
                  aria-pressed={muted}
                  aria-label={muted ? t('companion.unmute') : t('companion.mute')}
                  title={muted ? t('companion.unmute') : t('companion.mute')}
                  className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-lilac-100"
                >
                  {muted ? (
                    <VolumeX aria-hidden className="size-5" />
                  ) : (
                    <Volume2 aria-hidden className="size-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('companion.close')}
                  className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-lilac-100"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
            </header>

            <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <h2 className="sr-only">{t('companion.captions')}</h2>

              {history.length === 0 ? (
                <p className="rounded-[var(--radius-control)] bg-lilac-50 p-3.5 text-base text-ink">
                  {patient
                    ? t('care.assistant.intro', { name: patient.name })
                    : t('care.assistant.askMe')}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {history.map((message) => (
                    <li
                      key={message.id}
                      className={cn(
                        'max-w-[92%] rounded-[16px] px-3.5 py-2.5 text-base',
                        message.from === 'assistant'
                          ? 'bg-lilac-50 text-ink'
                          : 'ml-auto bg-surface-sunken text-ink',
                      )}
                    >
                      <span className="sr-only">
                        {message.from === 'assistant' ? `${t('care.assistant.name')}: ` : ''}
                      </span>
                      {message.text}
                    </li>
                  ))}
                </ul>
              )}

              <p aria-live="polite" className="sr-only">
                {caption}
              </p>

              {listening && transcript ? (
                <p className="rounded-[16px] border border-dashed border-lilac-300 px-3.5 py-2.5 text-base italic text-ink-soft">
                  {transcript}
                </p>
              ) : null}

              {micError === 'permission-denied' ? (
                <p
                  role="alert"
                  className="rounded-[var(--radius-control)] bg-warning-soft p-3 text-sm font-semibold text-warning"
                >
                  {t('companion.micDenied')}
                </p>
              ) : null}

              {/* Said plainly rather than hidden: a caregiver should know the
                  microphone is unavailable for this language before they need it. */}
              {!voiceSupported ? (
                <p className="rounded-[var(--radius-control)] bg-surface-sunken p-3 text-sm text-ink-soft">
                  {t('companion.voiceUnavailable', { language: definition.nativeName })}
                </p>
              ) : null}

              {!speechSupported && !muted ? (
                <p className="rounded-[var(--radius-control)] bg-surface-sunken p-3 text-sm text-ink-soft">
                  {t('companion.ttsUnavailable', { language: definition.nativeName })}
                </p>
              ) : null}

              <div>
                <p className="mb-2 mt-1 text-sm font-semibold text-ink-soft">
                  {t('companion.tryThese')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(({ key, intent }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => tapSuggestion(t(key), intent)}
                      className="inline-flex min-h-[2.75rem] items-center rounded-full border border-lilac-200 bg-lilac-50 px-3.5 py-2 text-sm font-semibold text-lilac-600 hover:bg-lilac-100"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Always shown, not tucked behind a link. A caregiver reading
                  numbers back off a screen should be told, every time, what
                  those numbers are and are not. */}
              <p className="rounded-[var(--radius-control)] bg-surface-sunken p-3 text-sm text-ink-soft">
                {t('care.assistant.notADiagnosis')}
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const text = draft.trim();
                if (!text) return;
                setDraft('');
                submit(text);
              }}
              className="flex items-end gap-2 border-t border-line bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <label htmlFor="care-assistant-input" className="sr-only">
                  {t('companion.typeHere')}
                </label>
                <input
                  id="care-assistant-input"
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t('care.assistant.typeHere')}
                  autoComplete="off"
                  className="w-full rounded-[var(--radius-control)] border border-line-strong bg-surface-raised px-4 py-3 text-base text-ink placeholder:text-ink-muted/70 focus:border-lilac-500"
                />
              </div>
              <Button type="submit" size="md" aria-label={t('companion.send')} className="px-4">
                <Send aria-hidden className="size-5" />
              </Button>
              <Button
                type="button"
                size="md"
                variant={listening ? 'primary' : 'secondary'}
                onClick={startVoice}
                aria-pressed={listening}
                aria-label={listening ? t('companion.stopListening') : t('companion.speak')}
                className="px-4"
              >
                {voiceSupported ? (
                  <Mic aria-hidden className="size-5" />
                ) : (
                  <MicOff aria-hidden className="size-5" />
                )}
              </Button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** What each navigational intent is called when the assistant says it out loud. */
const SCREEN_LABEL: Partial<Record<CareIntent, TranslationKey>> = {
  CARE_DASHBOARD: 'nav.dashboard',
  CARE_ACTIVITY: 'nav.activity',
  CARE_PROGRESS: 'nav.progress',
  CARE_INSIGHTS: 'nav.insights',
  CARE_PERFORMANCE: 'nav.performance',
  CARE_ALERTS: 'nav.alerts',
  CARE_REMINDERS: 'nav.reminders',
  CARE_PATIENTS: 'nav.patients',
  CARE_FAMILY: 'nav.family',
  CARE_PROFILE: 'nav.patientProfile',
  CARE_SETTINGS: 'nav.settings',
};

'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircleQuestion, Send, Volume2, VolumeX, X } from 'lucide-react';
import { CompanionCharacter } from './companion-character';
import { VoiceButton } from './voice-button';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCompanion } from '@/lib/providers/companion-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { useMotionOk } from '@/lib/hooks/use-motion-ok';
import type { TranslationKey } from '@/lib/i18n';

/**
 * The floating Care Companion.
 *
 * Bottom-right on desktop; on small screens it sits above the bottom navigation
 * and opens as a sheet, so it never covers the content or the nav bar. Every
 * spoken line is also printed here — the panel is the caption track.
 */

const SUGGESTIONS: TranslationKey[] = [
  'command.example.games',
  'command.example.reminders',
  'command.example.medicine',
  'command.example.home',
  'command.example.slower',
  'command.example.help',
];

const STATE_LABEL: Record<string, TranslationKey> = {
  idle: 'companion.state.idle',
  listening: 'companion.state.listening',
  thinking: 'companion.state.thinking',
  speaking: 'companion.state.speaking',
  pointing: 'companion.state.speaking',
  encouraging: 'companion.state.speaking',
  help: 'companion.state.idle',
};

export function CompanionDock() {
  const { t, definition } = useTranslation();
  const motionOk = useMotionOk();
  const {
    open,
    setOpen,
    state,
    caption,
    history,
    transcript,
    listening,
    micError,
    muted,
    toggleMuted,
    submitText,
    voiceSupported,
    speechSupported,
    highlight,
  } = useCompanion();

  const [draft, setDraft] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Point at the control the companion just used, so the route is learnable.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const nodes = document.querySelectorAll<HTMLElement>('[data-companion-target]');
    nodes.forEach((node) => {
      if (highlight && node.dataset.companionTarget === highlight) {
        node.dataset.companionHighlight = 'true';
      } else {
        delete node.dataset.companionHighlight;
      }
    });
  }, [highlight]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    submitText(text);
  };

  return (
    <>
      {/* ------------------------------------------------------- launcher */}
      <div
        className={cn(
          'no-print fixed right-4 z-40 sm:right-6',
          // clears the mobile bottom nav; sits low on larger screens
          'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6',
          open && 'pointer-events-none opacity-0',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-label={t('companion.open')}
          className="group flex items-center gap-2 rounded-full border-2 border-sage-200 bg-surface-raised py-1.5 pl-1.5 pr-4 shadow-lift transition-colors hover:border-sage-400 hover:bg-sage-50"
        >
          <span className="grid size-14 place-items-center rounded-full bg-sage-100">
            <CompanionCharacter state={state} size={46} />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-bold text-ink">{t('companion.name')}</span>
            <span className="block text-xs text-ink-soft">{t('companion.askMe')}</span>
          </span>
        </button>
      </div>

      {/* ---------------------------------------------------------- panel */}
      <AnimatePresence>
        {open ? (
          <motion.div
            key="companion-panel"
            ref={panelRef}
            role="dialog"
            aria-label={t('companion.name')}
            initial={motionOk ? { opacity: 0, y: 24 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOk ? { opacity: 0, y: 24 } : { opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'no-print fixed z-50 flex flex-col overflow-hidden border border-line bg-surface-raised shadow-lift',
              // mobile: sheet above the bottom nav; desktop: floating card
              'inset-x-0 bottom-0 max-h-[80dvh] rounded-t-[24px] pb-[env(safe-area-inset-bottom)]',
              'sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem] sm:rounded-[24px]',
            )}
          >
            <header className="flex items-start gap-3 border-b border-line bg-sage-50 p-4">
              <CompanionCharacter state={state} size={64} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-ink">
                  {t('companion.name')}
                </p>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-sage-700">
                  {listening ? (
                    <span aria-hidden className="flex items-end gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={cn('block h-3 w-1 rounded-full bg-lilac-500', motionOk && 'animate-listen-bar')}
                          style={{ animationDelay: `${i * 130}ms` }}
                        />
                      ))}
                    </span>
                  ) : null}
                  {t(STATE_LABEL[state] ?? 'companion.state.idle')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={toggleMuted}
                  aria-pressed={muted}
                  aria-label={muted ? t('companion.unmute') : t('companion.mute')}
                  title={muted ? t('companion.unmute') : t('companion.mute')}
                  className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-sage-100"
                >
                  {muted ? <VolumeX aria-hidden className="size-5" /> : <Volume2 aria-hidden className="size-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('companion.close')}
                  className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-sage-100"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
            </header>

            {/* captions + conversation */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <h2 className="sr-only">{t('companion.captions')}</h2>

              {history.length === 0 ? (
                <p className="rounded-[var(--radius-control)] bg-sage-50 p-3.5 text-base text-ink">
                  {caption || t('companion.askMe')}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {history.map((message) => (
                    <li
                      key={message.id}
                      className={cn(
                        'max-w-[92%] rounded-[16px] px-3.5 py-2.5 text-base',
                        message.from === 'companion'
                          ? 'bg-sage-50 text-ink'
                          : 'ml-auto bg-lilac-50 text-ink',
                      )}
                    >
                      <span className="sr-only">
                        {message.from === 'companion' ? `${t('companion.name')}: ` : ''}
                      </span>
                      {message.text}
                    </li>
                  ))}
                </ul>
              )}

              {/* live caption for screen readers and for anyone with sound off */}
              <p aria-live="polite" className="sr-only">
                {caption}
              </p>

              {listening && transcript ? (
                <p className="rounded-[16px] border border-dashed border-lilac-300 px-3.5 py-2.5 text-base italic text-ink-soft">
                  {transcript}
                </p>
              ) : null}

              {micError === 'permission-denied' ? (
                <p role="alert" className="rounded-[var(--radius-control)] bg-warning-soft p-3 text-sm font-semibold text-warning">
                  {t('companion.micDenied')}
                </p>
              ) : null}

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
                  {SUGGESTIONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => submitText(t(key))}
                      className="inline-flex min-h-[2.75rem] items-center rounded-full border border-sage-200 bg-sage-50 px-3.5 py-2 text-sm font-semibold text-sage-800 hover:bg-sage-100"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* input row — typing and speaking share one command pipeline */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="flex items-end gap-2 border-t border-line bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <label htmlFor="companion-input" className="sr-only">
                  {t('companion.typeHere')}
                </label>
                <input
                  id="companion-input"
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t('companion.typeHere')}
                  autoComplete="off"
                  className="w-full rounded-[var(--radius-control)] border border-line-strong bg-surface-raised px-4 py-3 text-base text-ink placeholder:text-ink-muted/70 focus:border-sage-500"
                />
              </div>
              <Button type="submit" size="md" aria-label={t('companion.send')} className="px-4">
                <Send aria-hidden className="size-5" />
              </Button>
              <VoiceButton showLabel={false} />
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Small inline prompt used on empty screens to point at the companion. */
export function CompanionHint({ text }: { text: string }) {
  const { setOpen } = useCompanion();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-lilac-200 bg-lilac-50 px-4 py-2.5 text-left text-sm font-semibold text-lilac-600 hover:bg-lilac-100"
    >
      <MessageCircleQuestion aria-hidden className="size-5" />
      {text || t('companion.askMe')}
    </button>
  );
}

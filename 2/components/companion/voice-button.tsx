'use client';

import { Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanion } from '@/lib/providers/companion-provider';
import { useTranslation } from '@/lib/providers/language-provider';

/**
 * The microphone control. It is deliberately large and always paired with a
 * visible label, and it degrades to a clearly-disabled state (rather than
 * disappearing) when the browser cannot recognise the chosen language — the
 * text box beside it still works.
 */
export function VoiceButton({
  size = 'md',
  showLabel = true,
  className,
}: {
  size?: 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { listening, startVoice, voiceSupported } = useCompanion();

  const dimension = size === 'lg' ? 'size-16' : 'size-14';
  const label = !voiceSupported
    ? t('companion.state.unavailable')
    : listening
      ? t('companion.stopListening')
      : t('companion.speak');

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={startVoice}
        aria-pressed={listening}
        aria-label={label}
        title={label}
        className={cn(
          'grid shrink-0 place-items-center rounded-full border-2 transition-colors',
          dimension,
          !voiceSupported
            ? 'border-line-strong bg-surface-sunken text-ink-muted'
            : listening
              ? 'border-lilac-600 bg-lilac-500 text-ink-inverse'
              : 'border-sage-600 bg-sage-600 text-ink-inverse hover:bg-sage-700',
        )}
      >
        {!voiceSupported ? (
          <MicOff aria-hidden className="size-6" />
        ) : listening ? (
          <Square aria-hidden className="size-5 fill-current" />
        ) : (
          <Mic aria-hidden className="size-6" />
        )}
      </button>
      {showLabel ? (
        <span className="max-w-[8rem] text-center text-xs font-semibold text-ink-soft">
          {label}
        </span>
      ) : null}
    </div>
  );
}

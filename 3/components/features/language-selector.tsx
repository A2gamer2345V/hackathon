'use client';

import { useEffect, useState } from 'react';
import { Check, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/providers/language-provider';
import { LANGUAGE_LIST, type LanguageCode } from '@/lib/i18n/languages';
import { coverageRatio } from '@/lib/i18n';
import { detectCapability, onVoicesReady, type CapabilityLevel } from '@/lib/voice/speech';

/**
 * The list of languages, used both during onboarding and in Settings.
 *
 * Each card tells the truth about its language: how much of the interface is
 * translated, and whether *this* device can listen and speak in it. The second
 * answer is detected live, because it differs between browsers and can arrive
 * late (Chrome loads synthesis voices asynchronously).
 */
export function LanguageSelector({
  value,
  onSelect,
  columns = 3,
  className,
}: {
  value: LanguageCode;
  onSelect: (code: LanguageCode) => void;
  columns?: 2 | 3;
  className?: string;
}) {
  const { t } = useTranslation();
  const [voiceInfo, setVoiceInfo] = useState<Record<string, CapabilityLevel> | null>(null);

  useEffect(() => {
    const refresh = () => {
      const next: Record<string, CapabilityLevel> = {};
      for (const def of LANGUAGE_LIST) {
        const capability = detectCapability(def.code);
        // The card summarises both directions in one honest line.
        next[def.code] =
          capability.recognition === 'native' && capability.synthesis === 'native'
            ? 'native'
            : capability.recognition === 'unavailable' && capability.synthesis === 'unavailable'
              ? 'unavailable'
              : 'fallback';
      }
      setVoiceInfo(next);
    };
    refresh();
    return onVoicesReady(refresh);
  }, []);

  return (
    <ul
      role="radiogroup"
      aria-label={t('language.title')}
      className={cn(
        'grid gap-3',
        columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {LANGUAGE_LIST.map((def) => {
        const active = value === def.code;
        const voice = voiceInfo?.[def.code];
        // Counted from the dictionaries, so the badge stays true as strings land.
        const ratio = coverageRatio(def.code);
        const coverage = ratio >= 0.98 ? 'full' : ratio >= 0.6 ? 'most' : 'partial';
        return (
          <li key={def.code}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(def.code)}
              className={cn(
                'flex h-full w-full items-start gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors',
                active
                  ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-300'
                  : 'border-line bg-surface-raised hover:border-sage-300 hover:bg-sage-50/70',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-12 shrink-0 place-items-center rounded-[14px] text-lg font-bold',
                  active ? 'bg-sage-600 text-ink-inverse' : 'bg-surface-sunken text-ink-soft',
                )}
              >
                {def.script}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-xl font-semibold text-ink">{def.nativeName}</span>
                  {active ? <Check aria-hidden className="size-5 shrink-0 text-sage-600" /> : null}
                </span>
                <span className="block text-sm text-ink-soft">
                  {def.name} · {def.region}
                </span>

                <span className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      'inline-block rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold',
                      coverage === 'partial'
                        ? 'border-sun-300/70 bg-sun-100 text-sun-600'
                        : 'border-sage-200 bg-sage-100 text-sage-800',
                    )}
                  >
                    {t(`language.coverage.${coverage}`)}
                  </span>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold',
                      !voice
                        ? 'border-line bg-surface-sunken text-ink-muted'
                        : voice === 'native'
                          ? 'border-sage-200 bg-sage-100 text-sage-800'
                          : voice === 'fallback'
                            ? 'border-sun-300/70 bg-sun-100 text-sun-600'
                            : 'border-line-strong bg-surface-sunken text-ink-soft',
                    )}
                  >
                    {voice === 'unavailable' ? (
                      <MicOff aria-hidden className="size-3" />
                    ) : (
                      <Mic aria-hidden className="size-3" />
                    )}
                    {!voice
                      ? t('language.checking')
                      : voice === 'native'
                        ? t('language.voice.full')
                        : voice === 'fallback'
                          ? t('language.voice.partial')
                          : t('language.voice.none')}
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Contrast, Languages, Settings2, Type, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import type { TextScale } from '@/lib/types';

const SCALES: { value: TextScale; labelKey: 'settings.textSize.normal' | 'settings.textSize.large' | 'settings.textSize.xlarge'; sample: string }[] = [
  { value: 'normal', labelKey: 'settings.textSize.normal', sample: 'A' },
  { value: 'large', labelKey: 'settings.textSize.large', sample: 'A' },
  { value: 'xlarge', labelKey: 'settings.textSize.xlarge', sample: 'A' },
];

/**
 * Quick accessibility controls in the header, so text size and contrast are
 * one tap away rather than buried in Settings.
 */
export function AccessibilityMenu({ settingsHref = '/app/settings' }: { settingsHref?: string }) {
  const { t } = useTranslation();
  const { accessibility, updateAccessibility } = useAppState();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('settings.accessibility')}
        title={t('settings.accessibility')}
        className={cn(
          'flex min-h-[3rem] items-center gap-2 rounded-[var(--radius-control)] border px-3.5 font-semibold transition-colors',
          open
            ? 'border-sage-400 bg-sage-100 text-sage-800'
            : 'border-line-strong bg-surface-raised text-ink-soft hover:bg-sage-50',
        )}
      >
        <Settings2 aria-hidden className="size-5" />
        <span className="hidden md:inline">{t('settings.accessibility')}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t('settings.accessibility')}
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-line bg-surface-raised p-4 shadow-lift"
        >
          <fieldset className="mb-4">
            <legend className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <Type aria-hidden className="size-4" />
              {t('settings.textSize')}
            </legend>
            <div className="flex gap-2">
              {SCALES.map((scale, index) => {
                const active = accessibility.textScale === scale.value;
                return (
                  <button
                    key={scale.value}
                    type="button"
                    onClick={() => updateAccessibility({ textScale: scale.value })}
                    aria-pressed={active}
                    className={cn(
                      'flex min-h-[3rem] flex-1 flex-col items-center justify-center rounded-[var(--radius-control)] border font-semibold transition-colors',
                      active
                        ? 'border-sage-500 bg-sage-100 text-sage-800'
                        : 'border-line bg-surface hover:bg-sage-50',
                    )}
                  >
                    <span
                      aria-hidden
                      style={{ fontSize: `${0.9 + index * 0.35}rem`, lineHeight: 1.1 }}
                    >
                      {scale.sample}
                    </span>
                    <span className="text-[0.65rem]">{t(scale.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <MenuToggle
              icon={<Contrast aria-hidden className="size-5" />}
              label={t('settings.highContrast')}
              pressed={accessibility.highContrast}
              onClick={() => updateAccessibility({ highContrast: !accessibility.highContrast })}
            />
            <MenuToggle
              icon={
                accessibility.voiceGuidance ? (
                  <Volume2 aria-hidden className="size-5" />
                ) : (
                  <VolumeX aria-hidden className="size-5" />
                )
              }
              label={t('settings.voiceGuidance')}
              pressed={accessibility.voiceGuidance}
              onClick={() => updateAccessibility({ voiceGuidance: !accessibility.voiceGuidance })}
            />
          </div>

          <Link
            href={settingsHref}
            onClick={() => setOpen(false)}
            className="mt-3 flex min-h-[3rem] items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3.5 font-semibold text-ink hover:bg-sage-50"
          >
            <Languages aria-hidden className="size-5 text-sage-600" />
            {t('settings.title')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function MenuToggle({
  icon,
  label,
  pressed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        'flex min-h-[3rem] w-full items-center gap-3 rounded-[var(--radius-control)] border px-3.5 text-left font-semibold transition-colors',
        pressed ? 'border-sage-400 bg-sage-50 text-sage-800' : 'border-line bg-surface text-ink hover:bg-sage-50',
      )}
    >
      <span className={pressed ? 'text-sage-700' : 'text-ink-muted'}>{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">
        {pressed ? t('common.on') : t('common.off')}
      </span>
    </button>
  );
}

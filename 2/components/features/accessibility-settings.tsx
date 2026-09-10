'use client';

import { Contrast, Sparkles, Type } from 'lucide-react';
import { ChoiceGroup, ToggleField } from '@/components/ui/field';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import type { TextScale } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

const SCALES: { value: TextScale; labelKey: TranslationKey; sample: string }[] = [
  { value: 'normal', labelKey: 'settings.textSize.normal', sample: '0.95rem' },
  { value: 'large', labelKey: 'settings.textSize.large', sample: '1.2rem' },
  { value: 'xlarge', labelKey: 'settings.textSize.xlarge', sample: '1.5rem' },
];

/**
 * The accessibility controls.
 *
 * Each one writes to the stored preferences, which the app state provider turns
 * into `data-text-scale` / `data-contrast` / `data-motion` attributes on
 * `<html>`. The stylesheet keys off those, so every switch here changes the real
 * interface immediately rather than only remembering a choice.
 */
export function AccessibilitySettings() {
  const { t } = useTranslation();
  const { accessibility, updateAccessibility } = useAppState();

  return (
    <div className="space-y-5">
      <ChoiceGroup<TextScale>
        legend={t('settings.textSize')}
        value={accessibility.textScale}
        onChange={(textScale) => updateAccessibility({ textScale })}
        options={SCALES.map((scale) => ({
          value: scale.value,
          label: t(scale.labelKey),
          icon: (
            <span
              className="font-display font-semibold leading-none"
              style={{ fontSize: scale.sample }}
            >
              Aa
            </span>
          ),
        }))}
      />

      {/* The scale is already applied to the whole document, so this line grows
          with it and shows the result rather than describing it. */}
      <p className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4 text-lg text-ink-soft">
        <Type aria-hidden className="mt-1 size-5 shrink-0 text-ink-muted" />
        {t('settings.textSizePreview')}
      </p>

      <div className="space-y-3">
        <ToggleField
          label={t('settings.highContrast')}
          description={t('settings.highContrastDesc')}
          checked={accessibility.highContrast}
          onChange={(highContrast) => updateAccessibility({ highContrast })}
          icon={<Contrast className="size-5" />}
        />
        <ToggleField
          label={t('settings.reducedMotion')}
          description={t('settings.reducedMotionDesc')}
          checked={accessibility.reducedMotion}
          onChange={(reducedMotion) => updateAccessibility({ reducedMotion })}
          icon={<Sparkles className="size-5" />}
        />
      </div>
    </div>
  );
}

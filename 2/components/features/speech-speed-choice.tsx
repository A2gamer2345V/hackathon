'use client';

import { Gauge, Rabbit, Turtle } from 'lucide-react';
import { ChoiceGroup } from '@/components/ui/field';
import { useTranslation } from '@/lib/providers/language-provider';
import type { SpeechSpeed } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

const SPEEDS: { value: SpeechSpeed; labelKey: TranslationKey; icon: typeof Gauge }[] = [
  { value: 'slow', labelKey: 'profile.speech.slow', icon: Turtle },
  { value: 'normal', labelKey: 'profile.speech.normal', icon: Gauge },
  { value: 'fast', labelKey: 'profile.speech.fast', icon: Rabbit },
];

/** How fast the companion reads aloud. Shared by profile setup and settings. */
export function SpeechSpeedChoice({
  value,
  onChange,
  legend,
  hint,
}: {
  value: SpeechSpeed;
  onChange: (next: SpeechSpeed) => void;
  legend: string;
  hint?: string;
}) {
  const { t } = useTranslation();

  return (
    <ChoiceGroup<SpeechSpeed>
      legend={legend}
      hint={hint}
      value={value}
      onChange={onChange}
      options={SPEEDS.map(({ value: speed, labelKey, icon: Icon }) => ({
        value: speed,
        label: t(labelKey),
        icon: <Icon className="size-5" />,
      }))}
    />
  );
}

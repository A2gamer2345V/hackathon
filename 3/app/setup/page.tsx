'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Contrast, Sparkles, Type, Volume2 } from 'lucide-react';
import { OnboardingShell } from '@/components/layout/onboarding-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChoiceGroup, TextField, ToggleField } from '@/components/ui/field';
import { SpeechSpeedChoice } from '@/components/features/speech-speed-choice';
import { CompanionCharacter } from '@/components/companion/companion-character';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { GAMES } from '@/lib/data/games';
import { cn } from '@/lib/utils';
import type { GameId, SpeechSpeed, TextScale } from '@/lib/types';

/**
 * First-time profile setup.
 *
 * Kept to one short screen with large controls: name, a couple of comfort
 * settings, and the activities the person actually likes. Everything can be
 * changed later, and the screen says so.
 */
export default function SetupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role, user, patient, caregiver, accessibility, completeOnboarding, hydrated } =
    useAppState();

  const isCaregiver = role === 'caregiver';

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [relation, setRelation] = useState('');
  const [speechSpeed, setSpeechSpeed] = useState<SpeechSpeed>('normal');
  const [textScale, setTextScale] = useState<TextScale>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [voiceGuidance, setVoiceGuidance] = useState(true);
  const [preferred, setPreferred] = useState<GameId[]>([]);

  // Seed from whatever we already know, once storage has been read. This happens
  // during the render that first sees `hydrated` rather than in an effect: the
  // fields are then correct on their first paint, and after that the form is the
  // user's — a later change to the stored profile must not overwrite typing.
  const [seeded, setSeeded] = useState(false);
  if (hydrated && !seeded) {
    setSeeded(true);
    if (isCaregiver) {
      setName(user?.displayName || caregiver?.name || '');
      setRelation(caregiver?.relationToPatient ?? '');
    } else {
      setName(user?.displayName || patient?.name || '');
      setAge(patient?.age ? String(patient.age) : '');
      setRelation(patient?.caregiverRelation ?? '');
      setSpeechSpeed(patient?.speechSpeed ?? 'normal');
      setPreferred(patient?.preferredActivities ?? []);
    }
    setTextScale(accessibility.textScale);
    setHighContrast(accessibility.highContrast);
    setVoiceGuidance(accessibility.voiceGuidance);
  }

  const toggleActivity = (id: GameId) => {
    setPreferred((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const finish = () => {
    const trimmed = name.trim() || (isCaregiver ? 'Caregiver' : 'Friend');
    completeOnboarding({
      name: trimmed,
      age: age ? Number(age) : undefined,
      speechSpeed,
      caregiverRelation: relation || undefined,
      relationToPatient: relation || undefined,
      preferredActivities: preferred,
      accessibility: { textScale, highContrast, voiceGuidance },
    });
    router.push(isCaregiver ? '/care' : '/app');
  };

  return (
    <OnboardingShell step={4} totalSteps={4} backHref="/login" width="lg">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <CompanionCharacter state="encouraging" size={92} />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {isCaregiver ? t('profile.caregiverTitle') : t('profile.title')}
          </h1>
          <p className="mt-2 max-w-prose text-lg text-ink-soft">
            {isCaregiver ? t('profile.caregiverSubtitle') : t('profile.subtitle')}
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={isCaregiver ? t('auth.fullName') : t('profile.name')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
            {isCaregiver ? (
              <TextField
                label={t('profile.relationToPatient')}
                value={relation}
                onChange={(event) => setRelation(event.target.value)}
                placeholder="Daughter"
              />
            ) : (
              <TextField
                label={`${t('profile.age')} · ${t('common.optional')}`}
                value={age}
                onChange={(event) => setAge(event.target.value.replace(/\D/g, '').slice(0, 3))}
                inputMode="numeric"
              />
            )}
          </div>

          {!isCaregiver ? (
            <div className="mt-4">
              <TextField
                label={`${t('profile.relation')} · ${t('common.optional')}`}
                value={relation}
                onChange={(event) => setRelation(event.target.value)}
                placeholder={t('profile.relation.none')}
              />
            </div>
          ) : null}
        </Card>

        {!isCaregiver ? (
          <>
            <Card>
              <SpeechSpeedChoice
                legend={t('profile.speechSpeed')}
                value={speechSpeed}
                onChange={setSpeechSpeed}
              />
            </Card>

            <Card>
              <fieldset>
                <legend className="mb-1 text-base font-semibold text-ink">
                  {t('profile.activities')}
                </legend>
                <p className="mb-3 text-sm text-ink-muted">{t('profile.activitiesHint')}</p>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {GAMES.map((game) => {
                    const active = preferred.includes(game.id);
                    return (
                      <label
                        key={game.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border p-3.5 font-semibold transition-colors',
                          active
                            ? 'border-sage-500 bg-sage-50 text-sage-800 ring-2 ring-sage-200'
                            : 'border-line bg-surface-raised text-ink hover:bg-sage-50/70',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleActivity(game.id)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-6 shrink-0 place-items-center rounded-md border',
                            active
                              ? 'border-sage-600 bg-sage-600 text-ink-inverse'
                              : 'border-line-strong bg-surface',
                          )}
                        >
                          {active ? <Check className="size-4" /> : null}
                        </span>
                        <span className="min-w-0 truncate">{t(game.nameKey)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </Card>
          </>
        ) : null}

        <Card tone="sage">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Sparkles aria-hidden className="size-5 text-sage-700" />
            {t('profile.accessibility')}
          </h2>

          <ChoiceGroup
            legend={t('settings.textSize')}
            value={textScale}
            onChange={setTextScale}
            options={[
              { value: 'normal', label: t('settings.textSize.normal'), icon: <Type className="size-4" /> },
              { value: 'large', label: t('settings.textSize.large'), icon: <Type className="size-5" /> },
              { value: 'xlarge', label: t('settings.textSize.xlarge'), icon: <Type className="size-6" /> },
            ]}
          />

          <div className="mt-4 space-y-2.5">
            <ToggleField
              label={t('settings.highContrast')}
              description={t('settings.highContrastDesc')}
              checked={highContrast}
              onChange={setHighContrast}
              icon={<Contrast className="size-5" />}
            />
            <ToggleField
              label={t('settings.voiceGuidance')}
              description={t('settings.voiceGuidanceDesc')}
              checked={voiceGuidance}
              onChange={setVoiceGuidance}
              icon={<Volume2 className="size-5" />}
            />
          </div>
        </Card>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
        <Button size="xl" onClick={finish} className="sm:flex-1">
          {t('profile.finish')}
        </Button>
        <Button
          size="xl"
          variant="ghost"
          onClick={() => {
            completeOnboarding({ name: name.trim() || (isCaregiver ? 'Caregiver' : 'Friend') });
            router.push(isCaregiver ? '/care' : '/app');
          }}
        >
          {t('common.skip')}
        </Button>
      </div>
    </OnboardingShell>
  );
}

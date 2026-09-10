'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BellRing,
  CloudOff,
  Info,
  Languages,
  LogOut,
  Mic,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sliders,
  UserRound,
  Volume2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { AccessibilitySettings } from '@/components/features/accessibility-settings';
import { LanguageSelector } from '@/components/features/language-selector';
import { CompanionHint } from '@/components/companion/companion-dock';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChoiceGroup, TextField, ToggleField } from '@/components/ui/field';
import { LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useLanguage, useTranslation } from '@/lib/providers/language-provider';
import { useCompanion } from '@/lib/providers/companion-provider';
import { detectCapability, onVoicesReady, type VoiceCapability } from '@/lib/voice/speech';
import type { LanguageCode } from '@/lib/i18n/languages';
import type { SpeechSpeed } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

const SPEEDS: { value: SpeechSpeed; labelKey: TranslationKey }[] = [
  { value: 'slow', labelKey: 'profile.speech.slow' },
  { value: 'normal', labelKey: 'profile.speech.normal' },
  { value: 'fast', labelKey: 'profile.speech.fast' },
];

/**
 * Settings.
 *
 * Everything here takes effect the moment it is changed — no Save button to
 * forget. Language switching keeps the session, the reminders and the progress
 * exactly where they are; it only swaps the strings and the speech locale.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, definition, setLanguage } = useLanguage();
  const { say } = useCompanion();
  const {
    hydrated,
    user,
    patient,
    accessibility,
    updateAccessibility,
    updatePatient,
    signOut,
    resetDemoData,
  } = useAppState();

  const [name, setName] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [capability, setCapability] = useState<VoiceCapability | null>(null);

  // Adopt the stored name once, during the render that first sees it, then leave
  // the field under the user's control — a later profile write must not clobber
  // what they are typing.
  const [adopted, setAdopted] = useState(false);
  if (!adopted && patient?.name) {
    setAdopted(true);
    setName(patient.name);
  }

  // Capability depends on the chosen language and on voices that may arrive late.
  useEffect(() => {
    const refresh = () => setCapability(detectCapability(language));
    refresh();
    return onVoicesReady(refresh);
  }, [language]);

  const chooseLanguage = (code: LanguageCode) => {
    setLanguage(code);
    // Keep the patient profile in step so the companion and STT agree with the UI.
    updatePatient({ language: code });
  };

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === patient?.name) return;
    updatePatient({ name: trimmed });
  };

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  const handleReset = () => {
    resetDemoData();
    setConfirmReset(false);
    router.push('/');
  };

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
          icon={<SettingsIcon className="size-6" />}
        />
        <LoadingState label={t('state.loading')} rows={3} />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        icon={<SettingsIcon className="size-6" />}
      />

      <div className="space-y-6">
        {/* -------------------------------------------------------- profile */}
        <Card>
          <CardHeader
            title={t('settings.profile')}
            description={t('settings.profileDesc')}
            icon={<UserRound aria-hidden className="size-6 text-sage-600" />}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('profile.name')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={commitName}
              autoComplete="name"
            />
            <TextField
              label={t('profile.age')}
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={patient?.age ?? ''}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                updatePatient({ age: Number.isFinite(next) ? next : undefined });
              }}
            />
          </div>
        </Card>

        {/* ------------------------------------------------------- language */}
        <Card>
          <CardHeader
            title={t('settings.language')}
            description={t('settings.languageDesc')}
            icon={<Languages aria-hidden className="size-6 text-sage-600" />}
            action={<Badge tone="sage">{definition.nativeName}</Badge>}
          />
          <div className="mt-5">
            <LanguageSelector value={language} onSelect={chooseLanguage} columns={2} />
          </div>
        </Card>

        {/* ---------------------------------------------------------- voice */}
        <Card>
          <CardHeader
            title={t('settings.voice')}
            description={t('settings.speechSpeedDesc')}
            icon={<Volume2 aria-hidden className="size-6 text-sage-600" />}
          />

          <div className="mt-5 space-y-5">
            <ToggleField
              label={t('settings.voiceGuidance')}
              description={t('settings.voiceGuidanceDesc')}
              checked={accessibility.voiceGuidance}
              onChange={(voiceGuidance) => updateAccessibility({ voiceGuidance })}
              icon={<Volume2 className="size-5" />}
            />

            <ChoiceGroup<SpeechSpeed>
              legend={t('settings.speechSpeed')}
              value={patient?.speechSpeed ?? 'normal'}
              onChange={(speechSpeed) => updatePatient({ speechSpeed })}
              options={SPEEDS.map((speed) => ({
                value: speed.value,
                label: t(speed.labelKey),
              }))}
            />

            <Button
              variant="secondary"
              size="lg"
              iconLeft={<Volume2 aria-hidden className="size-5" />}
              onClick={() => say(t('settings.testVoiceLine'), { reveal: true })}
            >
              {t('settings.testVoice')}
            </Button>

            {/* What this device can actually do, checked at runtime rather than
                assumed. Both directions are reported separately because a
                browser often has one and not the other. */}
            <div className="rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
              <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
                <Mic aria-hidden className="size-5 text-ink-muted" />
                {t('settings.voiceOnThisDevice')}
              </h3>

              {!capability ? (
                <p className="mt-2 text-base text-ink-soft">{t('settings.capabilityChecking')}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  <CapabilityRow
                    label={t('settings.voiceListen', { language: definition.nativeName })}
                    level={capability.recognition}
                    locale={capability.recognitionLocale}
                  />
                  <CapabilityRow
                    label={t('settings.voiceSpeak', { language: definition.nativeName })}
                    level={capability.synthesis}
                    locale={capability.synthesisLocale}
                  />
                </ul>
              )}

              <p className="mt-3 text-sm text-ink-muted">{t('settings.capabilityNote')}</p>
            </div>
          </div>
        </Card>

        {/* -------------------------------------------------- accessibility */}
        <Card>
          <CardHeader
            title={t('settings.accessibility')}
            description={t('profile.accessibility')}
            icon={<Sliders aria-hidden className="size-6 text-sage-600" />}
          />
          <div className="mt-5">
            <AccessibilitySettings />
          </div>
        </Card>

        {/* --------------------------------------------------- app behaviour */}
        <Card>
          <CardHeader
            title={t('nav.settings')}
            icon={<BellRing aria-hidden className="size-6 text-sage-600" />}
          />
          <div className="mt-5 space-y-3">
            <ToggleField
              label={t('settings.notifications')}
              description={t('settings.notificationsDesc')}
              checked={accessibility.notifications}
              onChange={(notifications) => updateAccessibility({ notifications })}
              icon={<BellRing className="size-5" />}
            />
            <ToggleField
              label={t('settings.offlineMode')}
              description={t('settings.offlineModeDesc')}
              checked={accessibility.offlineMode}
              onChange={(offlineMode) => updateAccessibility({ offlineMode })}
              icon={<CloudOff className="size-5" />}
            />
          </div>
        </Card>

        {/* -------------------------------------------------------- privacy */}
        <Card tone="sunken">
          <CardHeader
            title={t('settings.privacy')}
            icon={<ShieldCheck aria-hidden className="size-6 text-ink-muted" />}
          />
          <p className="mt-3 text-base text-ink-soft">{t('settings.privacyBody')}</p>
        </Card>

        {/* ---------------------------------------------------------- about */}
        <Card tone="sunken">
          <CardHeader
            title={t('settings.about')}
            icon={<Info aria-hidden className="size-6 text-ink-muted" />}
            action={<Badge tone="neutral">{t('settings.version')}</Badge>}
          />
          <p className="mt-3 text-base text-ink-soft">{t('settings.aboutBody')}</p>
        </Card>

        {/* -------------------------------------------------------- account */}
        <Card>
          <CardHeader
            title={t('settings.account')}
            description={
              user ? t('settings.signedInAs', { identifier: user.identifier }) : undefined
            }
            icon={<LogOut aria-hidden className="size-6 text-sage-600" />}
          />

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
              <p className="max-w-prose text-base text-ink-soft">{t('settings.signOutDesc')}</p>
              <Button
                variant="secondary"
                size="lg"
                iconLeft={<LogOut aria-hidden className="size-5" />}
                onClick={handleSignOut}
              >
                {t('nav.signOut')}
              </Button>
            </div>

            <div className="rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft p-4">
              <h3 className="text-base font-semibold text-ink">{t('settings.dangerZone')}</h3>
              <p className="mt-1 max-w-prose text-base text-ink-soft">
                {t('settings.resetDemoDesc')}
              </p>

              <div className="mt-3 flex flex-wrap gap-3">
                {confirmReset ? (
                  <>
                    <Button
                      variant="danger"
                      size="lg"
                      iconLeft={<RotateCcw aria-hidden className="size-5" />}
                      onClick={handleReset}
                    >
                      {t('settings.resetConfirm')}
                    </Button>
                    <Button variant="ghost" size="lg" onClick={() => setConfirmReset(false)}>
                      {t('common.cancel')}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="danger"
                    size="lg"
                    iconLeft={<RotateCcw aria-hidden className="size-5" />}
                    onClick={() => setConfirmReset(true)}
                  >
                    {t('settings.resetDemo')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <CompanionHint text={t('companion.ctx.settings')} />
      </div>
    </div>
  );
}

/** One honest line about one direction of voice support. */
function CapabilityRow({
  label,
  level,
  locale,
}: {
  label: string;
  level: VoiceCapability['recognition'];
  locale?: string;
}) {
  const { t } = useTranslation();
  const tone = level === 'native' ? 'success' : level === 'fallback' ? 'warning' : 'neutral';
  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-base text-ink-soft">{label}</span>
      <span className="flex items-center gap-2">
        {locale ? (
          <span className="text-sm text-ink-muted">{t('settings.usingLocale', { locale })}</span>
        ) : null}
        <Badge tone={tone}>{t(`settings.capability.${level}`)}</Badge>
      </span>
    </li>
  );
}

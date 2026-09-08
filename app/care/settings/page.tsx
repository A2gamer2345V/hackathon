'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BellRing,
  Info,
  Languages,
  LogOut,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sliders,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { AccessibilitySettings } from '@/components/features/accessibility-settings';
import { LanguageSelector } from '@/components/features/language-selector';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { TextField, ToggleField } from '@/components/ui/field';
import { LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useLanguage, useTranslation } from '@/lib/providers/language-provider';
import type { LanguageCode } from '@/lib/i18n/languages';

/**
 * Caregiver settings.
 *
 * Deliberately narrower than the patient's: a caregiver edits their own details
 * and this device's behaviour. The accessibility and language controls are the
 * same components, because a caregiver often sets the phone up for the patient
 * and then hands it over.
 */
export default function CaregiverSettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, definition, setLanguage } = useLanguage();
  const {
    hydrated,
    user,
    patient,
    caregiver,
    accessibility,
    updateAccessibility,
    updateCaregiver,
    signOut,
    resetDemoData,
  } = useAppState();

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  // Adopt the stored details once, during the render that first sees them, then
  // leave both fields under the user's control.
  const [adopted, setAdopted] = useState(false);
  if (!adopted && caregiver) {
    setAdopted(true);
    setName(caregiver.name);
    setRelation(caregiver.relationToPatient);
  }

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === caregiver?.name) return;
    updateCaregiver({ name: trimmed });
  };

  const commitRelation = () => {
    const trimmed = relation.trim();
    if (!trimmed || trimmed === caregiver?.relationToPatient) return;
    updateCaregiver({ relationToPatient: trimmed });
  };

  const chooseLanguage = (code: LanguageCode) => {
    setLanguage(code);
    updateCaregiver({ language: code });
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

  const patientName = patient?.name ?? '';

  if (!hydrated) {
    return (
      <div>
        <PageHeader
          title={t('settings.title')}
          subtitle={t('caregiver.settingsSubtitle')}
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
        subtitle={t('caregiver.settingsSubtitle')}
        icon={<SettingsIcon className="size-6" />}
      />

      <div className="space-y-6">
        {/* --------------------------------------------------- your details */}
        <Card>
          <CardHeader
            title={t('settings.profile')}
            icon={<UserRound aria-hidden className="size-6 text-sage-600" />}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('caregiver.yourName')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={commitName}
              autoComplete="name"
            />
            <TextField
              label={t('caregiver.yourRelation', { name: patientName })}
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
              onBlur={commitRelation}
            />
          </div>
        </Card>

        {/* -------------------------------------------------- who you support */}
        <Card tone="sage">
          <CardHeader
            title={t('caregiver.patientCard')}
            description={patient?.age ? `${patientName} · ${patient.age}` : patientName}
            icon={<ShieldCheck aria-hidden className="size-6 text-sage-600" />}
            action={
              <ButtonLink href="/app" variant="secondary" size="md">
                {t('caregiver.switchToPatient')}
              </ButtonLink>
            }
          />
        </Card>

        {/* --------------------------------------------------------- language */}
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

        {/* ---------------------------------------------------- accessibility */}
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

        {/* ------------------------------------------------- app behaviour */}
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
          </div>
        </Card>

        {/* ---------------------------------------------------------- privacy */}
        <Card tone="sunken">
          <CardHeader
            title={t('settings.privacy')}
            icon={<ShieldCheck aria-hidden className="size-6 text-ink-muted" />}
          />
          <p className="mt-3 text-base text-ink-soft">{t('settings.privacyBody')}</p>
        </Card>

        {/* ------------------------------------------------------------ about */}
        <Card tone="sunken">
          <CardHeader
            title={t('settings.about')}
            icon={<Info aria-hidden className="size-6 text-ink-muted" />}
            action={<Badge tone="neutral">{t('settings.version')}</Badge>}
          />
          <p className="mt-3 text-base text-ink-soft">{t('caregiver.disclaimer')}</p>
        </Card>

        {/* ---------------------------------------------------------- account */}
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
      </div>
    </div>
  );
}

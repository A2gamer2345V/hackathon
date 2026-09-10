'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AtSign,
  Eye,
  EyeOff,
  HeartHandshake,
  Info,
  KeyRound,
  LogIn,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { OnboardingShell } from '@/components/layout/onboarding-shell';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { AuthError, authService } from '@/lib/services/auth';
import type { UserRole } from '@/lib/types';

type Mode = 'login' | 'signup';

/**
 * Prototype sign-in.
 *
 * There is no backend here and the screen says so: accounts are kept in this
 * browser only and no password is ever stored. Nothing on this page should be
 * mistaken for real authentication.
 */
export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role, setRole, setUser } = useAppState();

  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<UserRole | null>(null);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; name?: string }>({});
  const [notice, setNotice] = useState<string | null>(null);

  const effectiveRole = role ?? 'patient';
  const working = busy || demoBusy !== null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);

    const nextErrors: typeof errors = {};
    if (identifier.trim().length < 3) nextErrors.identifier = t('auth.error.identifier');
    if (password.trim().length < 4) nextErrors.password = t('auth.error.password');
    if (mode === 'signup' && name.trim().length < 2) nextErrors.name = t('auth.error.name');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const user =
        mode === 'signup'
          ? await authService.signUp({ identifier, password }, effectiveRole, name)
          : await authService.signIn({ identifier, password }, effectiveRole);
      setUser(user);
      router.push(user.onboarded ? (effectiveRole === 'caregiver' ? '/care' : '/app') : '/setup');
    } catch (error) {
      if (error instanceof AuthError && error.code === 'exists') {
        setNotice(t('auth.haveAccount'));
        setMode('login');
      } else {
        setErrors({ password: t('auth.error.password') });
      }
    } finally {
      setBusy(false);
    }
  };

  /**
   * One press, one outcome.
   *
   * People were reading the old "fill the form for me" behaviour as a broken
   * button, so pressing a demo button now signs in and navigates. It also sets
   * the role, because choosing "Demo as Caregiver" *is* choosing a role — the
   * earlier answer on /role should not silently win over the button just pressed.
   */
  const startDemo = async (demoRole: UserRole) => {
    setNotice(null);
    setErrors({});
    setDemoBusy(demoRole);
    try {
      setRole(demoRole);
      const user = await authService.signInDemo(demoRole);
      setUser(user);
      router.push(demoRole === 'caregiver' ? '/care' : '/app');
    } finally {
      setDemoBusy(null);
    }
  };

  return (
    <OnboardingShell step={3} totalSteps={4} backHref="/role">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {mode === 'login' ? t('auth.welcomeBack') : t('auth.createTitle')}
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-lg text-ink-soft">
          {mode === 'login' ? t('auth.subtitle') : t('auth.createSubtitle')}
        </p>
      </div>

      {/* --------------------------------------------------------------- demo */}
      {/* First on the page, because for most people opening this build the demo
          *is* the intended door. Each button is a whole action: press, and you
          are in. */}
      <Card tone="sage" className="mt-7">
        <div className="flex items-start gap-3">
          <HeartHandshake aria-hidden className="mt-0.5 size-6 shrink-0 text-sage-600" />
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-ink">{t('auth.demoTitle')}</h2>
            <p className="mt-1 text-base text-ink-soft">{t('auth.demoDesc')}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            size="lg"
            fullWidth
            disabled={working}
            loading={demoBusy === 'patient'}
            onClick={() => void startDemo('patient')}
            iconLeft={demoBusy === 'patient' ? undefined : <UserRound aria-hidden className="size-5" />}
          >
            {demoBusy === 'patient' ? t('auth.demoOpening') : t('auth.demoPatient')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={working}
            loading={demoBusy === 'caregiver'}
            onClick={() => void startDemo('caregiver')}
            iconLeft={
              demoBusy === 'caregiver' ? undefined : <HeartHandshake aria-hidden className="size-5" />
            }
          >
            {demoBusy === 'caregiver' ? t('auth.demoOpening') : t('auth.demoCaregiver')}
          </Button>
        </div>

        <p className="mt-3 text-sm text-ink-muted">{t('auth.demoNotice')}</p>
      </Card>

      {/* ---------------------------------------------------------------- or */}
      <div className="my-6 flex items-center gap-4" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('auth.or')}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Card>
        <form onSubmit={submit} noValidate className="space-y-4">
          {mode === 'signup' ? (
            <TextField
              label={t('auth.fullName')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              iconLeft={<UserRound className="size-5" />}
              error={errors.name}
            />
          ) : null}

          <TextField
            label={t('auth.identifier')}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            inputMode="email"
            iconLeft={<AtSign className="size-5" />}
            error={errors.identifier}
          />

          <TextField
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            iconLeft={<KeyRound className="size-5" />}
            error={errors.password}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-sage-100"
              >
                {showPassword ? (
                  <EyeOff aria-hidden className="size-5" />
                ) : (
                  <Eye aria-hidden className="size-5" />
                )}
              </button>
            }
          />

          {notice ? (
            <p role="status" className="rounded-[var(--radius-control)] bg-sage-50 p-3 text-sm font-semibold text-sage-800">
              {notice}
            </p>
          ) : null}

          <Button
            type="submit"
            size="xl"
            fullWidth
            disabled={working}
            loading={busy}
            iconLeft={busy ? undefined : <LogIn aria-hidden className="size-5" />}
          >
            {mode === 'login' ? t('auth.login') : t('auth.signup')}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setNotice(t('auth.forgotNotice'))}
              className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-2 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
            >
              {t('auth.forgot')}
            </button>
          </div>
        </form>
      </Card>

      <p className="mt-5 text-center text-base text-ink-soft">
        {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setErrors({});
            setNotice(null);
          }}
          className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-2 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
        >
          {mode === 'login' ? t('auth.signup') : t('auth.login')}
        </button>
      </p>

      {/* The honesty notice is part of the design, not fine print. */}
      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-sun-300/70 bg-sun-100/70 p-4">
        <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-sun-600" />
        <p className="text-sm text-ink-soft">{t('auth.prototypeNotice')}</p>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t('settings.aboutBody')}
      </p>
    </OnboardingShell>
  );
}

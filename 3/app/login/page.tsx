'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AtSign,
  Eye,
  EyeOff,
  HeartHandshake,
  Info,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { OnboardingShell } from '@/components/layout/onboarding-shell';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { api, ApiRequestError } from '@/lib/api/client';
import { detectTimezone } from '@/lib/utils/timezone';
import { MIN_PASSWORD_LENGTH, checkPassword } from '@/lib/utils/password';
import type { SessionResponse } from '@/lib/api/contract';
import type { UserRole } from '@/lib/types';

type Mode = 'login' | 'signup';

/**
 * Sign-in and caregiver registration.
 *
 * Credentials go to `/api/auth/*`, which hashes and compares them server-side and
 * replies with an httpOnly session cookie. Two consequences shape this screen.
 *
 * First, **the role is not ours to choose.** Whatever was picked on `/role` is a
 * hint for the layout at most; where you land after signing in comes from the role
 * on the account row the server matched. A patient cannot become a caregiver by
 * pressing a different button here.
 *
 * Second, **patients cannot register.** Their account is created by their
 * caregiver, who hands them an email and password. So sign-up on this page means
 * one thing only: a new caregiver account.
 */
export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role, setRole, adoptSession } = useAppState();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<UserRole | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [notice, setNotice] = useState<string | null>(null);

  const working = busy || demoBusy !== null;
  const timezone = useMemo(() => detectTimezone(), []);

  /** Where a signed-in account belongs — decided by the server's role, not ours. */
  const landingFor = (session: SessionResponse) => {
    if (!session.user) return '/';
    if (!session.user.onboarded) return '/setup';
    return session.user.role === 'caregiver' ? '/care' : '/app';
  };

  const finish = async (session: SessionResponse) => {
    // Keep the shell's idea of the role in step with the server's answer, so a
    // patient who arrived via the caregiver path still lands on patient screens.
    if (session.user) setRole(session.user.role);
    await adoptSession(session);
    router.push(landingFor(session));
  };

  const describe = (cause: unknown): { field?: 'email' | 'password'; message: string } => {
    if (!(cause instanceof ApiRequestError)) {
      return { message: t('auth.error.offline') };
    }
    switch (cause.code) {
      case 'invalid-credentials':
        return { field: 'password', message: t('auth.error.credentials') };
      case 'account-inactive':
        return { message: t('auth.error.inactive') };
      case 'email-taken':
        return { field: 'email', message: t('auth.error.emailTaken') };
      case 'invalid-email':
        return { field: 'email', message: t('auth.error.email') };
      case 'weak-password':
        return { field: 'password', message: t('auth.error.weakPassword') };
      default:
        return { message: t('auth.error.offline') };
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);

    const next: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t('auth.error.email');
    if (mode === 'signup') {
      if (name.trim().length < 2) next.name = t('auth.error.name');
      const verdict = checkPassword(password);
      if (verdict === 'too-short') next.password = t('auth.error.newPassword');
      else if (verdict === 'too-common') next.password = t('auth.error.weakPassword');
    } else if (password.length === 0) {
      next.password = t('auth.error.credentials');
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const session =
        mode === 'signup'
          ? await api.registerCaregiver({
              name: name.trim(),
              email: email.trim(),
              password,
              timezone,
              relationToPatient: relation.trim() || undefined,
            })
          : await api.login({ email: email.trim(), password, timezone });
      await finish(session);
    } catch (cause) {
      const { field, message } = describe(cause);
      if (field) setErrors({ [field]: message });
      else setNotice(message);
    } finally {
      setBusy(false);
    }
  };

  /**
   * One press, one outcome.
   *
   * The demo accounts are ordinary rows in the same database, flagged `is_demo`,
   * with their own seeded data. Signing into one is a real sign-in — it just skips
   * asking for a password the user was never given. Real accounts are untouched.
   */
  const startDemo = async (demoRole: UserRole) => {
    setNotice(null);
    setErrors({});
    setDemoBusy(demoRole);
    try {
      const session = await api.demo(demoRole);
      await finish(session);
    } catch {
      setNotice(t('auth.error.demoUnavailable'));
    } finally {
      setDemoBusy(null);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setNotice(null);
    setPassword('');
  };

  return (
    <OnboardingShell step={3} totalSteps={4} backHref="/role">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {mode === 'login' ? t('auth.welcomeBack') : t('auth.createCaregiverTitle')}
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-lg text-ink-soft">
          {mode === 'login' ? t('auth.signInSubtitle') : t('auth.createCaregiverSubtitle')}
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
            iconLeft={
              demoBusy === 'patient' ? undefined : <UserRound aria-hidden className="size-5" />
            }
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
              demoBusy === 'caregiver' ? undefined : (
                <HeartHandshake aria-hidden className="size-5" />
              )
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
            <>
              <div className="flex items-start gap-3 rounded-[var(--radius-control)] bg-sage-50 p-3">
                <UsersRound aria-hidden className="mt-0.5 size-5 shrink-0 text-sage-700" />
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold text-ink">
                    {t('auth.caregiverOnlySignup')}.
                  </span>{' '}
                  {t('auth.patientNoSignup')}
                </p>
              </div>

              <TextField
                label={t('auth.fullName')}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                autoComplete="name"
                iconLeft={<UserRound className="size-5" />}
                error={errors.name}
              />

              <TextField
                label={`${t('auth.relation')} · ${t('common.optional')}`}
                value={relation}
                onChange={(event) => setRelation(event.target.value)}
                hint={t('auth.relationHint')}
                autoComplete="off"
                iconLeft={<HeartHandshake className="size-5" />}
              />
            </>
          ) : null}

          <TextField
            label={t('auth.email')}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            type="email"
            autoComplete={mode === 'signup' ? 'off' : 'username'}
            inputMode="email"
            iconLeft={<AtSign className="size-5" />}
            error={errors.email}
            hint={mode === 'login' ? t('auth.emailHint') : undefined}
          />

          <TextField
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
            iconLeft={<KeyRound className="size-5" />}
            error={errors.password}
            hint={mode === 'signup' ? t('auth.newPasswordHint') : undefined}
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
            <p
              role="alert"
              className="rounded-[var(--radius-control)] bg-sun-100 p-3 text-sm font-semibold text-ink"
            >
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
            {mode === 'login' ? t('auth.login') : t('auth.createCaregiver')}
          </Button>

          <p className="text-sm text-ink-muted">{t('auth.timezoneNotice', { zone: timezone })}</p>

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

      {/* Patients arriving here have nothing to sign up for, so the switch is
          only offered as what it actually is: a caregiver account. */}
      <p className="mt-5 text-center text-base text-ink-soft">
        {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          className="inline-flex min-h-[2.75rem] items-center rounded-[var(--radius-control)] px-2 font-semibold text-sage-700 underline underline-offset-2 hover:bg-sage-50"
        >
          {mode === 'login' ? t('auth.createCaregiver') : t('auth.login')}
        </button>
      </p>

      {mode === 'login' && role === 'patient' ? (
        <p className="mt-3 text-center text-sm text-ink-muted">{t('auth.patientNoSignup')}</p>
      ) : null}

      {/* What this sign-in does and does not do. Part of the design, not fine print. */}
      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-sage-300/70 bg-sage-50 p-4">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-sage-700" />
        <p className="text-sm text-ink-soft">{t('auth.prototypeNotice')}</p>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t('settings.aboutBody')}
      </p>
    </OnboardingShell>
  );
}

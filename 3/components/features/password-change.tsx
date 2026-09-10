'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { ApiRequestError } from '@/lib/api/client';
import { MIN_PASSWORD_LENGTH, checkPassword } from '@/lib/utils/password';

/**
 * Changing your own password, for either role.
 *
 * The current password is asked for even though the session already proves who
 * this is. That is not paperwork: it is what stops someone using a signed-in
 * device that was left open from locking the owner out of their own account. The
 * server checks it again and its answer is the one that counts.
 *
 * There is no field showing the existing password, here or anywhere else. The
 * server keeps a scrypt hash, so there is nothing to show even if we wanted to.
 */
export function PasswordChange() {
  const { t } = useTranslation();
  const { role, changeOwnPassword } = useAppState();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  const clear = (field: keyof typeof errors) => {
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
    if (done) setDone(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    // Checked here so the obvious mistakes are caught without a round trip; the
    // server repeats all of it, because these checks are a courtesy, not a gate.
    const found: typeof errors = {};
    if (current.length === 0) found.current = t('password.error.current');
    const verdict = checkPassword(next);
    if (verdict === 'too-short') found.next = t('auth.error.newPassword');
    else if (verdict === 'too-common') found.next = t('auth.error.weakPassword');
    else if (next === current) found.next = t('password.error.same');
    if (confirm !== next) found.confirm = t('password.error.mismatch');
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await changeOwnPassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.code === 'invalid-credentials') {
        setErrors({ current: t('password.error.current') });
      } else if (cause instanceof ApiRequestError && cause.code === 'weak-password') {
        setErrors({
          next:
            cause.reason === 'too-short'
              ? t('auth.error.newPassword')
              : t('auth.error.weakPassword'),
        });
      } else {
        setErrors({ next: t('auth.error.offline') });
      }
    } finally {
      setSaving(false);
    }
  };

  const type = reveal ? 'text' : 'password';
  const revealButton = (
    <button
      type="button"
      onClick={() => setReveal((value) => !value)}
      aria-label={reveal ? t('auth.hidePassword') : t('auth.showPassword')}
      className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-sage-100"
    >
      {reveal ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
    </button>
  );

  return (
    <form onSubmit={submit} noValidate aria-label={t('password.title')} className="space-y-4">
      <p className="text-base text-ink-soft">{t('password.desc')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('password.current')}
          type={type}
          value={current}
          onChange={(event) => {
            setCurrent(event.target.value);
            clear('current');
          }}
          autoComplete="current-password"
          iconLeft={<KeyRound className="size-5" />}
          error={errors.current}
          trailing={revealButton}
        />
        <div className="hidden sm:block" aria-hidden />
        <TextField
          label={t('password.new')}
          type={type}
          value={next}
          onChange={(event) => {
            setNext(event.target.value);
            clear('next');
          }}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          hint={t('auth.newPasswordHint')}
          iconLeft={<KeyRound className="size-5" />}
          error={errors.next}
        />
        <TextField
          label={t('password.confirm')}
          type={type}
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            clear('confirm');
          }}
          autoComplete="new-password"
          iconLeft={<KeyRound className="size-5" />}
          error={errors.confirm}
        />
      </div>

      {done ? (
        <p
          role="status"
          className="rounded-[var(--radius-control)] bg-sage-100 p-3 text-base font-semibold text-ink"
        >
          {t('password.done')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? t('password.changing') : t('password.change')}
        </Button>
      </div>

      <p className="text-sm text-ink-muted">{t('password.note')}</p>
      <p className="text-sm text-ink-muted">
        {role === 'patient' ? t('password.patientNote') : t('password.caregiverNote')}
      </p>
    </form>
  );
}

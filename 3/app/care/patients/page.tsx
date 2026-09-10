'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Info,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Portrait } from '@/components/features/portrait';
import { STAGE_KEY, STAGE_TONE } from '@/components/features/cognitive';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { LANGUAGE_LIST, type LanguageCode } from '@/lib/i18n/languages';
import { ApiRequestError } from '@/lib/api/client';
import { suggestPassword } from '@/lib/utils/password';
import type { PatientProfile } from '@/lib/types';

/**
 * Everyone this caregiver looks after, and the only place a patient account is
 * created, switched between or deleted.
 *
 * Patients cannot register themselves, so this screen is where their login comes
 * from: the caregiver sets an email and an initial password, the server hashes it,
 * and the caregiver hands the pair over. Nothing here ever reads a password back
 * — a forgotten one is replaced, not recovered.
 *
 * One patient is "active" at a time and every other caregiver screen reads that
 * one person's data, which is what keeps two patients' records from ever being
 * shown side by side and mistaken for each other.
 */
export default function CaregiverPatientsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    hydrated,
    patients,
    patient,
    caregiver,
    selectPatient,
    addPatient,
    removePatient,
    resetPatientPassword,
  } = useAppState();

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  /** Shown once, straight after creation, so the caregiver can pass it on. */
  const [handover, setHandover] = useState<{ name: string; email: string; password: string } | null>(
    null,
  );

  const activeId = patient?.id ?? null;

  /**
   * Searching filters the caregiver's own list, in the browser. It cannot reach
   * another caregiver's patients because this list only ever holds their own —
   * the server decided that before it was sent.
   */
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return patients;
    return patients.filter((person) => person.name.toLowerCase().includes(needle));
  }, [patients, query]);

  const addButton = (
    <Button
      size="lg"
      onClick={() => {
        setAdding(true);
        setHandover(null);
      }}
      iconLeft={<Plus aria-hidden className="size-5" />}
    >
      {t('patients.add')}
    </Button>
  );

  /** Switch, then go where the caregiver asked to go — never the other way round. */
  const openProfile = (id: string) => {
    selectPatient(id);
    router.push('/care/profile');
  };

  /**
   * The per-patient page re-checks ownership on the server before it shows
   * anything, so this link is safe to hand out and safe to bookmark.
   */
  const openDetail = (id: string) => {
    router.push(`/care/patients/${id}`);
  };

  const confirmRemove = async (person: PatientProfile) => {
    setBusyId(person.id);
    setRemoveError(null);
    try {
      await removePatient(person.id);
    } catch {
      setRemoveError(t('patients.error.remove', { name: person.name }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-4">
      <PageHeader
        title={t('patients.title')}
        subtitle={t('patients.subtitle')}
        icon={<Users className="size-6" />}
        action={adding ? undefined : addButton}
      />

      {adding ? (
        <div className="mb-6">
          <AddPatientForm
            defaultLanguage={caregiver?.language ?? 'en'}
            onCancel={() => setAdding(false)}
            onCreated={(created, credentials) => {
              setAdding(false);
              setQuery('');
              setHandover({ name: created.name, ...credentials });
            }}
          />
        </div>
      ) : null}

      {handover ? (
        <Card tone="sage" className="mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-sage-700" />
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
                {t('patients.credentialsReady', { name: handover.name })}
              </h2>
              <p className="mt-1 text-base text-ink-soft">{t('patients.credentialsReadyDesc')}</p>
              <dl className="mt-3 grid gap-2 text-base">
                <div className="flex flex-wrap items-baseline gap-2">
                  <dt className="text-ink-soft">{t('patients.email')}</dt>
                  <dd className="font-semibold break-all text-ink">{handover.email}</dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <dt className="text-ink-soft">{t('patients.initialPassword')}</dt>
                  <dd className="font-mono font-semibold text-ink">{handover.password}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button
                  size="md"
                  onClick={() => {
                    setHandover(null);
                    router.push('/care/profile');
                  }}
                  iconLeft={<Pencil aria-hidden className="size-5" />}
                >
                  {t('patients.edit')}
                </Button>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => setHandover(null)}
                  iconLeft={<Check aria-hidden className="size-5" />}
                >
                  {t('common.done')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {!hydrated ? (
        <LoadingState label={t('state.loading')} rows={2} />
      ) : patients.length === 0 ? (
        <EmptyState
          icon={<Users className="size-7" />}
          title={t('patients.empty')}
          description={t('patients.emptyDesc')}
          action={adding ? undefined : addButton}
        />
      ) : (
        <div className="space-y-5">
          <Card tone="sunken">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="sage" icon={<Users className="size-4" />}>
                {patients.length === 1
                  ? t('patients.countOne')
                  : t('patients.count', { count: patients.length })}
              </Badge>
              {patient ? (
                <Badge tone="sky" icon={<UserRound className="size-4" />}>
                  {t('patients.selected', { name: patient.name })}
                </Badge>
              ) : null}
            </div>

            {/* Searching is only worth the space once there are several people. */}
            {patients.length > 2 ? (
              <div className="mt-4">
                <TextField
                  label={t('patients.search')}
                  placeholder={t('patients.searchPlaceholder')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type="search"
                  autoComplete="off"
                  iconLeft={<Search className="size-5" />}
                  hint={t('patients.searchScope')}
                />
              </div>
            ) : null}
          </Card>

          {removeError ? (
            <Card tone="sunken" className="border border-danger/30 bg-danger-soft/40">
              <p className="text-base font-semibold text-ink">{removeError}</p>
            </Card>
          ) : null}

          {matches.length === 0 ? (
            <EmptyState
              icon={<Search className="size-7" />}
              title={t('patients.searchNone', { query: query.trim() })}
              description={t('patients.searchNoneDesc')}
              action={
                <Button size="lg" variant="secondary" onClick={() => setQuery('')}>
                  {t('patients.searchClear')}
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-4 xl:grid-cols-2">
              {matches.map((person) => (
                <li key={person.id}>
                  <PatientCard
                    person={person}
                    active={person.id === activeId}
                    // A caregiver account with nobody in it is a dead end, so the
                    // last patient cannot be removed — only edited.
                    removable={patients.length > 1}
                    busy={busyId === person.id}
                    onOpen={() => openDetail(person.id)}
                    onEdit={() => openProfile(person.id)}
                    onConfirmRemove={() => void confirmRemove(person)}
                    onResetPassword={(password) => resetPatientPassword(person.id, password)}
                  />
                </li>
              ))}
            </ul>
          )}

          <Card tone="sunken">
            <p className="flex items-start gap-3 text-base text-ink-soft">
              <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
              {t('patients.separation')}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function PatientCard({
  person,
  active,
  removable,
  busy,
  onOpen,
  onEdit,
  onConfirmRemove,
  onResetPassword,
}: {
  person: PatientProfile;
  active: boolean;
  removable: boolean;
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onConfirmRemove: () => void;
  onResetPassword: (password: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<'none' | 'remove' | 'password'>('none');
  const stage = person.cognitive.stage;

  return (
    <Card tone={active ? 'sage' : 'plain'} className={active ? 'ring-2 ring-sage-300' : undefined}>
      <div className="flex items-start gap-4">
        <Portrait
          seed={person.avatarSeed}
          name={person.name}
          photo={person.photo}
          size={72}
          labelled={false}
        />

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">{person.name}</h2>
          {person.age ? (
            <p className="text-base text-ink-soft">{t('patient.ageYears', { count: person.age })}</p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {active ? <Badge tone="sky">{t('patients.viewing')}</Badge> : null}
            <Badge tone={STAGE_TONE[stage]}>{t(STAGE_KEY[stage])}</Badge>
            {person.userId ? null : <Badge tone="clay">{t('patients.noLogin')}</Badge>}
          </div>

          {person.notes ? (
            <p className="mt-2.5 line-clamp-2 text-base text-ink-soft">{person.notes}</p>
          ) : null}
        </div>
      </div>

      {panel === 'remove' ? (
        // Named, and spelling out what goes with them, because this cascade
        // deletes activity, reminders, people and results for that person.
        <div
          role="group"
          aria-label={t('patients.removeConfirm', { name: person.name })}
          className="mt-4 rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft/40 p-4"
        >
          <p className="text-base font-semibold text-ink">
            {t('patients.removeConfirm', { name: person.name })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button
              size="md"
              variant="danger"
              disabled={busy}
              onClick={onConfirmRemove}
              iconLeft={<Trash2 aria-hidden className="size-5" />}
            >
              {busy
                ? t('patients.removing', { name: person.name })
                : t('patients.removeAction', { name: person.name })}
            </Button>
            <Button
              size="md"
              variant="secondary"
              disabled={busy}
              onClick={() => setPanel('none')}
              iconLeft={<X aria-hidden className="size-5" />}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : panel === 'password' ? (
        <ResetPasswordPanel
          person={person}
          onCancel={() => setPanel('none')}
          onSubmit={onResetPassword}
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button size="md" onClick={onOpen} iconLeft={<UserRound aria-hidden className="size-5" />}>
            {t('patients.open', { name: person.name })}
          </Button>
          <Button
            size="md"
            variant="secondary"
            onClick={onEdit}
            iconLeft={<Pencil aria-hidden className="size-5" />}
          >
            {t('patients.edit')}
          </Button>
          {person.userId ? (
            <Button
              size="md"
              variant="ghost"
              onClick={() => setPanel('password')}
              iconLeft={<KeyRound aria-hidden className="size-5" />}
            >
              {t('patients.resetPassword')}
            </Button>
          ) : null}
          {removable ? (
            <Button
              size="md"
              variant="ghost"
              onClick={() => setPanel('remove')}
              iconLeft={<Trash2 aria-hidden className="size-5" />}
              className="text-danger hover:bg-danger-soft"
            >
              {t('patients.remove')}
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}

/**
 * Replacing a patient's password.
 *
 * There is no "show current password" here and there never can be: the server
 * keeps a scrypt hash, which cannot be turned back into the password. Forgetting
 * it means setting a new one.
 */
function ResetPasswordPanel({
  person,
  onCancel,
  onSubmit,
}: {
  person: PatientProfile;
  onCancel: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.trim().length < 8) {
      setError(t('patients.error.password'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(password);
      setDone(true);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError && cause.code === 'weak-password'
          ? t('patients.error.weakPassword')
          : t('patients.error.create'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="mt-4 rounded-[var(--radius-control)] border border-sage-300 bg-sage-50 p-4">
        <p className="text-base font-semibold text-ink">
          {t('patients.resetPasswordDone', { name: person.name })}
        </p>
        <p className="mt-1 font-mono text-base text-ink">{password}</p>
        <div className="mt-3">
          <Button size="md" variant="secondary" onClick={onCancel}>
            {t('common.done')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-label={t('patients.resetPassword')}
      className="mt-4 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4"
    >
      <p className="text-base font-semibold text-ink">{t('patients.resetPassword')}</p>
      <p className="mt-1 text-base text-ink-soft">
        {t('patients.resetPasswordDesc', { name: person.name })}
      </p>
      <div className="mt-3 max-w-sm">
        <TextField
          label={t('patients.initialPassword')}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (error) setError('');
          }}
          error={error || undefined}
          hint={t('patients.initialPasswordHint')}
          autoComplete="new-password"
          iconLeft={<KeyRound className="size-5" />}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <Button type="submit" size="md" disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button
          type="button"
          size="md"
          variant="secondary"
          onClick={() => setPassword(suggestPassword())}
        >
          {t('patients.generatePassword')}
        </Button>
        <Button type="button" size="md" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Creating the account. Name, email and an initial password are the minimum —
 * without credentials the person has no way in, and only a caregiver can give
 * them one. The rest of the profile is the next screen.
 */
function AddPatientForm({
  defaultLanguage,
  onCreated,
  onCancel,
}: {
  defaultLanguage: LanguageCode;
  onCreated: (
    created: PatientProfile,
    credentials: { email: string; password: string },
  ) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { addPatient } = useAppState();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // A suggestion, not a rule: the caregiver can type their own. Offered up front
  // because "think of a password for someone else" is a real stumbling block.
  useEffect(() => {
    setPassword(suggestPassword());
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('patient.nameError');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t('patients.error.email');
    if (password.trim().length < 8) next.password = t('patients.error.password');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const parsed = Number.parseInt(age, 10);
    setSaving(true);
    setFormError('');
    try {
      const created = await addPatient({
        name: name.trim(),
        email: email.trim(),
        password,
        age: Number.isFinite(parsed) && parsed > 0 && parsed < 130 ? parsed : undefined,
        language,
      });
      onCreated(created, { email: email.trim(), password });
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.code === 'email-taken') {
        setErrors({ email: t('patients.error.emailTaken') });
      } else if (cause instanceof ApiRequestError && cause.code === 'weak-password') {
        setErrors({ password: t('patients.error.weakPassword') });
      } else if (cause instanceof ApiRequestError && cause.code === 'invalid-email') {
        setErrors({ email: t('patients.error.email') });
      } else {
        setFormError(t('patients.error.create'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="form" onSubmit={submit} aria-label={t('patients.addTitle')}>
      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
        {t('patients.addTitle')}
      </h2>
      <p className="mt-1 text-base text-ink-soft">{t('patients.addSubtitle')}</p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('patient.name')}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (errors.name) setErrors({ ...errors, name: undefined });
          }}
          error={errors.name}
          autoComplete="off"
          iconLeft={<UserRound className="size-5" />}
        />
        <TextField
          label={`${t('patient.age')} · ${t('common.optional')}`}
          value={age}
          onChange={(event) => setAge(event.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
          autoComplete="off"
        />
        <SelectField
          label={t('patient.language')}
          value={language}
          onChange={(event) => setLanguage(event.target.value as LanguageCode)}
          className="sm:col-span-2 sm:max-w-sm"
        >
          {LANGUAGE_LIST.map((definition) => (
            <option key={definition.code} value={definition.code}>
              {definition.nativeName} · {definition.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-6 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <KeyRound aria-hidden className="size-5 text-ink-muted" />
          {t('patients.accountTitle')}
        </h3>
        <p className="mt-1 text-base text-ink-soft">{t('patients.accountDesc')}</p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField
            label={t('patients.email')}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            error={errors.email}
            hint={t('patients.emailHint')}
            type="email"
            autoComplete="off"
            iconLeft={<Mail className="size-5" />}
          />
          <div>
            <TextField
              label={t('patients.initialPassword')}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              hint={t('patients.initialPasswordHint')}
              autoComplete="off"
              iconLeft={<KeyRound className="size-5" />}
            />
            <div className="mt-2">
              <Button
                type="button"
                size="md"
                variant="ghost"
                onClick={() => setPassword(suggestPassword())}
              >
                {t('patients.generatePassword')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {formError ? (
        <p role="alert" className="mt-4 text-base font-semibold text-danger">
          {formError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </Button>
      </div>
    </Card>
  );
}

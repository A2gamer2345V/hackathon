'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Info,
  Pencil,
  Plus,
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
import type { PatientProfile } from '@/lib/types';

/**
 * Everyone this caregiver looks after, and the only place a patient is added,
 * switched between or removed.
 *
 * One patient is "active" at a time and every other caregiver screen reads that
 * one person's data — which is what keeps two patients' records from ever being
 * shown side by side and mistaken for each other. Switching here is what changes
 * whose activity, reminders, family and results the rest of the app is showing.
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
  } = useAppState();

  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const activeId = patient?.id ?? null;

  const addButton = (
    <Button
      size="lg"
      onClick={() => {
        setAdding(true);
        setConfirming(null);
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
            onSubmit={(draft) => {
              // `addPatient` also makes the new person active, which is almost
              // always what a caregiver wants next: fill in their details.
              addPatient(draft);
              setAdding(false);
              router.push('/care/profile');
            }}
          />
        </div>
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
          </Card>

          <ul className="grid gap-4 xl:grid-cols-2">
            {patients.map((person) => (
              <li key={person.id}>
                <PatientCard
                  person={person}
                  active={person.id === activeId}
                  // A caregiver account with nobody in it is a dead end, so the
                  // last patient cannot be removed — only edited.
                  removable={patients.length > 1}
                  confirming={confirming === person.id}
                  onSelect={() => selectPatient(person.id)}
                  onEdit={() => openProfile(person.id)}
                  onAskRemove={() => setConfirming(person.id)}
                  onCancelRemove={() => setConfirming(null)}
                  onConfirmRemove={() => {
                    removePatient(person.id);
                    setConfirming(null);
                  }}
                />
              </li>
            ))}
          </ul>

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
  confirming,
  onSelect,
  onEdit,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
}: {
  person: PatientProfile;
  active: boolean;
  removable: boolean;
  confirming: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
}) {
  const { t } = useTranslation();
  const stage = person.cognitive.stage;

  return (
    <Card
      tone={active ? 'sage' : 'plain'}
      className={active ? 'ring-2 ring-sage-300' : undefined}
    >
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
          </div>

          {person.notes ? (
            <p className="mt-2.5 line-clamp-2 text-base text-ink-soft">{person.notes}</p>
          ) : null}
        </div>
      </div>

      {confirming ? (
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
              onClick={onConfirmRemove}
              iconLeft={<Trash2 aria-hidden className="size-5" />}
            >
              {t('patients.removeAction', { name: person.name })}
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={onCancelRemove}
              iconLeft={<X aria-hidden className="size-5" />}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {active ? null : (
            <Button size="md" onClick={onSelect} iconLeft={<UserRound aria-hidden className="size-5" />}>
              {t('patients.open', { name: person.name })}
            </Button>
          )}
          <Button
            size="md"
            variant="secondary"
            onClick={onEdit}
            iconLeft={<Pencil aria-hidden className="size-5" />}
          >
            {t('patients.edit')}
          </Button>
          {removable ? (
            <Button
              size="md"
              variant="ghost"
              onClick={onAskRemove}
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
 * Just enough to create the record. The full profile — photo, contacts,
 * cognitive information, what they like — is the next screen, which is where the
 * caregiver lands straight after saving.
 */
function AddPatientForm({
  defaultLanguage,
  onSubmit,
  onCancel,
}: {
  defaultLanguage: LanguageCode;
  onSubmit: (draft: { name: string; age?: number; language: LanguageCode }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage);
  const [nameError, setNameError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError(t('patient.nameError'));
      return;
    }
    const parsed = Number.parseInt(age, 10);
    onSubmit({
      name: name.trim(),
      age: Number.isFinite(parsed) && parsed > 0 && parsed < 130 ? parsed : undefined,
      language,
    });
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
            if (nameError) setNameError('');
          }}
          error={nameError || undefined}
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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg">
          {t('common.save')}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </Card>
  );
}

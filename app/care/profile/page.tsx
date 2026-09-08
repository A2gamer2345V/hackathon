'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Check,
  Heart,
  Info,
  Phone,
  ShieldAlert,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { PhotoField } from '@/components/features/photo-field';
import { STAGES, STAGE_KEY, STAGE_TONE } from '@/components/features/cognitive';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/field';
import { TagListField } from '@/components/ui/tag-list-field';
import { LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { LANGUAGE_LIST, type LanguageCode } from '@/lib/i18n/languages';
import { INTEREST_TAGS } from '@/lib/types';
import type {
  CognitiveStage,
  InterestTag,
  PatientPreferences,
  PatientProfile,
} from '@/lib/types';

/**
 * Everything the caregiver knows about the person they support, in one place:
 * who they are, how to reach help, what an assessment recorded, and what they
 * actually enjoy.
 *
 * Two of these sections feed the adaptive engine, and they feed it differently.
 * The cognitive record is *reference information a person entered* — the app
 * never writes to it, never infers a stage, and never presents a trend in game
 * results as a diagnosis. What they like changes only the pictures and themes an
 * activity uses, so the exercises feel like theirs.
 *
 * Everything saves as it is changed, against the active patient only.
 */
export default function CaregiverProfilePage() {
  const { t } = useTranslation();
  const { hydrated, patient, updatePatient } = useAppState();

  if (!hydrated) {
    return (
      <div className="pb-4">
        <PageHeader title={t('patient.profile')} subtitle={t('patient.profileDesc')} />
        <LoadingState label={t('state.loading')} rows={3} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="pb-4">
        <PageHeader title={t('patient.profile')} subtitle={t('patient.profileDesc')} />
        <Card tone="sunken">
          <p className="text-lg text-ink-soft">{t('patients.emptyDesc')}</p>
          <Link
            href="/care/patients"
            className="mt-3 inline-flex min-h-[3rem] items-center font-semibold text-sage-700 underline"
          >
            {t('patients.title')}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('patient.profile')}
        subtitle={t('patient.profileDesc')}
        icon={<UserRound className="size-6" />}
        action={
          <Badge tone="sky" icon={<UserRound className="size-4" />}>
            {t('patients.selected', { name: patient.name })}
          </Badge>
        }
      />

      <div className="space-y-6">
        <IdentitySection
          key={`identity-${patient.id}`}
          patient={patient}
          onChange={updatePatient}
        />
        <CognitiveSection key={`cognitive-${patient.id}`} patient={patient} onChange={updatePatient} />
        <PreferencesSection
          key={`prefs-${patient.id}`}
          patient={patient}
          onChange={updatePatient}
        />
      </div>
    </div>
  );
}

/** Every section edits the active patient through the same call. */
type Save = (patch: Partial<PatientProfile>) => void;

/**
 * A quiet "Saved" acknowledgement.
 *
 * These forms write as you type, which is right for a caregiver correcting one
 * field — but silent saving leaves people wondering, so each section says so.
 */
function SavedNote({ shown }: { shown: boolean }) {
  const { t } = useTranslation();
  return (
    <p aria-live="polite" className="mt-4 min-h-6 text-sm font-semibold text-sage-700">
      {shown ? (
        <span className="inline-flex items-center gap-1.5">
          <Check aria-hidden className="size-4" />
          {t('patients.saved')}
        </span>
      ) : null}
    </p>
  );
}

// ------------------------------------------------------------------- identity

function IdentitySection({ patient, onChange }: { patient: PatientProfile; onChange: Save }) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);

  const save = (patch: Partial<PatientProfile>) => {
    onChange(patch);
    setTouched(true);
  };

  return (
    <Card>
      <CardHeader
        title={t('patient.profile')}
        description={t('patient.photoHint')}
        icon={<UserRound aria-hidden className="size-6 text-sage-700" />}
      />

      <div className="mt-5 space-y-5">
        <PhotoField
          value={patient.photo}
          onChange={(photo) => save({ photo })}
          seed={patient.avatarSeed}
          name={patient.name}
          size={112}
          chooseLabel={t('patient.photoAdd')}
          replaceLabel={t('patient.photoChange')}
          removeLabel={t('patient.photoRemove')}
          hint={t('patient.photoHint')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={t('patient.name')}
            value={patient.name}
            // Blank would leave the person nameless everywhere, so an empty box
            // simply is not saved — the last good name stays.
            onChange={(event) => {
              const next = event.target.value;
              if (next.trim()) save({ name: next });
            }}
            autoComplete="off"
            iconLeft={<UserRound className="size-5" />}
          />
          <TextField
            label={t('patient.age')}
            value={patient.age ? String(patient.age) : ''}
            onChange={(event) => {
              const digits = event.target.value.replace(/[^0-9]/g, '').slice(0, 3);
              const parsed = Number.parseInt(digits, 10);
              save({ age: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined });
            }}
            inputMode="numeric"
            autoComplete="off"
          />
          <TextField
            label={`${t('patient.contact')} · ${t('common.optional')}`}
            value={patient.contactPhone ?? ''}
            onChange={(event) => save({ contactPhone: event.target.value || undefined })}
            type="tel"
            autoComplete="off"
            iconLeft={<Phone className="size-5" />}
          />
          <SelectField
            label={t('patient.language')}
            value={patient.language}
            onChange={(event) => save({ language: event.target.value as LanguageCode })}
          >
            {LANGUAGE_LIST.map((definition) => (
              <option key={definition.code} value={definition.code}>
                {definition.nativeName} · {definition.name}
              </option>
            ))}
          </SelectField>
        </div>

        {/* ------------------------------------------------- emergency contact */}
        <fieldset className="rounded-[var(--radius-control)] border border-sun-300/70 bg-sun-100/60 p-4">
          <legend className="flex items-center gap-2 px-1 text-base font-semibold text-ink">
            <ShieldAlert aria-hidden className="size-5 text-sun-600" />
            {t('patient.emergency')}
          </legend>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <TextField
              label={t('patient.emergencyName')}
              value={patient.emergencyContactName ?? ''}
              onChange={(event) => save({ emergencyContactName: event.target.value || undefined })}
              autoComplete="off"
            />
            <TextField
              label={t('patient.emergencyPhone')}
              value={patient.emergencyContactPhone ?? ''}
              onChange={(event) => save({ emergencyContactPhone: event.target.value || undefined })}
              type="tel"
              autoComplete="off"
              iconLeft={<Phone className="size-5" />}
            />
          </div>
        </fieldset>

        <TextAreaField
          label={`${t('patient.notes')} · ${t('common.optional')}`}
          hint={t('patient.notesHint')}
          value={patient.notes ?? ''}
          onChange={(event) => save({ notes: event.target.value || undefined })}
          rows={4}
        />
      </div>

      <SavedNote shown={touched} />
    </Card>
  );
}

// ------------------------------------------------------------------ cognitive

function CognitiveSection({ patient, onChange }: { patient: PatientProfile; onChange: Save }) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const record = patient.cognitive;

  const save = (patch: Partial<typeof record>) => {
    onChange({ cognitive: { ...record, ...patch } });
    setTouched(true);
  };

  return (
    <Card tone="sky">
      <CardHeader
        title={t('cognitive.title')}
        description={t('cognitive.desc')}
        icon={<Brain aria-hidden className="size-6 text-sky-600" />}
        action={
          <Badge tone={STAGE_TONE[record.stage]}>{t(STAGE_KEY[record.stage])}</Badge>
        }
      />

      <div className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <SelectField
            label={t('cognitive.stage')}
            value={record.stage}
            onChange={(event) => save({ stage: event.target.value as CognitiveStage })}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {t(STAGE_KEY[stage])}
              </option>
            ))}
          </SelectField>
          <TextField
            label={`${t('cognitive.assessedOn')} · ${t('common.optional')}`}
            value={record.assessedOn ?? ''}
            onChange={(event) => save({ assessedOn: event.target.value || undefined })}
            type="date"
          />
          <TextField
            label={`${t('cognitive.assessedBy')} · ${t('common.optional')}`}
            hint={t('cognitive.assessedByHint')}
            value={record.assessedBy ?? ''}
            onChange={(event) => save({ assessedBy: event.target.value || undefined })}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TagListField
            label={t('cognitive.difficultyAreas')}
            hint={t('cognitive.areasHint')}
            values={record.difficultyAreas}
            onChange={(difficultyAreas) => save({ difficultyAreas })}
          />
          <TagListField
            label={t('cognitive.strengthAreas')}
            hint={t('cognitive.areasHint')}
            values={record.strengthAreas}
            onChange={(strengthAreas) => save({ strengthAreas })}
          />
        </div>

        <TextAreaField
          label={t('cognitive.observations')}
          hint={t('cognitive.observationsHint')}
          value={record.observations}
          onChange={(event) => save({ observations: event.target.value })}
          rows={4}
        />

        {/* Stated on the screen itself, not buried in a policy page: this record
            is the caregiver's, and the app's own trend reporting is a separate
            thing that never becomes a diagnosis. */}
        <p className="flex items-start gap-3 rounded-[var(--radius-control)] bg-white/70 p-4 text-base text-ink-soft">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-sky-600" />
          {t('cognitive.disclaimer')}
        </p>
      </div>

      <SavedNote shown={touched} />
    </Card>
  );
}

// ---------------------------------------------------------------- preferences

function PreferencesSection({ patient, onChange }: { patient: PatientProfile; onChange: Save }) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const prefs = patient.preferences;

  const save = (patch: Partial<PatientPreferences>) => {
    onChange({ preferences: { ...prefs, ...patch } });
    setTouched(true);
  };

  const toggleInterest = (tag: InterestTag) => {
    save({
      interests: prefs.interests.includes(tag)
        ? prefs.interests.filter((existing) => existing !== tag)
        : [...prefs.interests, tag],
    });
  };

  const themed = prefs.interests.map((tag) => t(`interest.${tag}`)).join(', ');

  return (
    <Card tone="lilac">
      <CardHeader
        title={t('prefs.title')}
        description={t('prefs.subtitle')}
        icon={<Heart aria-hidden className="size-6 text-lilac-600" />}
      />

      <div className="mt-5 space-y-5">
        {/* ------------------------------------------------------- interests */}
        <fieldset>
          <legend className="text-base font-semibold text-ink">{t('prefs.interests')}</legend>
          <p className="mt-1 text-sm text-ink-muted">{t('prefs.interestsHint')}</p>

          <div className="mt-3 flex flex-wrap gap-2.5">
            {INTEREST_TAGS.map((tag) => {
              const on = prefs.interests.includes(tag);
              // The checkbox lives inside the label, so the ring comes from
              // `focus-within` rather than the `peer-*` pattern used elsewhere.
              return (
                <label
                  key={tag}
                  className={
                    on
                      ? 'inline-flex min-h-[3rem] cursor-pointer items-center gap-2 rounded-full border border-lilac-600 bg-lilac-500 px-4 py-2 font-semibold text-ink-inverse focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-lilac-600'
                      : 'inline-flex min-h-[3rem] cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface-raised px-4 py-2 font-semibold text-ink hover:border-lilac-200 hover:bg-lilac-50 focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-lilac-600'
                  }
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleInterest(tag)}
                    className="sr-only"
                  />
                  {on ? <Check aria-hidden className="size-4" /> : null}
                  {t(`interest.${tag}`)}
                </label>
              );
            })}
          </div>

          <p className="mt-3 flex items-start gap-2.5 text-base text-ink-soft">
            <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-lilac-600" />
            {themed ? t('prefs.themedNow', { list: themed }) : t('prefs.noneYet')}
          </p>
        </fieldset>

        {/* ----------------------------------------------------- their words */}
        <div className="grid gap-5 sm:grid-cols-2">
          <TagListField
            label={t('prefs.colours')}
            values={prefs.favouriteColours}
            onChange={(favouriteColours) => save({ favouriteColours })}
          />
          <TagListField
            label={t('prefs.foods')}
            values={prefs.favouriteFoods}
            onChange={(favouriteFoods) => save({ favouriteFoods })}
          />
          <TagListField
            label={t('prefs.music')}
            values={prefs.favouriteMusic}
            onChange={(favouriteMusic) => save({ favouriteMusic })}
          />
          <TagListField
            label={t('prefs.places')}
            values={prefs.favouritePlaces}
            onChange={(favouritePlaces) => save({ favouritePlaces })}
          />
          <TagListField
            label={t('prefs.films')}
            values={prefs.favouriteFilms}
            onChange={(favouriteFilms) => save({ favouriteFilms })}
          />
          <TagListField
            label={t('prefs.people')}
            values={prefs.favouritePeople}
            onChange={(favouritePeople) => save({ favouritePeople })}
          />
          <TagListField
            label={t('prefs.topics')}
            values={prefs.conversationTopics}
            onChange={(conversationTopics) => save({ conversationTopics })}
          />
          <TagListField
            label={t('prefs.dislikes')}
            hint={t('prefs.dislikesHint')}
            values={prefs.dislikes}
            onChange={(dislikes) => save({ dislikes })}
          />
        </div>

        <TextAreaField
          label={t('prefs.childhood')}
          hint={t('prefs.childhoodHint')}
          value={prefs.childhoodMemories}
          onChange={(event) => save({ childhoodMemories: event.target.value })}
          rows={4}
        />

        {/* The people themselves live in the family tree, which is also the
            question bank for Faces & Names — so it is a link, not a copy. */}
        <p>
          <ButtonLink
            href="/care/family"
            variant="secondary"
            size="md"
            iconLeft={<Users aria-hidden className="size-5" />}
          >
            {t('family.title')}
          </ButtonLink>
        </p>
      </div>

      <SavedNote shown={touched} />
    </Card>
  );
}

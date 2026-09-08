'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SelectField, TextAreaField, TextField, ToggleField } from '@/components/ui/field';
import { PhotoField } from '@/components/features/photo-field';
import { RELATIONSHIPS, RELATION_KEY } from '@/components/features/relationship';
import { useTranslation } from '@/lib/providers/language-provider';
import type { FamilyDraft } from '@/lib/services/data';
import type { FamilyMember, Relationship } from '@/lib/types';

/**
 * Add or edit one person in the patient's world.
 *
 * The photo goes through the shared `PhotoField`, so it is shrunk and kept as a
 * local data URL — never uploaded, never fetched from a remote address. The
 * family tree and the Faces & Names activity both work with no network at all.
 */
export function FamilyForm({
  initial,
  patientName,
  onSubmit,
  onCancel,
}: {
  initial?: FamilyMember;
  /** Whose family this is — the relationship label reads "Relationship to Ravi". */
  patientName: string;
  onSubmit: (draft: FamilyDraft) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState(initial?.name ?? '');
  const [relationship, setRelationship] = useState<Relationship>(initial?.relationship ?? 'daughter');
  const [label, setLabel] = useState(initial?.relationshipLabel ?? '');
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [inGame, setInGame] = useState(initial?.inRecognitionGame ?? true);

  const [nameError, setNameError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError(t('family.nameError'));
      return;
    }
    onSubmit({
      name: name.trim(),
      relationship,
      // Editing a person back to a listed relationship must clear the free-text
      // label, or the tree would keep showing the word they no longer chose.
      relationshipLabel: relationship === 'other' ? label.trim() || undefined : undefined,
      photo,
      notes: notes.trim() || undefined,
      inRecognitionGame: inGame,
    });
  };

  return (
    <Card as="form" onSubmit={submit} aria-label={t(initial ? 'family.editTitle' : 'family.addTitle')}>
      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
        {t(initial ? 'family.editTitle' : 'family.addTitle')}
      </h2>

      <div className="mt-4 space-y-5">
        <PhotoField
          value={photo}
          onChange={setPhoto}
          onBusyChange={setPhotoBusy}
          seed={initial?.id ?? name ?? 'new'}
          name={name || t('family.photo')}
          chooseLabel={t('family.photoChoose')}
          replaceLabel={t('family.photoReplace')}
          removeLabel={t('family.photoRemove')}
          hint={t('family.photoHint')}
        />

        {/* ------------------------------------------------------------ fields */}
        <TextField
          label={t('family.name')}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError('');
          }}
          error={nameError || undefined}
          autoComplete="off"
          iconLeft={<UserRound className="size-5" />}
        />

        <SelectField
          label={t('family.relationship', { name: patientName })}
          value={relationship}
          onChange={(event) => setRelationship(event.target.value as Relationship)}
          className="sm:max-w-sm"
        >
          {RELATIONSHIPS.map((value) => (
            <option key={value} value={value}>
              {t(RELATION_KEY[value])}
            </option>
          ))}
        </SelectField>

        {relationship === 'other' ? (
          <TextField
            label={t('family.relationshipOther')}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            autoComplete="off"
            className="sm:max-w-sm"
          />
        ) : null}

        <TextAreaField
          label={`${t('family.notes')} · ${t('common.optional')}`}
          hint={t('family.notesHint')}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />

        <ToggleField
          label={t('family.inGame')}
          description={t('family.inGameHint')}
          checked={inGame}
          onChange={setInGame}
          icon={<UserRound className="size-5" />}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" disabled={photoBusy}>
          {t('common.save')}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </Card>
  );
}

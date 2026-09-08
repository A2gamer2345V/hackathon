'use client';

import { useMemo, useState } from 'react';
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
import { FamilyForm } from '@/components/features/family-form';
import { Portrait } from '@/components/features/portrait';
import { FAMILY_GROUPS, relationshipLabel } from '@/components/features/relationship';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAppState } from '@/lib/providers/app-state-provider';
import { useTranslation } from '@/lib/providers/language-provider';
import { MIN_RECOGNITION_PEOPLE } from '@/lib/ai/engine';
import type { FamilyDraft } from '@/lib/services/data';
import type { FamilyMember } from '@/lib/types';

type Editing = { mode: 'new' } | { mode: 'edit'; member: FamilyMember } | null;

/**
 * The family tree — the caregiver's record of the people in the patient's life.
 *
 * These records do two jobs at once, which is why they are entered here and
 * nowhere else: they draw the tree on this page, and they are the entire question
 * bank for the Faces & Names activity. Adding a granddaughter here is what makes
 * her appear in the game tomorrow.
 *
 * Everything is scoped to the caregiver's currently selected patient. `family`
 * from the provider is already that patient's list, and adding writes against
 * the same id, so two patients' people never mix.
 */
export default function CaregiverFamilyPage() {
  const { t } = useTranslation();
  const {
    hydrated,
    patient,
    family,
    recognitionPeople,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
  } = useAppState();

  const [editing, setEditing] = useState<Editing>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const patientName = patient?.name.split(' ')[0] ?? '';

  /**
   * The tree, by generation. Anyone whose relationship is not in a listed
   * generation still appears under "Friends & others" — a person is never
   * dropped just because they do not fit the shape of the page.
   */
  const groups = useMemo(() => {
    const known = new Set(FAMILY_GROUPS.flatMap((group) => group.members));
    return FAMILY_GROUPS.map((group, index) => ({
      labelKey: group.labelKey,
      people: family
        .filter(
          (person) =>
            group.members.includes(person.relationship) ||
            // The last group is the catch-all.
            (index === FAMILY_GROUPS.length - 1 && !known.has(person.relationship)),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((group) => group.people.length > 0);
  }, [family]);

  const save = (draft: FamilyDraft) => {
    if (editing?.mode === 'edit') updateFamilyMember(editing.member.id, draft);
    else addFamilyMember(draft);
    setEditing(null);
  };

  const addButton = (
    <Button
      size="lg"
      onClick={() => {
        setEditing({ mode: 'new' });
        setConfirming(null);
      }}
      iconLeft={<Plus aria-hidden className="size-5" />}
    >
      {t('family.add')}
    </Button>
  );

  return (
    <div className="pb-4">
      <PageHeader
        title={t('family.title')}
        subtitle={t('family.subtitle', { name: patientName })}
        icon={<Users className="size-6" />}
        action={editing ? undefined : addButton}
      />

      {editing ? (
        <div className="mb-6">
          <FamilyForm
            initial={editing.mode === 'edit' ? editing.member : undefined}
            patientName={patientName}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {!hydrated ? (
        <LoadingState label={t('state.loading')} rows={3} />
      ) : family.length === 0 ? (
        <EmptyState
          icon={<Users className="size-7" />}
          title={t('family.empty')}
          description={t('family.emptyDesc')}
          action={editing ? undefined : addButton}
        />
      ) : (
        <div className="space-y-6">
          {/* ------------------------------------------------------- the counts */}
          <Card tone="sunken">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="sage" icon={<Users className="size-4" />}>
                {t('family.count', { count: family.length })}
              </Badge>
              <Badge tone="neutral" icon={<UserRound className="size-4" />}>
                {t('family.inGameCount', { count: recognitionPeople, total: family.length })}
              </Badge>
            </div>

            {/* Says what is missing and what it unlocks, rather than leaving the
                caregiver to guess why the activity is not available yet. */}
            {recognitionPeople < MIN_RECOGNITION_PEOPLE ? (
              <p className="mt-3 flex items-start gap-2.5 text-base text-ink-soft">
                <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-sun-600" />
                {t('family.needsThree', { count: recognitionPeople })}
              </p>
            ) : (
              <p className="mt-3">
                <ButtonLink href="/app/games/face-names" variant="quiet" size="md">
                  {t('family.tryActivity')}
                </ButtonLink>
              </p>
            )}
          </Card>

          {/* --------------------------------------------------------- the tree */}
          {groups.map((group) => (
            <section key={group.labelKey} aria-labelledby={`group-${group.labelKey}`}>
              <h2
                id={`group-${group.labelKey}`}
                className="mb-3 font-display text-xl font-semibold text-ink sm:text-2xl"
              >
                {t(group.labelKey)}
              </h2>

              {/* The rule down the left is what makes this read as a tree — one
                  generation to a band — without turning the list into a diagram
                  a screen reader cannot follow. */}
              <ul className="space-y-3 border-l-4 border-sage-200 pl-4 sm:pl-5">
                {group.people.map((person) => (
                  <li key={person.id}>
                    <PersonCard
                      person={person}
                      confirming={confirming === person.id}
                      onEdit={() => {
                        setEditing({ mode: 'edit', member: person });
                        setConfirming(null);
                      }}
                      onAskRemove={() => setConfirming(person.id)}
                      onCancelRemove={() => setConfirming(null)}
                      onConfirmRemove={() => {
                        removeFamilyMember(person.id);
                        setConfirming(null);
                        if (editing?.mode === 'edit' && editing.member.id === person.id) {
                          setEditing(null);
                        }
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <Card tone="sunken">
            <p className="flex items-start gap-3 text-base text-ink-soft">
              <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
              {t('family.privacy')}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function PersonCard({
  person,
  confirming,
  onEdit,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
}: {
  person: FamilyMember;
  confirming: boolean;
  onEdit: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
}) {
  const { t } = useTranslation();
  const relation = relationshipLabel(person, t);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <Portrait
          seed={person.id}
          name={person.name}
          photo={person.photo}
          size={72}
          labelled={false}
        />

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-ink sm:text-xl">{person.name}</h3>
          <p className="text-base font-semibold text-sage-700">{relation}</p>

          {person.notes ? <p className="mt-2 text-base text-ink-soft">{person.notes}</p> : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {person.inRecognitionGame ? (
              <Badge tone="sage" icon={<UserRound className="size-4" />}>
                {t('family.inGameBadge')}
              </Badge>
            ) : null}
            {!person.photo ? <Badge tone="neutral">{t('family.needsPhoto')}</Badge> : null}
          </div>
        </div>
      </div>

      {confirming ? (
        // Asked on the card itself, naming the person, because removing the wrong
        // relative is not something a caregiver can undo here.
        <div
          role="group"
          aria-label={t('family.removeConfirm', { name: person.name })}
          className="mt-4 rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft/40 p-4"
        >
          <p className="text-base font-semibold text-ink">
            {t('family.removeConfirm', { name: person.name })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button
              size="md"
              variant="danger"
              onClick={onConfirmRemove}
              iconLeft={<Trash2 aria-hidden className="size-5" />}
            >
              {t('family.removeAction', { name: person.name })}
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
          <Button
            size="md"
            variant="secondary"
            onClick={onEdit}
            iconLeft={<Pencil aria-hidden className="size-5" />}
          >
            {t('family.editPerson')}
          </Button>
          <Button
            size="md"
            variant="ghost"
            onClick={onAskRemove}
            iconLeft={<Trash2 aria-hidden className="size-5" />}
            className="text-danger hover:bg-danger-soft"
          >
            {t('family.remove')}
          </Button>
        </div>
      )}
    </Card>
  );
}

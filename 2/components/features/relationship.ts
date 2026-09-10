import type { Relationship } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

/**
 * Relationships, in one place.
 *
 * The caregiver's family screen and the Faces & Names activity both need to name
 * a relationship, and they must never disagree — "Daughter" in the form and
 * "Child" in the game would make the activity feel broken. The order here is the
 * order the select offers, closest relations first.
 */

export const RELATION_KEY: Record<Relationship, TranslationKey> = {
  wife: 'relation.wife',
  husband: 'relation.husband',
  son: 'relation.son',
  daughter: 'relation.daughter',
  brother: 'relation.brother',
  sister: 'relation.sister',
  mother: 'relation.mother',
  father: 'relation.father',
  grandson: 'relation.grandson',
  granddaughter: 'relation.granddaughter',
  friend: 'relation.friend',
  neighbour: 'relation.neighbour',
  carer: 'relation.carer',
  other: 'relation.other',
};

export const RELATIONSHIPS = Object.keys(RELATION_KEY) as Relationship[];

/**
 * The generations of the tree, oldest first — which is how a family tree is
 * drawn, and how a caregiver scanning the page expects to read it.
 */
export const FAMILY_GROUPS: { labelKey: TranslationKey; members: Relationship[] }[] = [
  { labelKey: 'family.groupParents', members: ['mother', 'father'] },
  { labelKey: 'family.groupPartner', members: ['wife', 'husband'] },
  { labelKey: 'family.groupSiblings', members: ['brother', 'sister'] },
  { labelKey: 'family.groupChildren', members: ['son', 'daughter'] },
  { labelKey: 'family.groupGrandchildren', members: ['grandson', 'granddaughter'] },
  { labelKey: 'family.groupOthers', members: ['friend', 'neighbour', 'carer', 'other'] },
];

/**
 * What to call this person's relationship.
 *
 * A caregiver who chose "Other" typed their own word for it — "Nephew",
 * "Neighbour's daughter" — and that word wins over the generic label, because it
 * is the one the patient would recognise.
 */
export function relationshipLabel(
  person: { relationship: Relationship; relationshipLabel?: string },
  t: (key: TranslationKey) => string,
): string {
  if (person.relationship === 'other' && person.relationshipLabel?.trim()) {
    return person.relationshipLabel.trim();
  }
  return t(RELATION_KEY[person.relationship]);
}

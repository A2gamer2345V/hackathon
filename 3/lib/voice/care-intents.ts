/**
 * The caregiver assistant's controlled intent layer.
 *
 * Deliberately a separate union from the patient companion's `Intent`. The two
 * audiences share a voice pipeline but nothing else: the patient side can change
 * speech speed and text size, the caregiver side can move between records and
 * read figures back. Keeping the enums apart means a phrase that means one thing
 * on one side cannot fire the other side's action, and neither list can grow
 * accidental members of the other.
 *
 * As on the patient side, recognised text never reaches the router or the
 * application. It is resolved to one of these values first, and every branch is
 * written out by hand.
 */

export const CARE_INTENTS = [
  // navigation
  'CARE_DASHBOARD',
  'CARE_ACTIVITY',
  'CARE_PROGRESS',
  'CARE_INSIGHTS',
  'CARE_PERFORMANCE',
  'CARE_ALERTS',
  'CARE_REMINDERS',
  'CARE_PATIENTS',
  'CARE_FAMILY',
  'CARE_PROFILE',
  'CARE_SETTINGS',
  // questions answered from the record on screen
  'CARE_SUMMARY',
  'CARE_NEXT_REMINDER',
  'CARE_ALERT_COUNT',
  'CARE_WHO',
  // actions
  'CARE_SWITCH_PATIENT',
  'CARE_BACK',
  'CARE_REPEAT',
  'CARE_STOP',
  'CARE_HELP',
  'UNKNOWN',
] as const;

export type CareIntent = (typeof CARE_INTENTS)[number];

/** Where an intent navigates to, when it navigates at all. */
export const CARE_ROUTES: Partial<Record<CareIntent, string>> = {
  CARE_DASHBOARD: '/care',
  CARE_ACTIVITY: '/care/activity',
  CARE_PROGRESS: '/care/progress',
  CARE_INSIGHTS: '/care/insights',
  CARE_PERFORMANCE: '/care/performance',
  CARE_ALERTS: '/care/alerts',
  CARE_REMINDERS: '/care/reminders',
  CARE_PATIENTS: '/care/patients',
  CARE_FAMILY: '/care/family',
  CARE_PROFILE: '/care/profile',
  CARE_SETTINGS: '/care/settings',
};

export function isCareIntent(value: unknown): value is CareIntent {
  return typeof value === 'string' && (CARE_INTENTS as readonly string[]).includes(value);
}

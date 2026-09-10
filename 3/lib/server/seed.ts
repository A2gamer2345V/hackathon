import {
  DEMO_CAREGIVER_ID,
  DEMO_PATIENT_A_ID,
  DEMO_PATIENT_B_ID,
  demoAchievements,
  demoAlerts,
  demoCareCircle,
  demoDailyActivities,
  demoFamilyMembers,
  demoGameSessions,
  demoPatientA,
  demoPatientB,
  demoReminders,
} from '@/lib/data/demo';
import { queryOne } from './db';
import {
  createCaregiver,
  createPatient,
  putRecords,
  updateCaregiverProfile,
  updatePatientProfile,
} from './repo';

/**
 * The two demo accounts, in the real database, kept strictly apart from real ones.
 *
 * They exist so the app can be demonstrated without inventing an account first.
 * What makes them safe is that they are ordinary rows flagged `is_demo = 1`: a
 * caregiver who registers for real gets their own fresh `users`/`caregivers` pair
 * and cannot end up pointed at these. The old bug — a new account silently
 * adopting the seeded caregiver's identity and patients — is not expressible
 * against this schema, because ownership is a foreign key rather than a fallback.
 *
 * The demo password is fixed and printed on the login screen. That is fine: these
 * two accounts contain invented people and nothing else.
 */

export const DEMO_CAREGIVER_EMAIL = 'meera@demo.elderease';
export const DEMO_PATIENT_EMAIL = 'ravi@demo.elderease';
export const DEMO_PASSWORD = 'Demo@1234';

/** Where the demo data is dated from. Kolkata, because the invented family is there. */
const DEMO_TIMEZONE = 'Asia/Kolkata';

const DEMO_CAREGIVER_USER_ID = 'user_meera';
const DEMO_PATIENT_USER_ID = 'user_ravi';

function alreadySeeded(): boolean {
  return queryOne<{ id: string }>('SELECT id FROM caregivers WHERE id = ?', DEMO_CAREGIVER_ID) !== null;
}

/**
 * Creates the demo caregiver, her two patients and their history — once.
 *
 * Called from the route handlers rather than at import time, so a cold start does
 * not do database work until something actually asks.
 */
export function ensureDemoSeed(): void {
  if (alreadySeeded()) return;

  createCaregiver({
    name: 'Meera Sharma',
    email: DEMO_CAREGIVER_EMAIL,
    password: DEMO_PASSWORD,
    phone: '+91 98765 43210',
    timezone: DEMO_TIMEZONE,
    language: 'en',
    relationToPatient: 'Daughter',
    demo: { userId: DEMO_CAREGIVER_USER_ID, caregiverId: DEMO_CAREGIVER_ID },
  });

  // Patient A has a login of their own — that is the "Demo as Patient" door.
  const { id: _aId, userId: _aUser, ...profileA } = demoPatientA;
  createPatient({
    caregiverId: DEMO_CAREGIVER_ID,
    name: demoPatientA.name,
    email: DEMO_PATIENT_EMAIL,
    password: DEMO_PASSWORD,
    timezone: DEMO_TIMEZONE,
    profile: profileA,
    demo: { userId: DEMO_PATIENT_USER_ID, patientId: DEMO_PATIENT_A_ID },
  });

  // Patient B has no login: a caregiver added her without giving her a device.
  const { id: _bId, userId: _bUser, ...profileB } = demoPatientB;
  createPatient({
    caregiverId: DEMO_CAREGIVER_ID,
    name: demoPatientB.name,
    email: '',
    password: '',
    timezone: DEMO_TIMEZONE,
    profile: profileB,
    demo: { userId: null, patientId: DEMO_PATIENT_B_ID },
  });

  seedRecordsFor(DEMO_PATIENT_A_ID);
  seedRecordsFor(DEMO_PATIENT_B_ID);
}

/** Splits the shared demo fixtures by patient, so neither sees the other's rows. */
function seedRecordsFor(patientId: string): void {
  const mine = <T extends { patientId: string }>(list: T[]) =>
    list.filter((item) => item.patientId === patientId);

  putRecords(patientId, {
    activities: patientId === DEMO_PATIENT_A_ID ? demoDailyActivities(undefined, patientId) : [],
    reminders: mine(demoReminders()),
    gameSessions: mine(demoGameSessions()),
    achievements: mine(demoAchievements()),
    family: mine(demoFamilyMembers()),
    careCircle: mine(demoCareCircle()),
    alerts: mine(demoAlerts()),
  });
}

/**
 * Puts the demo accounts back the way they started.
 *
 * Profiles are rewritten from the fixtures and every record list is replaced, so a
 * demonstration that renamed people, ticked things off and finished games leaves
 * nothing behind for the next one. The logins themselves survive — the point is to
 * reset the *data*, not to lock the demo out of its own account.
 *
 * Scope is exactly the three demo rows, named by their fixed ids. It cannot reach a
 * real account even if it is called by mistake, and the endpoint that calls it
 * additionally refuses any session that is not itself a demo session.
 */
export function resetDemoSeed(): void {
  ensureDemoSeed();

  const { id: _aId, userId: _aUser, ...profileA } = demoPatientA;
  const { id: _bId, userId: _bUser, ...profileB } = demoPatientB;
  updatePatientProfile(DEMO_PATIENT_A_ID, { ...profileA, timezone: DEMO_TIMEZONE });
  updatePatientProfile(DEMO_PATIENT_B_ID, { ...profileB, timezone: DEMO_TIMEZONE });

  updateCaregiverProfile(DEMO_CAREGIVER_ID, {
    name: 'Meera Sharma',
    relationToPatient: 'Daughter',
    photo: null,
    avatarSeed: 'meera',
    language: 'en',
    contactPhone: '+91 98765 43210',
    timezone: DEMO_TIMEZONE,
  });

  seedRecordsFor(DEMO_PATIENT_A_ID);
  seedRecordsFor(DEMO_PATIENT_B_ID);
}

export const DEMO_IDS = {
  caregiverId: DEMO_CAREGIVER_ID,
  patientA: DEMO_PATIENT_A_ID,
  patientB: DEMO_PATIENT_B_ID,
};

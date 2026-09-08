import type {
  Achievement,
  CareCircleMember,
  CaregiverAlert,
  CaregiverProfile,
  DailyActivity,
  DifficultyLevel,
  FamilyMember,
  GameId,
  GameSession,
  PatientProfile,
  Reminder,
} from '@/lib/types';
import { isoDaysAgo, todayISO } from '@/lib/utils/datetime';

/**
 * Seed data. Fictional but realistic, so the app looks alive on first run.
 *
 * Nothing here is imported by components directly — it goes through the services
 * in lib/services, which is the seam the HTTP API replaces. Every record carries
 * the `patientId` it belongs to, because one caregiver account looks after
 * several people and their data must never be pooled.
 *
 * The people are invented. No photo is stored: portraits are drawn from the name
 * at render time, so nothing here pretends to be a photograph of a real person
 * and no image is ever fetched from the network.
 */

export const DEMO_CAREGIVER_ID = 'caregiver_meera';

/** The two people the demo caregiver looks after. */
export const DEMO_PATIENT_A_ID = 'patient_ravi';
export const DEMO_PATIENT_B_ID = 'patient_kamala';

/** Where "Demo as Patient" lands. */
export const DEMO_PATIENT_ID = DEMO_PATIENT_A_ID;

export const DEMO_PATIENT_IDS = [DEMO_PATIENT_A_ID, DEMO_PATIENT_B_ID];

// --------------------------------------------------------------- randomness

/**
 * A tiny seeded generator, so the demo looks varied but is identical on every
 * run — the server and the client must agree, and a caregiver reloading the page
 * should not see the numbers move.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- profiles

export const demoPatientA: PatientProfile = {
  id: DEMO_PATIENT_A_ID,
  userId: 'user_ravi',
  name: 'Ravi Sharma',
  age: 68,
  photo: null,
  avatarSeed: 'ravi',
  language: 'en',
  speechSpeed: 'normal',
  contactPhone: '+91 98640 20114',
  emergencyContactName: 'Meera Sharma',
  emergencyContactPhone: '+91 98765 43210',
  notes: 'Sharpest in the morning. Likes the radio on while he plays. Gets unsettled if rushed.',
  caregiverRelation: 'Daughter',
  preferredActivities: ['memory-match', 'face-names', 'number-tap'],
  accessibility: {
    textScale: 'large',
    highContrast: false,
    reducedMotion: false,
    voiceGuidance: true,
    notifications: true,
    offlineMode: true,
  },
  cognitive: {
    stage: 'early',
    assessedOn: '2026-06-12',
    assessedBy: 'Dr. Ananya Barua, City Clinic',
    difficultyAreas: ['Remembering recent conversations', 'Names of visitors'],
    strengthAreas: ['Long-ago memories', 'Numbers and figures'],
    observations:
      'Manages the morning routine on his own. Asks the same question two or three times in an afternoon.',
  },
  preferences: {
    interests: ['cricket', 'radio', 'tea', 'temple', 'gardening', 'family'],
    favouriteColours: ['Blue', 'White'],
    favouriteFoods: ['Fish curry', 'Jalebi', 'Strong tea'],
    favouriteMusic: ['Bhupen Hazarika', 'Old Hindi film songs'],
    favouritePlaces: ['Kamakhya temple', 'The tea garden at Jorhat'],
    favouriteFilms: ['Sholay'],
    favouritePeople: ['His brother Sunil', 'Meena, his daughter'],
    conversationTopics: ['The 1983 World Cup', 'His years at the tea estate', 'Cricket scores'],
    childhoodMemories:
      'Grew up in Jorhat. Walked to school along the river and listened to matches on his father’s radio.',
    dislikes: ['Loud rooms', 'Being hurried'],
  },
  createdAt: `${isoDaysAgo(94)}T09:00:00`,
};

export const demoPatientB: PatientProfile = {
  id: DEMO_PATIENT_B_ID,
  userId: null,
  name: 'Kamala Devi',
  age: 74,
  photo: null,
  avatarSeed: 'kamala',
  language: 'hi',
  speechSpeed: 'slow',
  contactPhone: '+91 90210 77431',
  emergencyContactName: 'Meera Sharma',
  emergencyContactPhone: '+91 98765 43210',
  notes: 'Prefers Hindi. Very short sessions — five minutes is plenty. Loves being read to.',
  caregiverRelation: 'Neighbour',
  preferredActivities: ['face-names', 'picture-recall'],
  accessibility: {
    textScale: 'xlarge',
    highContrast: true,
    reducedMotion: true,
    voiceGuidance: true,
    notifications: true,
    offlineMode: true,
  },
  cognitive: {
    stage: 'moderate',
    assessedOn: '2026-07-30',
    assessedBy: 'Family observation',
    difficultyAreas: ['Following several steps', 'Recognising faces on a screen'],
    strengthAreas: ['Songs she has known for years', 'Recognising voices'],
    observations: 'Happiest with one thing at a time. Tires after about ten minutes.',
  },
  preferences: {
    interests: ['flowers', 'cooking', 'singing', 'films', 'birds', 'family'],
    favouriteColours: ['Yellow', 'Green'],
    favouriteFoods: ['Khichdi', 'Mango'],
    favouriteMusic: ['Bhajans', 'Lata Mangeshkar'],
    favouritePlaces: ['Her courtyard garden'],
    favouriteFilms: ['Mother India'],
    favouritePeople: ['Her sister Latha'],
    conversationTopics: ['Her garden', 'Recipes', 'Songs from the radio'],
    childhoodMemories: 'One of five sisters. Sang at every family wedding.',
    dislikes: ['Crowds'],
  },
  createdAt: `${isoDaysAgo(41)}T16:20:00`,
};

/** Kept as the default profile a fresh patient session starts from. */
export const demoPatientProfile = demoPatientA;

export const demoCaregiverProfile: CaregiverProfile = {
  id: DEMO_CAREGIVER_ID,
  userId: 'user_meera',
  name: 'Meera Sharma',
  relationToPatient: 'Daughter',
  photo: null,
  avatarSeed: 'meera',
  language: 'en',
  contactPhone: '+91 98765 43210',
  patientIds: [DEMO_PATIENT_A_ID, DEMO_PATIENT_B_ID],
};

export function demoPatients(): PatientProfile[] {
  return [demoPatientA, demoPatientB];
}

// ------------------------------------------------------------ family & faces

/**
 * The people each patient knows. These records do double duty: they draw the
 * family tree and they are the question bank for the Face & Name activity.
 */
export function demoFamilyMembers(): FamilyMember[] {
  const a = DEMO_PATIENT_A_ID;
  const b = DEMO_PATIENT_B_ID;
  return [
    {
      id: 'fam_meena',
      patientId: a,
      name: 'Meena',
      relationship: 'daughter',
      photo: null,
      notes: 'Visits every Sunday. Calls each evening at six.',
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(90)}T10:00:00`,
    },
    {
      id: 'fam_raj',
      patientId: a,
      name: 'Raj',
      relationship: 'son',
      photo: null,
      notes: 'Lives in Bengaluru. Sends photographs of his children.',
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(90)}T10:04:00`,
    },
    {
      id: 'fam_sunil',
      patientId: a,
      name: 'Sunil',
      relationship: 'brother',
      photo: null,
      notes: 'Younger brother. They listen to the cricket together.',
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(90)}T10:07:00`,
    },
    {
      id: 'fam_anita',
      patientId: a,
      name: 'Anita',
      relationship: 'wife',
      photo: null,
      notes: 'Married 44 years.',
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(90)}T10:09:00`,
    },
    {
      id: 'fam_vijay',
      patientId: a,
      name: 'Vijay',
      relationship: 'friend',
      photo: null,
      notes: 'Neighbour of thirty years. Walks with him most mornings.',
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(88)}T18:30:00`,
    },
    {
      id: 'fam_priya',
      patientId: a,
      name: 'Priya',
      relationship: 'granddaughter',
      photo: null,
      notes: 'Meena’s daughter. Studying in Delhi.',
      inRecognitionGame: false,
      createdAt: `${isoDaysAgo(60)}T12:00:00`,
    },
    {
      id: 'fam_deepa',
      patientId: b,
      name: 'Deepa',
      relationship: 'daughter',
      photo: null,
      notes: 'Cooks with her on Saturdays.',
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(40)}T09:00:00`,
    },
    {
      id: 'fam_arjun',
      patientId: b,
      name: 'Arjun',
      relationship: 'son',
      photo: null,
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(40)}T09:03:00`,
    },
    {
      id: 'fam_latha',
      patientId: b,
      name: 'Latha',
      relationship: 'sister',
      photo: null,
      notes: 'Telephones on Fridays. They sing together.',
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(40)}T09:06:00`,
    },
    {
      id: 'fam_mohan',
      patientId: b,
      name: 'Mohan',
      relationship: 'husband',
      photo: null,
      notes: 'Passed away in 2019. She likes to talk about him.',
      inRecognitionGame: true,
      createdAt: `${isoDaysAgo(40)}T09:08:00`,
    },
    {
      id: 'fam_bina',
      patientId: b,
      name: 'Bina',
      relationship: 'friend',
      photo: null,
      inRecognitionGame: false,
      createdAt: `${isoDaysAgo(22)}T15:40:00`,
    },
  ];
}

// ------------------------------------------------------------- daily plan

export function demoDailyActivities(
  date = todayISO(),
  patientId = DEMO_PATIENT_ID,
): DailyActivity[] {
  return [
    {
      id: 'act_walk_morning',
      patientId,
      date,
      title: 'Morning Walk',
      titleKey: 'activity.morningWalk',
      kind: 'walk',
      dayPart: 'morning',
      time: '07:00',
      completed: true,
      completedAt: `${date}T07:24:00`,
    },
    {
      id: 'act_breakfast',
      patientId,
      date,
      title: 'Breakfast',
      titleKey: 'activity.breakfast',
      kind: 'meal',
      dayPart: 'morning',
      time: '08:30',
      completed: true,
      completedAt: `${date}T08:41:00`,
    },
    {
      id: 'act_medicine_morning',
      patientId,
      date,
      title: 'Morning Medicine',
      titleKey: 'activity.morningMedicine',
      kind: 'medicine',
      dayPart: 'morning',
      time: '10:00',
      completed: false,
    },
    {
      id: 'act_memory_game',
      patientId,
      date,
      title: 'Memory Game',
      titleKey: 'activity.memoryGame',
      kind: 'cognitive',
      dayPart: 'morning',
      time: '11:00',
      completed: false,
      linkedGameId: 'memory-match',
    },
    {
      id: 'act_lunch',
      patientId,
      date,
      title: 'Lunch',
      titleKey: 'activity.lunch',
      kind: 'meal',
      dayPart: 'afternoon',
      time: '13:00',
      completed: false,
    },
    {
      id: 'act_faces_game',
      patientId,
      date,
      title: 'Faces and Names',
      titleKey: 'activity.facesGame',
      kind: 'cognitive',
      dayPart: 'afternoon',
      time: '14:30',
      completed: false,
      linkedGameId: 'face-names',
    },
    {
      id: 'act_water_afternoon',
      patientId,
      date,
      title: 'Glass of Water',
      titleKey: 'activity.water',
      kind: 'hydration',
      dayPart: 'afternoon',
      time: '15:00',
      completed: false,
    },
    {
      id: 'act_call_family',
      patientId,
      date,
      title: 'Call with Meera',
      titleKey: 'activity.callFamily',
      kind: 'social',
      dayPart: 'afternoon',
      time: '16:00',
      completed: false,
    },
    {
      id: 'act_walk_evening',
      patientId,
      date,
      title: 'Evening Walk',
      titleKey: 'activity.eveningWalk',
      kind: 'walk',
      dayPart: 'evening',
      time: '17:00',
      completed: false,
    },
    {
      id: 'act_medicine_evening',
      patientId,
      date,
      title: 'Evening Medicine',
      titleKey: 'activity.eveningMedicine',
      kind: 'medicine',
      dayPart: 'evening',
      time: '20:00',
      completed: false,
    },
  ];
}

// --------------------------------------------------------------- reminders

export function demoReminders(): Reminder[] {
  const stamp = `${isoDaysAgo(2)}T19:10:00`;
  const base = { enabled: true, updatedBy: 'caregiver' as const, updatedAt: stamp };
  return [
    {
      ...base,
      id: 'rem_bp',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Blood pressure tablet',
      type: 'medicine',
      time: '10:00',
      note: 'One tablet after breakfast',
      status: 'pending',
      repeat: 'daily',
    },
    {
      ...base,
      id: 'rem_water_1',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Drink a glass of water',
      type: 'water',
      time: '11:30',
      status: 'pending',
      repeat: 'daily',
    },
    {
      ...base,
      id: 'rem_doctor',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Doctor visit — Dr. Barua',
      type: 'appointment',
      time: '15:30',
      date: isoDaysAgo(-3),
      note: 'City Clinic, take the reports folder',
      status: 'pending',
      repeat: 'once',
    },
    {
      ...base,
      id: 'rem_walk',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Evening walk',
      type: 'activity',
      time: '17:00',
      status: 'pending',
      repeat: 'daily',
    },
    {
      ...base,
      id: 'rem_evening_med',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Evening tablet',
      type: 'medicine',
      time: '20:00',
      note: 'After dinner',
      status: 'pending',
      repeat: 'daily',
    },
    {
      ...base,
      id: 'rem_morning_vitamin',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Vitamin D',
      type: 'medicine',
      time: '08:00',
      status: 'completed',
      completedAt: `${todayISO()}T08:12:00`,
      repeat: 'daily',
      updatedBy: 'patient',
      updatedAt: `${todayISO()}T08:12:00`,
    },
    {
      ...base,
      id: 'rem_physio',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Physiotherapy exercises',
      type: 'activity',
      time: '16:30',
      status: 'pending',
      repeat: 'weekly',
      weekdays: [2, 5],
      enabled: false,
    },
    {
      ...base,
      id: 'rem_k_morning',
      patientId: DEMO_PATIENT_B_ID,
      title: 'Sugar tablet',
      type: 'medicine',
      time: '09:00',
      note: 'With breakfast',
      status: 'pending',
      repeat: 'daily',
    },
    {
      ...base,
      id: 'rem_k_water',
      patientId: DEMO_PATIENT_B_ID,
      title: 'Drink water',
      type: 'water',
      time: '12:00',
      status: 'pending',
      repeat: 'daily',
    },
    {
      ...base,
      id: 'rem_k_songs',
      patientId: DEMO_PATIENT_B_ID,
      title: 'Bhajans on the radio',
      type: 'activity',
      time: '18:00',
      status: 'pending',
      repeat: 'weekdays',
    },
  ];
}

// ------------------------------------------------------------ game history

/**
 * How one activity was played over the past few weeks.
 *
 * The numbers are generated from a curve rather than typed out one by one, so the
 * history is long enough for a trend to be real and the accuracy, pace and hint
 * use all move together the way a person's would.
 */
interface GamePlan {
  gameId: GameId;
  /** Days ago the activity was played, oldest first. */
  days: number[];
  /** Share of answers correct, oldest session → newest. */
  accuracyFrom: number;
  accuracyTo: number;
  difficultyFrom: DifficultyLevel;
  difficultyTo: DifficultyLevel;
  /** Questions in a run. */
  total: number;
  /** Seconds per answer, oldest → newest. */
  paceFrom: number;
  paceTo: number;
  hintsFrom: number;
  hintsTo: number;
}

function lerp(from: number, to: number, ratio: number): number {
  return from + (to - from) * ratio;
}

function buildSessions(patientId: string, plans: GamePlan[], seed: number): GameSession[] {
  const rng = mulberry32(seed);
  const sessions: GameSession[] = [];

  for (const plan of plans) {
    plan.days.forEach((day, index) => {
      const ratio = plan.days.length === 1 ? 1 : index / (plan.days.length - 1);
      // ±6% wobble, so no run is exactly on the trend line.
      const target = lerp(plan.accuracyFrom, plan.accuracyTo, ratio) + (rng() - 0.5) * 0.12;
      const correct = Math.max(0, Math.min(plan.total, Math.round(target * plan.total)));
      const mistakes = plan.total - correct;
      const pace = Math.max(1.5, lerp(plan.paceFrom, plan.paceTo, ratio) + (rng() - 0.5));
      const hints = Math.max(0, Math.round(lerp(plan.hintsFrom, plan.hintsTo, ratio) + rng() * 0.4));
      const hour = 9 + Math.floor(rng() * 9);

      sessions.push({
        id: `sess_${patientId}_${plan.gameId}_${day}`,
        patientId,
        gameId: plan.gameId,
        difficulty: ratio < 0.5 ? plan.difficultyFrom : plan.difficultyTo,
        correct,
        total: plan.total,
        accuracy: plan.total === 0 ? 0 : correct / plan.total,
        mistakes,
        hintsUsed: hints,
        durationSeconds: Math.round(pace * plan.total + 12),
        averageResponseSeconds: Math.round(pace * 10) / 10,
        completed: true,
        completedAt: `${isoDaysAgo(day)}T${String(hour).padStart(2, '0')}:${String(
          10 + Math.floor(rng() * 45),
        ).padStart(2, '0')}:00`,
      });
    });
  }

  return sessions.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/**
 * Patient A: memory steadily improving, face recognition slipping over the last
 * fortnight, everything else holding. That gives the caregiver screens a real
 * "activity change" to describe and the engine a real reason to step recognition
 * back down a level.
 */
const PLANS_A: GamePlan[] = [
  {
    gameId: 'memory-match',
    days: [26, 23, 20, 17, 14, 11, 8, 6, 4, 2, 0],
    accuracyFrom: 0.62,
    accuracyTo: 0.9,
    difficultyFrom: 'easy',
    difficultyTo: 'medium',
    total: 8,
    paceFrom: 9,
    paceTo: 6,
    hintsFrom: 2,
    hintsTo: 0,
  },
  {
    gameId: 'face-names',
    days: [25, 22, 19, 16, 13, 10, 7, 5, 3, 1],
    accuracyFrom: 0.88,
    accuracyTo: 0.52,
    difficultyFrom: 'medium',
    difficultyTo: 'medium',
    total: 6,
    paceFrom: 6,
    paceTo: 11,
    hintsFrom: 0,
    hintsTo: 2,
  },
  {
    gameId: 'sudoku',
    days: [21, 15, 12, 9, 5, 2],
    accuracyFrom: 0.7,
    accuracyTo: 0.78,
    difficultyFrom: 'easy',
    difficultyTo: 'medium',
    total: 9,
    paceFrom: 18,
    paceTo: 16,
    hintsFrom: 2,
    hintsTo: 1,
  },
  {
    gameId: 'number-tap',
    days: [24, 18, 13, 8, 4, 1],
    accuracyFrom: 0.84,
    accuracyTo: 0.88,
    difficultyFrom: 'easy',
    difficultyTo: 'medium',
    total: 10,
    paceFrom: 4,
    paceTo: 3.4,
    hintsFrom: 0,
    hintsTo: 0,
  },
  {
    gameId: 'picture-recall',
    days: [20, 14, 7, 3],
    accuracyFrom: 0.8,
    accuracyTo: 0.85,
    difficultyFrom: 'easy',
    difficultyTo: 'easy',
    total: 5,
    paceFrom: 7,
    paceTo: 6.5,
    hintsFrom: 0,
    hintsTo: 0,
  },
  {
    gameId: 'word-recall',
    days: [19, 11, 6],
    accuracyFrom: 0.6,
    accuracyTo: 0.66,
    difficultyFrom: 'easy',
    difficultyTo: 'easy',
    total: 5,
    paceFrom: 8,
    paceTo: 8,
    hintsFrom: 1,
    hintsTo: 1,
  },
];

/** Patient B: a shorter history, all at the easiest level, quietly improving. */
const PLANS_B: GamePlan[] = [
  {
    gameId: 'face-names',
    days: [16, 12, 9, 6, 3, 1],
    accuracyFrom: 0.55,
    accuracyTo: 0.72,
    difficultyFrom: 'easy',
    difficultyTo: 'easy',
    total: 4,
    paceFrom: 14,
    paceTo: 11,
    hintsFrom: 2,
    hintsTo: 1,
  },
  {
    gameId: 'picture-recall',
    days: [15, 10, 5, 2],
    accuracyFrom: 0.6,
    accuracyTo: 0.75,
    difficultyFrom: 'easy',
    difficultyTo: 'easy',
    total: 4,
    paceFrom: 12,
    paceTo: 10,
    hintsFrom: 1,
    hintsTo: 1,
  },
  {
    gameId: 'memory-match',
    days: [13, 7, 4],
    accuracyFrom: 0.5,
    accuracyTo: 0.62,
    difficultyFrom: 'easy',
    difficultyTo: 'easy',
    total: 6,
    paceFrom: 15,
    paceTo: 13,
    hintsFrom: 3,
    hintsTo: 2,
  },
];

export function demoGameSessions(): GameSession[] {
  return [
    ...buildSessions(DEMO_PATIENT_A_ID, PLANS_A, 20260907),
    ...buildSessions(DEMO_PATIENT_B_ID, PLANS_B, 71104),
  ];
}

// ------------------------------------------------------------- care circle

export function demoCareCircle(): CareCircleMember[] {
  return [
    {
      id: 'ccm_meera',
      patientId: DEMO_PATIENT_A_ID,
      name: 'Meera Sharma',
      relation: 'Daughter',
      role: 'primary-caregiver',
      phone: '+91 98765 43210',
      avatarSeed: 'meera',
      status: 'connected',
      lastContactedAt: `${todayISO()}T09:10:00`,
    },
    {
      id: 'ccm_raj',
      patientId: DEMO_PATIENT_A_ID,
      name: 'Raj Sharma',
      relation: 'Son',
      role: 'family',
      phone: '+91 98330 11224',
      avatarSeed: 'raj',
      status: 'connected',
      lastContactedAt: `${isoDaysAgo(2)}T19:40:00`,
    },
    {
      id: 'ccm_priya',
      patientId: DEMO_PATIENT_A_ID,
      name: 'Priya Das',
      relation: 'Granddaughter',
      role: 'family',
      avatarSeed: 'priya',
      status: 'pending',
    },
    {
      id: 'ccm_clinic',
      patientId: DEMO_PATIENT_A_ID,
      name: 'Dr. Ananya Barua',
      relation: 'Family physician',
      role: 'health-support',
      phone: '+91 361 220 1188',
      avatarSeed: 'barua',
      status: 'connected',
      lastContactedAt: `${isoDaysAgo(9)}T11:00:00`,
    },
    {
      id: 'ccm_deepa',
      patientId: DEMO_PATIENT_B_ID,
      name: 'Deepa Devi',
      relation: 'Daughter',
      role: 'primary-caregiver',
      phone: '+91 90880 41120',
      avatarSeed: 'deepa',
      status: 'connected',
      lastContactedAt: `${isoDaysAgo(1)}T17:05:00`,
    },
    {
      id: 'ccm_latha',
      patientId: DEMO_PATIENT_B_ID,
      name: 'Latha Devi',
      relation: 'Sister',
      role: 'family',
      phone: '+91 90210 66512',
      avatarSeed: 'latha',
      status: 'connected',
      lastContactedAt: `${isoDaysAgo(4)}T11:20:00`,
    },
  ];
}

// ------------------------------------------------------------ achievements

export function demoAchievements(): Achievement[] {
  return [
    {
      id: 'ach_first_step',
      patientId: DEMO_PATIENT_A_ID,
      title: 'First Step',
      description: 'Completed your first activity.',
      titleKey: 'achievement.firstStep',
      descriptionKey: 'achievement.firstStep.desc',
      icon: 'star',
      unlockedAt: `${isoDaysAgo(26)}T09:30:00`,
    },
    {
      id: 'ach_three_days',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Three Good Days',
      description: 'Active three days in a row.',
      titleKey: 'achievement.threeDays',
      descriptionKey: 'achievement.threeDays.desc',
      icon: 'sunrise',
      unlockedAt: `${isoDaysAgo(3)}T10:15:00`,
    },
    {
      id: 'ach_steady',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Steady Week',
      description: 'An activity on five different days.',
      titleKey: 'achievement.steady',
      descriptionKey: 'achievement.steady.desc',
      icon: 'sparkles',
      unlockedAt: `${isoDaysAgo(1)}T18:05:00`,
    },
    {
      id: 'ach_explorer',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Curious Mind',
      description: 'Tried every kind of memory activity.',
      titleKey: 'achievement.explorer',
      descriptionKey: 'achievement.explorer.desc',
      icon: 'trophy',
    },
    {
      id: 'ach_hydration',
      patientId: DEMO_PATIENT_A_ID,
      title: 'Well Watered',
      description: 'Completed every water reminder in a day.',
      titleKey: 'achievement.hydration',
      descriptionKey: 'achievement.hydration.desc',
      icon: 'heart',
    },
    {
      id: 'ach_k_first_step',
      patientId: DEMO_PATIENT_B_ID,
      title: 'First Step',
      description: 'Completed your first activity.',
      titleKey: 'achievement.firstStep',
      descriptionKey: 'achievement.firstStep.desc',
      icon: 'star',
      unlockedAt: `${isoDaysAgo(16)}T10:05:00`,
    },
    {
      id: 'ach_k_three_days',
      patientId: DEMO_PATIENT_B_ID,
      title: 'Three Good Days',
      description: 'Active three days in a row.',
      titleKey: 'achievement.threeDays',
      descriptionKey: 'achievement.threeDays.desc',
      icon: 'sunrise',
    },
    {
      id: 'ach_k_steady',
      patientId: DEMO_PATIENT_B_ID,
      title: 'Steady Week',
      description: 'An activity on five different days.',
      titleKey: 'achievement.steady',
      descriptionKey: 'achievement.steady.desc',
      icon: 'sparkles',
    },
    {
      id: 'ach_k_explorer',
      patientId: DEMO_PATIENT_B_ID,
      title: 'Curious Mind',
      description: 'Tried every kind of memory activity.',
      titleKey: 'achievement.explorer',
      descriptionKey: 'achievement.explorer.desc',
      icon: 'trophy',
    },
    {
      id: 'ach_k_hydration',
      patientId: DEMO_PATIENT_B_ID,
      title: 'Well Watered',
      description: 'Completed every water reminder in a day.',
      titleKey: 'achievement.hydration',
      descriptionKey: 'achievement.hydration.desc',
      icon: 'heart',
    },
  ];
}

// ----------------------------------------------------------------- alerts

/**
 * Plain descriptions of what happened in the app. Deliberately worded as
 * observations of app usage — never as a clinical finding about the person.
 */
export function demoAlerts(): CaregiverAlert[] {
  return [
    {
      id: 'alert_activity_change',
      patientId: DEMO_PATIENT_A_ID,
      kind: 'activity-change',
      severity: 'attention',
      detail:
        'Answers in Faces and Names have been correct less often over the last two weeks, and are taking longer.',
      createdAt: `${isoDaysAgo(1)}T20:05:00`,
      acknowledged: false,
    },
    {
      id: 'alert_missed_medicine',
      patientId: DEMO_PATIENT_A_ID,
      kind: 'missed-medicine',
      severity: 'attention',
      detail: 'The evening tablet reminder was not marked as taken yesterday.',
      createdAt: `${isoDaysAgo(1)}T21:30:00`,
      acknowledged: false,
    },
    {
      id: 'alert_low_activity',
      patientId: DEMO_PATIENT_A_ID,
      kind: 'low-activity',
      severity: 'info',
      detail: 'Two activities completed yesterday; the usual is three to four.',
      createdAt: `${isoDaysAgo(1)}T22:00:00`,
      acknowledged: true,
    },
    {
      id: 'alert_k_quiet',
      patientId: DEMO_PATIENT_B_ID,
      kind: 'low-activity',
      severity: 'info',
      detail: 'Kamala has opened the app on 3 of the last 7 days.',
      createdAt: `${isoDaysAgo(2)}T19:15:00`,
      acknowledged: false,
    },
  ];
}

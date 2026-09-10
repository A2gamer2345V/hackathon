import type {
  Achievement,
  CareCircleMember,
  CaregiverAlert,
  DailyActivity,
  FamilyMember,
  GameSession,
  PatientProfile,
  ProgressRecord,
  Reminder,
  UserRole,
} from '@/lib/types';
import {
  DEMO_PATIENT_ID,
  demoAchievements,
  demoAlerts,
  demoCareCircle,
  demoDailyActivities,
  demoFamilyMembers,
  demoGameSessions,
  demoPatients,
  demoReminders,
} from '@/lib/data/demo';
import { isoDaysAgo, todayISO } from '@/lib/utils/datetime';
import { makeId } from '@/lib/utils';
import { readValue, STORAGE_KEYS, writeValue } from './storage';

/**
 * The data layer the UI talks to.
 *
 * Everything is synchronous and local today. Each function is the exact shape a
 * fetch-backed implementation would have, so moving to the SQLite-backed route
 * handlers means changing this file only — components never touch storage or demo
 * data.
 *
 * Every list is scoped by `patientId`. A caregiver looking after several people
 * gets one person's sessions, reminders, family and insights at a time; the data
 * is never pooled or averaged across patients.
 */

// ------------------------------------------------------------------ seeding

/** Seeds demo content once per browser, so the app is never empty on arrival. */
export function ensureSeeded(): void {
  if (readValue<boolean>(STORAGE_KEYS.seeded, false)) {
    rollActivitiesToToday();
    return;
  }
  writeValue(STORAGE_KEYS.patients, demoPatients());
  writeValue(STORAGE_KEYS.activities, demoDailyActivities());
  writeValue(STORAGE_KEYS.reminders, demoReminders());
  writeValue(STORAGE_KEYS.gameSessions, demoGameSessions());
  writeValue(STORAGE_KEYS.achievements, demoAchievements());
  writeValue(STORAGE_KEYS.family, demoFamilyMembers());
  writeValue(STORAGE_KEYS.careCircle, demoCareCircle());
  writeValue(STORAGE_KEYS.alerts, demoAlerts());
  writeValue(STORAGE_KEYS.seeded, true);
}

/**
 * Demo data is dated. If the browser is opened on a later day, regenerate the
 * plan for today rather than showing an empty or stale one.
 */
function rollActivitiesToToday(): void {
  const activities = readValue<DailyActivity[]>(STORAGE_KEYS.activities, []);
  const today = todayISO();
  if (activities.length > 0 && activities.every((a) => a.date === today)) return;
  writeValue(STORAGE_KEYS.activities, demoDailyActivities(today));
}

// ------------------------------------------------------------------ patients

export type PatientDraft = Pick<PatientProfile, 'name'> &
  Partial<Omit<PatientProfile, 'id' | 'name'>>;

export const patientService = {
  list(): PatientProfile[] {
    return readValue<PatientProfile[]>(STORAGE_KEYS.patients, []);
  },

  get(id: string): PatientProfile | null {
    return patientService.list().find((p) => p.id === id) ?? null;
  },

  /** Only the patients a given caregiver is linked to. */
  listFor(patientIds: string[]): PatientProfile[] {
    const wanted = new Set(patientIds);
    return patientService.list().filter((p) => wanted.has(p.id));
  },

  save(profile: PatientProfile): PatientProfile[] {
    const all = patientService.list();
    const exists = all.some((p) => p.id === profile.id);
    const next = exists ? all.map((p) => (p.id === profile.id ? profile : p)) : [...all, profile];
    writeValue(STORAGE_KEYS.patients, next);
    return next;
  },

  update(id: string, patch: Partial<PatientProfile>): PatientProfile[] {
    const next = patientService.list().map((p) => (p.id === id ? { ...p, ...patch, id } : p));
    writeValue(STORAGE_KEYS.patients, next);
    return next;
  },

  /**
   * Removes a patient and everything belonging to them.
   *
   * Deliberately thorough: leaving orphaned sessions or reminders behind would
   * mean one person's data could later surface under someone else's name.
   */
  remove(id: string): PatientProfile[] {
    const next = patientService.list().filter((p) => p.id !== id);
    writeValue(STORAGE_KEYS.patients, next);

    writeValue(
      STORAGE_KEYS.activities,
      readValue<DailyActivity[]>(STORAGE_KEYS.activities, []).filter((a) => a.patientId !== id),
    );
    writeValue(
      STORAGE_KEYS.reminders,
      readValue<Reminder[]>(STORAGE_KEYS.reminders, []).filter((r) => r.patientId !== id),
    );
    writeValue(
      STORAGE_KEYS.gameSessions,
      readValue<GameSession[]>(STORAGE_KEYS.gameSessions, []).filter((s) => s.patientId !== id),
    );
    writeValue(
      STORAGE_KEYS.achievements,
      readValue<Achievement[]>(STORAGE_KEYS.achievements, []).filter((a) => a.patientId !== id),
    );
    writeValue(
      STORAGE_KEYS.family,
      readValue<FamilyMember[]>(STORAGE_KEYS.family, []).filter((f) => f.patientId !== id),
    );
    writeValue(
      STORAGE_KEYS.careCircle,
      readValue<CareCircleMember[]>(STORAGE_KEYS.careCircle, []).filter((c) => c.patientId !== id),
    );
    writeValue(
      STORAGE_KEYS.alerts,
      readValue<CaregiverAlert[]>(STORAGE_KEYS.alerts, []).filter((a) => a.patientId !== id),
    );

    return next;
  },
};

// --------------------------------------------------------------- activities

export const activityService = {
  listForDate(patientId = DEMO_PATIENT_ID, date = todayISO()): DailyActivity[] {
    return readValue<DailyActivity[]>(STORAGE_KEYS.activities, []).filter(
      (a) => a.date === date && a.patientId === patientId,
    );
  },

  setCompleted(id: string, completed: boolean, patientId = DEMO_PATIENT_ID): DailyActivity[] {
    const all = readValue<DailyActivity[]>(STORAGE_KEYS.activities, []);
    const next = all.map((a) =>
      a.id === id
        ? {
            ...a,
            completed,
            completedAt: completed ? new Date().toISOString() : undefined,
          }
        : a,
    );
    writeValue(STORAGE_KEYS.activities, next);
    return next.filter((a) => a.date === todayISO() && a.patientId === patientId);
  },

  /** Marks the day's cognitive slot done when a game is finished. */
  completeLinkedGame(gameId: string, patientId: string): void {
    const all = readValue<DailyActivity[]>(STORAGE_KEYS.activities, []);
    const today = todayISO();
    let changed = false;
    const next = all.map((a) => {
      if (
        a.date === today &&
        a.patientId === patientId &&
        a.linkedGameId === gameId &&
        !a.completed
      ) {
        changed = true;
        return { ...a, completed: true, completedAt: new Date().toISOString() };
      }
      return a;
    });
    if (changed) writeValue(STORAGE_KEYS.activities, next);
  },
};

// ---------------------------------------------------------------- reminders

export type ReminderDraft = Pick<Reminder, 'title' | 'type' | 'time'> &
  Partial<Pick<Reminder, 'note' | 'repeat' | 'date' | 'weekdays' | 'enabled'>>;

/**
 * Reminders are the one thing both sides of the pair edit, so every write
 * records who made it and when. Both screens read the same list, which is what
 * makes a caregiver's change appear on the patient's device and the other way
 * round.
 */
export const reminderService = {
  all(): Reminder[] {
    return readValue<Reminder[]>(STORAGE_KEYS.reminders, []);
  },

  list(patientId = DEMO_PATIENT_ID): Reminder[] {
    return reminderService.all().filter((r) => r.patientId === patientId);
  },

  add(patientId: string, draft: ReminderDraft, by: UserRole = 'patient'): Reminder[] {
    const reminder: Reminder = {
      id: makeId('rem'),
      patientId,
      title: draft.title.trim(),
      type: draft.type,
      time: draft.time,
      date: draft.date,
      weekdays: draft.weekdays,
      note: draft.note?.trim() || undefined,
      status: 'pending',
      repeat: draft.repeat ?? 'daily',
      enabled: draft.enabled ?? true,
      updatedBy: by,
      updatedAt: new Date().toISOString(),
    };
    writeValue(STORAGE_KEYS.reminders, [...reminderService.all(), reminder]);
    return reminderService.list(patientId);
  },

  update(
    id: string,
    patch: Partial<Omit<Reminder, 'id' | 'patientId'>>,
    by: UserRole = 'patient',
  ): Reminder[] {
    const all = reminderService.all();
    const target = all.find((r) => r.id === id);
    const next = all.map((r) =>
      r.id === id ? { ...r, ...patch, updatedBy: by, updatedAt: new Date().toISOString() } : r,
    );
    writeValue(STORAGE_KEYS.reminders, next);
    return next.filter((r) => r.patientId === (target?.patientId ?? DEMO_PATIENT_ID));
  },

  setStatus(id: string, status: Reminder['status'], by: UserRole = 'patient'): Reminder[] {
    return reminderService.update(
      id,
      {
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      },
      by,
    );
  },

  setEnabled(id: string, enabled: boolean, by: UserRole = 'caregiver'): Reminder[] {
    return reminderService.update(id, { enabled }, by);
  },

  remove(id: string): Reminder[] {
    const all = reminderService.all();
    const target = all.find((r) => r.id === id);
    const next = all.filter((r) => r.id !== id);
    writeValue(STORAGE_KEYS.reminders, next);
    return next.filter((r) => r.patientId === (target?.patientId ?? DEMO_PATIENT_ID));
  },
};

// ------------------------------------------------------------ game sessions

/** What a game reports when it finishes. The service fills in the rest. */
export type SessionDraft = Omit<GameSession, 'id' | 'completedAt' | 'accuracy'>;

export const sessionService = {
  all(): GameSession[] {
    return readValue<GameSession[]>(STORAGE_KEYS.gameSessions, []);
  },

  list(patientId = DEMO_PATIENT_ID): GameSession[] {
    return sessionService.all().filter((s) => s.patientId === patientId);
  },

  record(draft: SessionDraft): GameSession[] {
    const entry: GameSession = {
      ...draft,
      accuracy: draft.total === 0 ? 0 : draft.correct / draft.total,
      id: makeId('sess'),
      completedAt: new Date().toISOString(),
    };
    writeValue(STORAGE_KEYS.gameSessions, [...sessionService.all(), entry]);
    activityService.completeLinkedGame(draft.gameId, draft.patientId);
    return sessionService.list(draft.patientId);
  },
};

// ------------------------------------------------------------ family & faces

export type FamilyDraft = Pick<FamilyMember, 'name' | 'relationship'> &
  Partial<Pick<FamilyMember, 'relationshipLabel' | 'photo' | 'notes' | 'inRecognitionGame'>>;

export const familyService = {
  all(): FamilyMember[] {
    return readValue<FamilyMember[]>(STORAGE_KEYS.family, []);
  },

  list(patientId = DEMO_PATIENT_ID): FamilyMember[] {
    return familyService.all().filter((f) => f.patientId === patientId);
  },

  /** Just the people the recognition activity is allowed to ask about. */
  forRecognition(patientId = DEMO_PATIENT_ID): FamilyMember[] {
    return familyService.list(patientId).filter((f) => f.inRecognitionGame);
  },

  add(patientId: string, draft: FamilyDraft): FamilyMember[] {
    const member: FamilyMember = {
      id: makeId('fam'),
      patientId,
      name: draft.name.trim(),
      relationship: draft.relationship,
      relationshipLabel: draft.relationshipLabel?.trim() || undefined,
      photo: draft.photo ?? null,
      notes: draft.notes?.trim() || undefined,
      inRecognitionGame: draft.inRecognitionGame ?? true,
      createdAt: new Date().toISOString(),
    };
    writeValue(STORAGE_KEYS.family, [...familyService.all(), member]);
    return familyService.list(patientId);
  },

  update(id: string, patch: Partial<Omit<FamilyMember, 'id' | 'patientId'>>): FamilyMember[] {
    const all = familyService.all();
    const target = all.find((f) => f.id === id);
    const next = all.map((f) => (f.id === id ? { ...f, ...patch } : f));
    writeValue(STORAGE_KEYS.family, next);
    return next.filter((f) => f.patientId === (target?.patientId ?? DEMO_PATIENT_ID));
  },

  remove(id: string): FamilyMember[] {
    const all = familyService.all();
    const target = all.find((f) => f.id === id);
    const next = all.filter((f) => f.id !== id);
    writeValue(STORAGE_KEYS.family, next);
    return next.filter((f) => f.patientId === (target?.patientId ?? DEMO_PATIENT_ID));
  },
};

// ------------------------------------------------------------------ progress

export const progressService = {
  /** One record per day for the last `days` days, oldest first. */
  daily(patientId = DEMO_PATIENT_ID, days = 7): ProgressRecord[] {
    const sessions = sessionService.list(patientId);
    const reminders = reminderService.list(patientId);
    const out: ProgressRecord[] = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = isoDaysAgo(offset);
      const daySessions = sessions.filter((s) => s.completedAt.startsWith(date));
      const totalCorrect = daySessions.reduce((sum, s) => sum + s.correct, 0);
      const totalQuestions = daySessions.reduce((sum, s) => sum + s.total, 0);

      // Reminder adherence is only known precisely for today; earlier days use
      // the history implied by completed timestamps.
      const dayReminders =
        offset === 0
          ? reminders
          : reminders.filter((r) => r.completedAt?.startsWith(date) ?? false);
      const completed = dayReminders.filter((r) => r.status === 'completed').length;

      out.push({
        date,
        activitiesCompleted: daySessions.length + completed,
        gamesPlayed: daySessions.length,
        reminderAdherence: dayReminders.length ? completed / dayReminders.length : 0,
        averageAccuracy: totalQuestions ? totalCorrect / totalQuestions : 0,
      });
    }
    return out;
  },

  achievements(patientId = DEMO_PATIENT_ID): Achievement[] {
    return readValue<Achievement[]>(STORAGE_KEYS.achievements, []).filter(
      (a) => a.patientId === patientId,
    );
  },

  unlock(id: string, patientId = DEMO_PATIENT_ID): Achievement[] {
    const next = readValue<Achievement[]>(STORAGE_KEYS.achievements, []).map((a) =>
      a.id === id && !a.unlockedAt ? { ...a, unlockedAt: new Date().toISOString() } : a,
    );
    writeValue(STORAGE_KEYS.achievements, next);
    return next.filter((a) => a.patientId === patientId);
  },
};

// ---------------------------------------------------------------- care circle

export const careCircleService = {
  list(patientId = DEMO_PATIENT_ID): CareCircleMember[] {
    return readValue<CareCircleMember[]>(STORAGE_KEYS.careCircle, []).filter(
      (m) => m.patientId === patientId,
    );
  },

  add(member: Omit<CareCircleMember, 'id'>): CareCircleMember[] {
    const all = readValue<CareCircleMember[]>(STORAGE_KEYS.careCircle, []);
    writeValue(STORAGE_KEYS.careCircle, [...all, { ...member, id: makeId('ccm') }]);
    return careCircleService.list(member.patientId);
  },

  markContacted(id: string, patientId = DEMO_PATIENT_ID): CareCircleMember[] {
    const next = readValue<CareCircleMember[]>(STORAGE_KEYS.careCircle, []).map((m) =>
      m.id === id ? { ...m, lastContactedAt: new Date().toISOString() } : m,
    );
    writeValue(STORAGE_KEYS.careCircle, next);
    return next.filter((m) => m.patientId === patientId);
  },
};

// --------------------------------------------------------------------- alerts

export const alertService = {
  list(patientId = DEMO_PATIENT_ID): CaregiverAlert[] {
    return readValue<CaregiverAlert[]>(STORAGE_KEYS.alerts, []).filter(
      (a) => a.patientId === patientId,
    );
  },

  /** Every patient's alerts, for the caregiver's overview. */
  listFor(patientIds: string[]): CaregiverAlert[] {
    const wanted = new Set(patientIds);
    return readValue<CaregiverAlert[]>(STORAGE_KEYS.alerts, []).filter((a) =>
      wanted.has(a.patientId),
    );
  },

  acknowledge(id: string): CaregiverAlert[] {
    const next = readValue<CaregiverAlert[]>(STORAGE_KEYS.alerts, []).map((a) =>
      a.id === id ? { ...a, acknowledged: true } : a,
    );
    writeValue(STORAGE_KEYS.alerts, next);
    return next;
  },
};

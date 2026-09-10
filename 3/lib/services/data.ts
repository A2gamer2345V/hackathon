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
  SessionState,
  UserRole,
} from '@/lib/types';
import { makeId } from '@/lib/utils';
import {
  dateInZone,
  dateInZoneDaysAgo,
  daysBetweenDates,
  detectTimezone,
  safeTimezone,
  todayInZone,
} from '@/lib/utils/timezone';
import { isActiveOn, weekdayOfDate } from '@/lib/utils/reminders';
import {
  cacheAll,
  cacheRead,
  cacheWrite,
  patientList as cachedPatients,
  setPatientList,
} from './records-cache';

/**
 * The data layer the UI talks to.
 *
 * Everything in here is synchronous and in-memory: reads go to the per-patient
 * record cache, writes update the cache and then flush to the API. The provider
 * (`lib/providers/app-state-provider.tsx`) owns the fetch — hydrating the cache
 * from `/api/patients/[id]/records` on sign-in and patient switch, and pushing
 * the whole cache back with `putRecords` on mutation. Components never touch
 * storage, the API or demo data directly.
 *
 * Every list is scoped by `patientId`. A caregiver looking after several people
 * gets one person's sessions, reminders, family and insights at a time; data is
 * never pooled or averaged across patients.
 */

// ------------------------------------------------------------------ patients

/**
 * The patient list is held in cache (via setPatientList), which the provider
 * keeps in step with the API. Before anything has been loaded — no session, pre
 * hydration — it is empty rather than fabricated.
 */
export const patientService = {
  list(): PatientProfile[] {
    return cachedPatients();
  },

  get(id: string): PatientProfile | null {
    return cachedPatients().find((p) => p.id === id) ?? null;
  },

  /** Only the patients a given caregiver is linked to. */
  listFor(patientIds: string[]): PatientProfile[] {
    const wanted = new Set(patientIds);
    return cachedPatients().filter((p) => wanted.has(p.id));
  },

  save(profile: PatientProfile): PatientProfile[] {
    const all = cachedPatients();
    const exists = all.some((p) => p.id === profile.id);
    const next = exists ? all.map((p) => (p.id === profile.id ? profile : p)) : [...all, profile];
    setPatientList(next);
    return next;
  },

  update(id: string, patch: Partial<PatientProfile>): PatientProfile[] {
    const next = cachedPatients().map((p) => (p.id === id ? { ...p, ...patch, id } : p));
    setPatientList(next);
    return next;
  },

  /**
   * Removes a patient from the local list. The provider calls `api.deletePatient`
   * for the server-side cascade; this function only mirrors it in memory.
   */
  remove(id: string): PatientProfile[] {
    const next = cachedPatients().filter((p) => p.id !== id);
    setPatientList(next);
    return next;
  },
};

// --------------------------------------------------------------- activities

/**
 * The zone a patient's own day is measured in.
 *
 * "Today" for a plan, a reminder or a day's progress is the patient's calendar
 * day, not the reader's: a caregiver in London opening the app at 21:00 is
 * looking at a person in Kolkata for whom it is already tomorrow, and the day
 * plan they see must be the one that person will actually wake up to. Falls back
 * to the device only while the roster has not loaded.
 */
function zoneOf(patientId: string): string {
  return safeTimezone(patientService.get(patientId)?.timezone || detectTimezone());
}

/**
 * How many days of day-plan rows are kept.
 *
 * The plan repeats, so old days are only worth keeping for the ticks they hold.
 * Comfortably longer than any window the progress and insight screens look back
 * over, and short enough that a year of use does not turn one patient's record
 * into a few thousand rows of the same six chores.
 */
const PLAN_HISTORY_DAYS = 45;

export const activityService = {
  listForDate(patientId: string, date = todayInZone(zoneOf(patientId))): DailyActivity[] {
    return (cacheRead(patientId, 'activities') as DailyActivity[]).filter(
      (a) => a.date === date && a.patientId === patientId,
    );
  },

  /**
   * Carries the day plan forward to a date that has none.
   *
   * The plan is a routine, not a diary — the same walk, meals and medicines come
   * round every day — but it is stored per date so each day keeps its own ticks.
   * That means a day nobody has opened yet has no rows at all, and without this
   * the plan would read "0 of 0" from the day after it was written onwards, for
   * everyone. So the most recent day on record is copied forward, unticked.
   *
   * Nothing is invented. A patient who has never had a plan still has none and
   * stays honestly empty until someone writes one; a day that already has rows is
   * left exactly as it is, ticks and all.
   */
  ensureDay(patientId: string, date = todayInZone(zoneOf(patientId))): DailyActivity[] {
    const all = cacheRead(patientId, 'activities') as DailyActivity[];
    const mine = all.filter((a) => a.patientId === patientId);
    const onDate = mine.filter((a) => a.date === date);
    if (onDate.length > 0 || mine.length === 0) return onDate;

    // The single most recent day, not a merge of several: a plan that was edited
    // over time should carry forward as it last stood.
    const latest = mine.reduce((max, a) => (a.date > max ? a.date : max), mine[0].date);
    if (latest >= date) return onDate;

    const carried = mine
      .filter((a) => a.date === latest)
      .map((a) => ({
        ...a,
        // Ids stay one suffix deep, so rolling forward on many consecutive days
        // does not grow a tail of dates on every row.
        id: `${a.id.split('@')[0]}@${date}`,
        date,
        completed: false,
        completedAt: undefined,
      }));

    const kept = all.filter(
      (a) => a.patientId !== patientId || daysBetweenDates(a.date, date) <= PLAN_HISTORY_DAYS,
    );
    cacheWrite(patientId, 'activities', [...kept, ...carried]);
    return carried;
  },

  setCompleted(id: string, completed: boolean, patientId: string): DailyActivity[] {
    const all = cacheRead(patientId, 'activities') as DailyActivity[];
    const next = all.map((a) =>
      a.id === id
        ? {
            ...a,
            completed,
            completedAt: completed ? new Date().toISOString() : undefined,
          }
        : a,
    );
    cacheWrite(patientId, 'activities', next);
    const today = todayInZone(zoneOf(patientId));
    return next.filter((a) => a.date === today && a.patientId === patientId);
  },

  /** Marks the day's cognitive slot done when a game is finished. */
  completeLinkedGame(gameId: string, patientId: string): void {
    const all = cacheRead(patientId, 'activities') as DailyActivity[];
    const today = todayInZone(zoneOf(patientId));
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
    if (changed) cacheWrite(patientId, 'activities', next);
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
  list(patientId: string): Reminder[] {
    return (cacheRead(patientId, 'reminders') as Reminder[]).filter(
      (r) => r.patientId === patientId,
    );
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
    const all = cacheRead(patientId, 'reminders') as Reminder[];
    cacheWrite(patientId, 'reminders', [...all, reminder]);
    return reminderService.list(patientId);
  },

  update(
    id: string,
    patch: Partial<Omit<Reminder, 'id' | 'patientId'>>,
    by: UserRole = 'patient',
  ): Reminder[] {
    const all = cacheAll('reminders') as Reminder[];
    const target = all.find((r) => r.id === id);
    const list = cacheRead(target?.patientId ?? '', 'reminders') as Reminder[];
    const next = list.map((r) =>
      r.id === id ? { ...r, ...patch, updatedBy: by, updatedAt: new Date().toISOString() } : r,
    );
    cacheWrite(target?.patientId ?? '', 'reminders', next);
    return next.filter((r) => r.patientId === (target?.patientId ?? ''));
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
    const all = cacheAll('reminders') as Reminder[];
    const target = all.find((r) => r.id === id);
    const list = cacheRead(target?.patientId ?? '', 'reminders') as Reminder[];
    const next = list.filter((r) => r.id !== id);
    cacheWrite(target?.patientId ?? '', 'reminders', next);
    return next.filter((r) => r.patientId === (target?.patientId ?? ''));
  },
};

// ------------------------------------------------------------ game sessions

/**
 * What a game reports when it opens. The rest is filled in when it ends.
 */
export type SessionOpening = Pick<GameSession, 'patientId' | 'gameId' | 'difficulty'>;

/** The numbers a game reports when it ends. */
export type SessionOutcome = Pick<
  GameSession,
  'correct' | 'total' | 'mistakes' | 'hintsUsed' | 'durationSeconds' | 'averageResponseSeconds'
>;

/** What a game reports when it finishes in one go. The service fills in the rest. */
export type SessionDraft = Omit<GameSession, 'id' | 'completedAt' | 'startedAt' | 'accuracy'> &
  Partial<Pick<GameSession, 'startedAt'>>;

/**
 * How long an open run may sit untouched before it is read as abandoned.
 *
 * Long enough that a person who puts the tablet down mid-puzzle, makes a cup of
 * tea and comes back still has their run; short enough that a closed tab does
 * not leave something described as "playing now" the next morning.
 */
const STALE_SESSION_MS = 2 * 60 * 60 * 1000;

/**
 * One stored run, brought up to the current shape.
 *
 * Two things happen here, both on read rather than by rewriting storage.
 *
 * Rows written before runs had a `state` carry a `completed` boolean instead.
 * They are read through it rather than discarded — a person's history is not
 * something to throw away because the schema moved, and without this every
 * existing session would silently vanish from their progress screens.
 *
 * And a run left open long enough is reported as abandoned. Doing that on read
 * keeps the record of what happened from changing just because somebody opened a
 * dashboard, and means a person who really is still playing does not have their
 * live run rewritten underneath them.
 */
function normaliseSession(session: GameSession, now: number): GameSession {
  const legacy = session as GameSession & { completed?: boolean };
  const state: SessionState =
    session.state ?? (legacy.completed === false ? 'abandoned' : 'completed');

  if (state !== 'in_progress') {
    return session.state === state ? session : { ...session, state };
  }

  const touched = new Date(session.completedAt).getTime();
  if (Number.isNaN(touched) || now - touched < STALE_SESSION_MS) {
    return session.state === state ? session : { ...session, state };
  }
  return { ...session, state: 'abandoned' };
}

export const sessionService = {
  list(patientId: string): GameSession[] {
    const now = Date.now();
    return (cacheRead(patientId, 'gameSessions') as GameSession[])
      .filter((s) => s.patientId === patientId)
      .map((s) => normaliseSession(s, now));
  },

  /**
   * Opens a run and returns its id.
   *
   * Written before the first question so that leaving the screen — or the tablet
   * running out of battery — still leaves evidence that the activity was started.
   * Nothing is scored from this row until `finish` decides how it ended.
   */
  begin(opening: SessionOpening): { sessions: GameSession[]; id: string } {
    const at = new Date().toISOString();
    const entry: GameSession = {
      ...opening,
      id: makeId('sess'),
      correct: 0,
      total: 0,
      accuracy: 0,
      mistakes: 0,
      hintsUsed: 0,
      durationSeconds: 0,
      averageResponseSeconds: null,
      state: 'in_progress',
      startedAt: at,
      completedAt: at,
    };
    const all = cacheRead(opening.patientId, 'gameSessions') as GameSession[];
    cacheWrite(opening.patientId, 'gameSessions', [...all, entry]);
    return { sessions: sessionService.list(opening.patientId), id: entry.id };
  },

  /**
   * Closes an open run.
   *
   * The linked item on the day's plan is only ticked off for a run that was
   * actually finished. Ticking it for someone who stopped after one question
   * would put something in the record that did not happen, and the plan is meant
   * to be a truthful account of the day.
   */
  finish(id: string, state: SessionState, outcome: SessionOutcome): GameSession[] {
    const all = cacheAll('gameSessions') as GameSession[];
    const target = all.find((s) => s.id === id);
    if (!target) return [];

    const list = cacheRead(target.patientId, 'gameSessions') as GameSession[];
    const next = list.map((s) =>
      s.id === id
        ? {
            ...s,
            ...outcome,
            accuracy: outcome.total === 0 ? 0 : outcome.correct / outcome.total,
            state,
            completedAt: new Date().toISOString(),
          }
        : s,
    );
    cacheWrite(target.patientId, 'gameSessions', next);

    if (state === 'completed') {
      activityService.completeLinkedGame(target.gameId, target.patientId);
    }
    return sessionService.list(target.patientId);
  },

  record(draft: SessionDraft): GameSession[] {
    const at = new Date().toISOString();
    const entry: GameSession = {
      ...draft,
      accuracy: draft.total === 0 ? 0 : draft.correct / draft.total,
      id: makeId('sess'),
      startedAt: draft.startedAt ?? at,
      completedAt: at,
    };
    const all = cacheRead(draft.patientId, 'gameSessions') as GameSession[];
    cacheWrite(draft.patientId, 'gameSessions', [...all, entry]);
    if (entry.state === 'completed') {
      activityService.completeLinkedGame(draft.gameId, draft.patientId);
    }
    return sessionService.list(draft.patientId);
  },
};

// ------------------------------------------------------------ family & faces

export type FamilyDraft = Pick<FamilyMember, 'name' | 'relationship'> &
  Partial<Pick<FamilyMember, 'relationshipLabel' | 'photo' | 'notes' | 'inRecognitionGame'>>;

export const familyService = {
  list(patientId: string): FamilyMember[] {
    return (cacheRead(patientId, 'family') as FamilyMember[]).filter(
      (f) => f.patientId === patientId,
    );
  },

  /** Just the people the recognition activity is allowed to ask about. */
  forRecognition(patientId: string): FamilyMember[] {
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
    const all = cacheRead(patientId, 'family') as FamilyMember[];
    cacheWrite(patientId, 'family', [...all, member]);
    return familyService.list(patientId);
  },

  update(id: string, patch: Partial<Omit<FamilyMember, 'id' | 'patientId'>>): FamilyMember[] {
    const all = cacheAll('family') as FamilyMember[];
    const target = all.find((f) => f.id === id);
    const list = cacheRead(target?.patientId ?? '', 'family') as FamilyMember[];
    const next = list.map((f) => (f.id === id ? { ...f, ...patch } : f));
    cacheWrite(target?.patientId ?? '', 'family', next);
    return next.filter((f) => f.patientId === (target?.patientId ?? ''));
  },

  remove(id: string): FamilyMember[] {
    const all = cacheAll('family') as FamilyMember[];
    const target = all.find((f) => f.id === id);
    const list = cacheRead(target?.patientId ?? '', 'family') as FamilyMember[];
    const next = list.filter((f) => f.id !== id);
    cacheWrite(target?.patientId ?? '', 'family', next);
    return next.filter((f) => f.patientId === (target?.patientId ?? ''));
  },
};

// ------------------------------------------------------------------ progress

export const progressService = {
  /**
   * One record per day for the last `days` days, oldest first.
   *
   * Days are the patient's calendar days. A session finished at 00:30 in Kolkata
   * is a UTC timestamp from the previous afternoon, so grouping by the leading
   * characters of the ISO string would file it under the wrong day — every
   * session is converted into the patient's zone before it is counted.
   */
  daily(patientId: string, days = 7): ProgressRecord[] {
    const zone = zoneOf(patientId);
    const sessions = sessionService.list(patientId);
    const reminders = reminderService.list(patientId);
    const out: ProgressRecord[] = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = dateInZoneDaysAgo(offset, zone);
      const daySessions = sessions.filter(
        (s) => dateInZone(new Date(s.completedAt), zone) === date,
      );
      // Only finished runs are counted, exactly as `gameStats` does it. Someone
      // who opens a puzzle, finds it tiring and stops has not scored zero;
      // folding that into the day's accuracy would show a caregiver a decline
      // that never happened, and would make "played 10" mean ten runs nobody
      // actually did.
      const dayFinished = daySessions.filter((s) => s.state === 'completed');
      const totalCorrect = dayFinished.reduce((sum, s) => sum + s.correct, 0);
      const totalQuestions = dayFinished.reduce((sum, s) => sum + s.total, 0);

      // Adherence is only known precisely for today, and only for the reminders
      // that were actually due — counting a Tuesday-only reminder against a
      // Monday, or one that is switched off against any day, would report a
      // person as missing something nobody ever asked of them. Earlier days use
      // the history implied by completed timestamps.
      const dayReminders =
        offset === 0
          ? reminders.filter((r) => isActiveOn(r, date, weekdayOfDate(date)))
          : reminders.filter(
              (r) => !!r.completedAt && dateInZone(new Date(r.completedAt), zone) === date,
            );
      const completed = dayReminders.filter((r) => r.status === 'completed').length;

      out.push({
        date,
        thingsDone: dayFinished.length + completed,
        gamesPlayed: dayFinished.length,
        reminderAdherence: dayReminders.length ? completed / dayReminders.length : 0,
        averageAccuracy: totalQuestions ? totalCorrect / totalQuestions : 0,
      });
    }
    return out;
  },

  achievements(patientId: string): Achievement[] {
    return (cacheRead(patientId, 'achievements') as Achievement[]).filter(
      (a) => a.patientId === patientId,
    );
  },

  unlock(id: string, patientId: string): Achievement[] {
    const next = (cacheRead(patientId, 'achievements') as Achievement[]).map((a) =>
      a.id === id && !a.unlockedAt ? { ...a, unlockedAt: new Date().toISOString() } : a,
    );
    cacheWrite(patientId, 'achievements', next);
    return next.filter((a) => a.patientId === patientId);
  },
};

// ---------------------------------------------------------------- care circle

export const careCircleService = {
  list(patientId: string): CareCircleMember[] {
    return (cacheRead(patientId, 'careCircle') as CareCircleMember[]).filter(
      (m) => m.patientId === patientId,
    );
  },

  add(member: Omit<CareCircleMember, 'id'>): CareCircleMember[] {
    const all = cacheRead(member.patientId, 'careCircle') as CareCircleMember[];
    cacheWrite(member.patientId, 'careCircle', [...all, { ...member, id: makeId('ccm') }]);
    return careCircleService.list(member.patientId);
  },

  markContacted(id: string, patientId: string): CareCircleMember[] {
    const next = (cacheRead(patientId, 'careCircle') as CareCircleMember[]).map((m) =>
      m.id === id ? { ...m, lastContactedAt: new Date().toISOString() } : m,
    );
    cacheWrite(patientId, 'careCircle', next);
    return next.filter((m) => m.patientId === patientId);
  },
};

// --------------------------------------------------------------------- alerts

export const alertService = {
  list(patientId: string): CaregiverAlert[] {
    return (cacheRead(patientId, 'alerts') as CaregiverAlert[]).filter(
      (a) => a.patientId === patientId,
    );
  },

  /** Every patient's alerts, for the caregiver's overview. */
  listFor(patientIds: string[]): CaregiverAlert[] {
    const wanted = new Set(patientIds);
    return patientIds.flatMap((id) => cacheRead(id, 'alerts') as CaregiverAlert[]).filter((a) =>
      wanted.has(a.patientId),
    );
  },

  acknowledge(id: string): CaregiverAlert[] {
    const all = cacheAll('alerts') as CaregiverAlert[];
    const target = all.find((a) => a.id === id);
    const list = cacheRead(target?.patientId ?? '', 'alerts') as CaregiverAlert[];
    const next = list.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
    cacheWrite(target?.patientId ?? '', 'alerts', next);
    return next;
  },
};

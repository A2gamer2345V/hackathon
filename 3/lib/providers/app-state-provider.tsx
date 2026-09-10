'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AbilityProfile,
  AccessibilityPreferences,
  Achievement,
  AiInsight,
  CareCircleMember,
  CaregiverAlert,
  CaregiverProfile,
  DailyActivity,
  FamilyMember,
  GameConfig,
  GameId,
  GameSession,
  GameStats,
  PatientProfile,
  Reminder,
  SessionState,
  SpeechSpeed,
  User,
  UserRole,
} from '@/lib/types';
import {
  activityService,
  alertService,
  careCircleService,
  familyService,
  progressService,
  reminderService,
  sessionService,
  type FamilyDraft,
  type ReminderDraft,
  type SessionOutcome,
} from '@/lib/services/data';
import {
  flushPendingSyncs,
  patientList as cachePatients,
  recordsCache,
  setPatientList,
  setRecordSync,
} from '@/lib/services/records-cache';
import { abilityProfile, allGameStats, buildInsights, configureGame } from '@/lib/ai/engine';
import { readValue, removeValue, writeValue, STORAGE_KEYS } from '@/lib/services/storage';
import { useLanguage } from './language-provider';
import type { LanguageCode } from '@/lib/i18n/languages';
import { api } from '@/lib/api/client';
import type { SessionResponse, SessionUser } from '@/lib/api/contract';
import { detectTimezone } from '@/lib/utils/timezone';

/**
 * Application state: who is signed in, whose data is on screen, and everything
 * that belongs to that person.
 *
 * Identity and ownership come from the server. On mount this provider calls
 * `/api/auth/session`; the response tells us who we are (or that we are signed
 * out). It then loads the caregiver's patient list and the active patient's
 * records into an in-memory cache, and every mutation writes through to the API.
 *
 * One idea does most of the work here: there is a single *active patient*. A
 * patient session has exactly one; a caregiver session switches between the
 * people they look after. Every list below belongs to that patient and nobody
 * else, which is how two patients under one caregiver account stay separate.
 */

export const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  textScale: 'normal',
  highContrast: false,
  reducedMotion: false,
  voiceGuidance: true,
  notifications: true,
  offlineMode: true,
};

export interface SessionInput {
  gameId: GameId;
  difficulty: GameSession['difficulty'];
  correct: number;
  total: number;
  mistakes: number;
  hintsUsed: number;
  durationSeconds: number;
  averageResponseSeconds: number | null;
  state: SessionState;
}

interface AppStateValue {
  hydrated: boolean;
  user: User | null;
  role: UserRole | null;

  /** The person whose data is on screen. */
  patient: PatientProfile | null;
  /** Everyone the signed-in caregiver looks after. Empty for a patient session. */
  patients: PatientProfile[];
  caregiver: CaregiverProfile | null;
  accessibility: AccessibilityPreferences;
  /**
   * IANA zone of whoever is signed in. A caregiver in New York and their patient
   * in Kolkata each keep their own. This is the caregiver's *own* clock — use it
   * for their account, not for the days they are reading about.
   */
  timezone: string;
  /**
   * The zone whose calendar the screen should be read on: the active patient's,
   * falling back to the signed-in user's.
   *
   * A care screen is a window onto somebody else's day. If it is 10pm Monday in
   * New York it is already Tuesday morning in Kolkata, and "today's plan" has to
   * mean the patient's Tuesday — otherwise the caregiver is handed a day that
   * finished hours ago, and a reminder due at 08:00 looks missed when nobody has
   * woken up yet. On a patient's own session the two are the same value.
   */
  viewingTimezone: string;
  /** True for the two seeded demo logins. Real accounts are never marked demo. */
  isDemo: boolean;

  activities: DailyActivity[];
  reminders: Reminder[];
  sessions: GameSession[];
  achievements: Achievement[];
  family: FamilyMember[];
  careCircle: CareCircleMember[];
  alerts: CaregiverAlert[];

  /** What the adaptive engine currently believes about the active patient. */
  ability: AbilityProfile | null;
  insights: AiInsight[];
  /** Per-activity rollups for the caregiver's performance screen. */
  gameStats: GameStats[];
  /** People available to the Faces & Names activity. */
  recognitionPeople: number;
  /** The settings the engine has chosen for one activity. */
  configFor: (gameId: GameId) => GameConfig | null;

  setRole: (role: UserRole) => void;
  setUser: (user: User | null) => void;
  completeOnboarding: (patch: {
    name: string;
    age?: number;
    speechSpeed?: SpeechSpeed;
    caregiverRelation?: string;
    preferredActivities?: PatientProfile['preferredActivities'];
    accessibility?: Partial<AccessibilityPreferences>;
    relationToPatient?: string;
    language?: LanguageCode;
  }) => void;
  updateAccessibility: (patch: Partial<AccessibilityPreferences>) => void;
  updatePatient: (patch: Partial<PatientProfile>) => void;
  updateCaregiver: (patch: Partial<CaregiverProfile>) => void;

  selectPatient: (patientId: string) => void;
  /**
   * Re-reads the caregiver's roster from the server. Needed when a deep link names
   * a patient this tab has not heard of — added in another tab, say — because the
   * local list is a copy of server state, not the record.
   */
  refreshPatients: () => Promise<void>;
  /**
   * Creates a real patient login. Email and an initial password are required —
   * a patient cannot register themselves, so this is the only way one gets an
   * account. Rejects with an `ApiRequestError` (`email-taken`, `weak-password`)
   * the form can read.
   */
  addPatient: (draft: {
    name: string;
    email: string;
    password: string;
    age?: number;
    language?: LanguageCode;
    timezone?: string;
  }) => Promise<PatientProfile>;
  removePatient: (patientId: string) => Promise<void>;
  /** Sets a new password for one of this caregiver's patients. Never reads one back. */
  resetPatientPassword: (patientId: string, password: string) => Promise<void>;
  /** Changes the signed-in user's own password; needs the current one. */
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<void>;

  toggleActivity: (id: string) => void;
  addReminder: (draft: ReminderDraft) => void;
  updateReminder: (id: string, patch: Partial<Omit<Reminder, 'id' | 'patientId'>>) => void;
  setReminderStatus: (id: string, status: Reminder['status']) => void;
  setReminderEnabled: (id: string, enabled: boolean) => void;
  removeReminder: (id: string) => void;

  addFamilyMember: (draft: FamilyDraft) => void;
  updateFamilyMember: (id: string, patch: Partial<Omit<FamilyMember, 'id' | 'patientId'>>) => void;
  removeFamilyMember: (id: string) => void;

  /**
   * Opens a run and returns its id, so it can be closed honestly later.
   *
   * Written before the first question rather than after the last one: if the
   * person walks away, the record should still show that they sat down to it.
   */
  beginSession: (gameId: GameId, difficulty: GameSession['difficulty']) => string;
  /** Closes an open run with how it ended and what happened in it. */
  finishSession: (id: string, state: SessionState, outcome: SessionOutcome) => void;
  recordSession: (input: SessionInput) => void;
  contactMember: (id: string) => void;
  acknowledgeAlert: (id: string) => void;

  /** Adopts a server session response — used by the sign-in and sign-up forms. */
  adoptSession: (response: SessionResponse) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Puts the demo accounts' data back to its starting state. The server refuses
   * this for any session that is not a demo one, so it is offered only when
   * `isDemo` is true.
   */
  resetDemoData: () => Promise<void>;
}

interface Snapshot {
  user: User | null;
  role: UserRole | null;
  patients: PatientProfile[];
  activePatientId: string;
  caregiver: CaregiverProfile | null;
  /** The signed-in account's own IANA zone, from the server. */
  timezone: string;
  /** True for the two seeded demo logins, so the UI can label them as such. */
  isDemo: boolean;
  activities: DailyActivity[];
  reminders: Reminder[];
  sessions: GameSession[];
  achievements: Achievement[];
  family: FamilyMember[];
  careCircle: CareCircleMember[];
  alerts: CaregiverAlert[];
}

/**
 * The record lists that belong to one patient. Reset together whenever the
 * active patient changes, so a switch never leaves the previous person's
 * reminders or sessions on screen. `patients` is deliberately not in here — the
 * caregiver's roster outlives any single patient selection.
 */
const EMPTY_LISTS = {
  activities: [] as DailyActivity[],
  reminders: [] as Reminder[],
  sessions: [] as GameSession[],
  achievements: [] as Achievement[],
  family: [] as FamilyMember[],
  careCircle: [] as CareCircleMember[],
  alerts: [] as CaregiverAlert[],
};

const NO_INSIGHTS: AiInsight[] = [];
/** No user until we hear from the server. */
const NO_SESSION: Snapshot = {
  user: null,
  role: null,
  patients: [],
  activePatientId: '',
  caregiver: null,
  timezone: '',
  isDemo: false,
  ...EMPTY_LISTS,
};

/** Every record list for one patient, read out of the cache. */
function patientLists(patientId: string) {
  return {
    // Rolls the day plan forward first, so a plan written last week still reads
    // as today's plan rather than as "0 of 0".
    activities: activityService.ensureDay(patientId),
    reminders: reminderService.list(patientId),
    sessions: sessionService.list(patientId),
    achievements: progressService.achievements(patientId),
    family: familyService.list(patientId),
    careCircle: careCircleService.list(patientId),
    alerts: alertService.list(patientId),
  };
}

/** The server's session user, as the rest of the app's `User` shape. */
function toUser(account: SessionUser): User {
  return {
    id: account.id,
    identifier: account.email,
    displayName: account.displayName,
    role: account.role,
    createdAt: '',
    onboarded: account.onboarded,
  };
}

const AppStateContext = createContext<AppStateValue | null>(null);

/**
 * Which patient a caregiver should land on, given the roster the server just
 * returned.
 *
 * The remembered id is a device preference and nothing more. It is checked
 * against the roster rather than trusted, so a stale id — a patient since
 * deleted, one belonging to an account that used this browser earlier, or a
 * value someone typed into devtools — falls through to the first patient
 * instead of being honoured. It could not grant access in any case: every
 * request for that patient's data is authorised server-side against who owns
 * them.
 *
 * Remembering it at all is a small thing that matters in use. A caregiver
 * looking after two people, reading about the second, should not be silently
 * moved back to the first by a page reload — least of all without noticing,
 * which is how someone ends up reading the wrong person's week.
 */
function resolveActivePatient(patients: PatientProfile[]): string {
  const remembered = readValue<string>(STORAGE_KEYS.activePatient, '');
  const known = remembered && patients.some((p) => p.id === remembered);
  return known ? remembered : patients[0]?.id ?? '';
}

/** Records the caregiver's choice for the next visit. Never a source of truth. */
function rememberActivePatient(patientId: string): void {
  if (patientId) writeValue(STORAGE_KEYS.activePatient, patientId);
  else removeValue(STORAGE_KEYS.activePatient);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { setLanguage } = useLanguage();
  const [snapshot, setSnapshot] = useState<Snapshot>(NO_SESSION);
  const [hydrated, setHydrated] = useState(false);
  const initialisedRef = useRef(false);

  /**
   * Installs a server session response as the app's identity.
   *
   * Note what this does *not* do: it never merges with whatever was on screen
   * before. Signing in wipes the cache first, so no record from a previous
   * account can survive into the next one — that is the guarantee behind "a
   * patient must never see another patient's data".
   */
  const applySession = useCallback((response: SessionResponse) => {
    recordsCache.clear();
    const { user, caregiver, patient } = response;
    if (!user) {
      setPatientList([]);
      setSnapshot(NO_SESSION);
      return;
    }
    const base = {
      user: toUser(user),
      timezone: user.timezone,
      isDemo: user.isDemo,
      ...EMPTY_LISTS,
    };
    if (user.role === 'caregiver' && caregiver) {
      // The roster arrives from /api/patients; until then the caregiver has none.
      setPatientList([]);
      setSnapshot({
        ...base,
        role: 'caregiver',
        caregiver,
        patients: [],
        activePatientId: '',
      });
    } else if (user.role === 'patient' && patient) {
      // A patient session holds exactly one patient: their own record.
      setPatientList([patient]);
      setSnapshot({
        ...base,
        role: 'patient',
        caregiver: null,
        patients: [patient],
        activePatientId: patient.id,
      });
    } else {
      // A role with no matching profile row is not a usable session.
      setPatientList([]);
      setSnapshot(NO_SESSION);
    }
  }, []);

  /**
   * Pulls a patient's records from the API into the cache, then republishes the
   * lists. The `activePatientId` guard matters: if the caregiver switches again
   * while a fetch is in flight, the late answer must not overwrite the newer
   * patient's lists.
   */
  const loadRecords = useCallback(async (patientId: string) => {
    if (!patientId) return;
    const { records } = await api.records(patientId);
    recordsCache.hydrate(patientId, records);
    const lists = patientLists(patientId);
    setSnapshot((prev) =>
      prev.activePatientId === patientId ? { ...prev, ...lists } : prev,
    );
  }, []);

  /**
   * Takes a session response all the way to a usable screen: identity, then the
   * roster (caregiver) or the single own record (patient), then that patient's
   * records. Shared by boot, sign-in, sign-up and demo sign-in, so all four end
   * in exactly the same state.
   */
  const adoptSession = useCallback(
    async (response: SessionResponse) => {
      applySession(response);
      if (!response.user) return;

      if (response.user.role === 'caregiver' && response.caregiver) {
        const { patients } = await api.patients();
        setPatientList(patients);
        // Back to whoever they were reading about, if that person is still on
        // the roster the server just handed us.
        const firstActive = resolveActivePatient(patients);
        rememberActivePatient(firstActive);
        if (firstActive) {
          const { records } = await api.records(firstActive);
          recordsCache.hydrate(firstActive, records);
        }
        const lists = firstActive ? patientLists(firstActive) : EMPTY_LISTS;
        setSnapshot((prev) => ({
          ...prev,
          patients,
          activePatientId: firstActive,
          ...lists,
        }));
      } else if (response.user.role === 'patient' && response.patient) {
        const patientId = response.patient.id;
        const { records } = await api.records(patientId);
        recordsCache.hydrate(patientId, records);
        const lists = patientLists(patientId);
        setSnapshot((prev) => ({ ...prev, ...lists }));
      }
    },
    [applySession],
  );

  // Boot: ask the server who we are, then load what that person is allowed to see.
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    (async () => {
      try {
        await adoptSession(await api.session());
      } catch {
        // No reachable server: stay signed out rather than guessing an identity.
        setSnapshot(NO_SESSION);
      } finally {
        setHydrated(true);
      }
    })();
  }, [adoptSession]);

  // The API writes through: every mutation flushes the active patient's records.
  useEffect(() => {
    setRecordSync((patientId, payload) => {
      void api
        .putRecords(patientId, payload)
        .catch(() => {
          /* Offline — the cache is still correct for this session. */
        });
    });
  }, []);

  const user = snapshot.user;
  const role = snapshot.role;
  const caregiver = snapshot.caregiver;
  const patients = snapshot.patients;
  const activePatientId = snapshot.activePatientId;
  const patient = patients.find((p) => p.id === activePatientId) ?? null;
  /**
   * The signed-in account's zone from the server, falling back to the browser's
   * only while we have not heard yet. Never used to *store* a time — everything in
   * the database is UTC; this is purely how the reader sees it.
   */
  const sessionTimezone = snapshot.timezone || detectTimezone();
  /**
   * Whose calendar the screens read on. The patient being viewed owns the day
   * boundaries — their midnight is when their plan rolls over — so a caregiver
   * abroad is shown the patient's today rather than their own.
   */
  const viewingTimezone = patient?.timezone || sessionTimezone;

  // Empty lists before hydration, so a screen renders its loading state rather
  // than an empty one.
  const activities = hydrated ? snapshot.activities : EMPTY_LISTS.activities;
  const reminders = hydrated ? snapshot.reminders : EMPTY_LISTS.reminders;
  const sessions = hydrated ? snapshot.sessions : EMPTY_LISTS.sessions;
  const achievements = hydrated ? snapshot.achievements : EMPTY_LISTS.achievements;
  const family = hydrated ? snapshot.family : EMPTY_LISTS.family;
  const careCircle = hydrated ? snapshot.careCircle : EMPTY_LISTS.careCircle;
  const alerts = hydrated ? snapshot.alerts : EMPTY_LISTS.alerts;

  const accessibility = patient?.accessibility ?? DEFAULT_ACCESSIBILITY;

  // Only the caregiver's own people are listed, never every patient on the device.
  const visiblePatients = useMemo(() => {
    if (role === 'caregiver' && caregiver) {
      const wanted = new Set(caregiver.patientIds);
      return patients.filter((p) => wanted.has(p.id));
    }
    return patient ? [patient] : [];
  }, [caregiver, patient, patients, role]);

  const recognitionPeople = useMemo(
    () => family.filter((f) => f.inRecognitionGame).length,
    [family],
  );

  // ------------------------------------------------------- adaptive engine

  const engineInput = useMemo(
    () => (patient ? { patient, sessions, recognitionPeople } : null),
    [patient, recognitionPeople, sessions],
  );

  const ability = useMemo(
    () => (engineInput ? abilityProfile(engineInput) : null),
    [engineInput],
  );

  const insights = useMemo(
    () => (engineInput ? buildInsights(engineInput) : NO_INSIGHTS),
    [engineInput],
  );

  const gameStats = useMemo(() => allGameStats(sessions), [sessions]);

  const configFor = useCallback(
    (gameId: GameId) => (engineInput ? configureGame(gameId, engineInput) : null),
    [engineInput],
  );

  // Accessibility preferences drive real attributes on <html>, which the
  // stylesheet keys off — so "large text" genuinely enlarges the whole UI.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.textScale = accessibility.textScale;
    root.dataset.contrast = accessibility.highContrast ? 'high' : 'normal';
    root.dataset.motion = accessibility.reducedMotion ? 'reduced' : 'full';
  }, [accessibility.textScale, accessibility.highContrast, accessibility.reducedMotion]);

  // ------------------------------------------------------------- mutators

  /** Writes a patient roster to both the cache (services read it) and the view. */
  const publishPatients = useCallback((list: PatientProfile[]) => {
    setPatientList(list);
    setSnapshot((prev) => ({ ...prev, patients: list }));
  }, []);

  /**
   * Optimistic on screen, authoritative on the server. The local copy updates at
   * once so the form does not feel laggy, and the server's answer replaces it —
   * the server strips anything it will not let a client set.
   */
  const updatePatient = useCallback((patch: Partial<PatientProfile>) => {
    const active = cachePatients().find((p) => p.id === activePatientId);
    if (!active) return;
    const optimistic = { ...active, ...stripIdentity(patch) };
    publishPatients(cachePatients().map((p) => (p.id === active.id ? optimistic : p)));
    void api
      .updatePatient(active.id, stripIdentity(patch))
      .then(({ patient: saved }) => {
        publishPatients(cachePatients().map((p) => (p.id === saved.id ? saved : p)));
      })
      .catch(() => {
        /* Kept locally for this session; the next load reads the server's copy. */
      });
  }, [activePatientId, publishPatients]);

  const updateAccessibility = useCallback((patch: Partial<AccessibilityPreferences>) => {
    const active = cachePatients().find((p) => p.id === activePatientId);
    if (!active) return;
    updatePatient({
      accessibility: { ...active.accessibility, ...patch },
    });
  }, [activePatientId, updatePatient]);

  const updateCaregiver = useCallback((patch: Partial<CaregiverProfile>) => {
    if (!caregiver) return;
    const next = { ...caregiver, ...patch };
    setSnapshot((prev) => ({ ...prev, caregiver: next }));
    void api
      .updateCaregiver(stripCaregiverIdentity(patch))
      .then(() => undefined)
      .catch(() => undefined);
  }, [caregiver]);

  const selectPatient = useCallback((patientId: string) => {
    if (!patientId || !cachePatients().some((p) => p.id === patientId)) return;
    rememberActivePatient(patientId);
    setSnapshot((prev) => ({ ...prev, activePatientId: patientId }));
    loadRecords(patientId).catch(() => undefined);
  }, [loadRecords]);

  /**
   * Pulls the roster again. `/api/patients` returns exactly the signed-in
   * caregiver's patients, so its answer is also the authoritative membership list
   * — hence `patientIds` is rewritten from it rather than merged.
   */
  const refreshPatients = useCallback(async () => {
    if (role !== 'caregiver') return;
    const { patients: list } = await api.patients();
    publishPatients(list);
    setSnapshot((prev) =>
      prev.caregiver
        ? { ...prev, caregiver: { ...prev.caregiver, patientIds: list.map((p) => p.id) } }
        : prev,
    );
  }, [publishPatients, role]);

  /**
   * Creates a real patient account: the server hashes the password, enforces
   * email uniqueness and stamps the caregiver's id as the owner. The new person
   * becomes active, because filling in their details is almost always what the
   * caregiver does next.
   */
  const addPatient = useCallback<AppStateValue['addPatient']>(
    async (draft) => {
      if (!caregiver) throw new Error('Only a signed-in caregiver can add a patient');
      const { patient: created } = await api.createPatient({
        name: draft.name.trim(),
        email: draft.email.trim(),
        password: draft.password,
        timezone: draft.timezone ?? sessionTimezone ?? detectTimezone(),
        profile: {
          ...(draft.age === undefined ? {} : { age: draft.age }),
          ...(draft.language ? { language: draft.language } : {}),
        },
      });
      recordsCache.hydrate(created.id, {});
      publishPatients([...cachePatients(), created]);
      rememberActivePatient(created.id);
      setSnapshot((prev) => ({
        ...prev,
        caregiver: prev.caregiver
          ? { ...prev.caregiver, patientIds: [...prev.caregiver.patientIds, created.id] }
          : prev.caregiver,
        activePatientId: created.id,
        ...EMPTY_LISTS,
      }));
      // The server seeds a starter day/reminders for a new patient, so read back.
      loadRecords(created.id).catch(() => undefined);
      return created;
    },
    [caregiver, loadRecords, publishPatients, sessionTimezone],
  );

  /**
   * Deletes the account and everything belonging to it. The server cascade is the
   * real deletion — this only mirrors it locally so the list updates at once. If
   * the server refuses, the error propagates so the screen can say so.
   */
  const removePatient = useCallback(
    async (patientId: string) => {
      await api.deletePatient(patientId);
      recordsCache.drop(patientId);
      const remaining = cachePatients().filter((p) => p.id !== patientId);
      publishPatients(remaining);
      // Only rewrite the remembered choice if it was the person just deleted;
      // deleting someone else must not move the caregiver off who they were on.
      if (readValue<string>(STORAGE_KEYS.activePatient, '') === patientId) {
        rememberActivePatient(remaining[0]?.id ?? '');
      }
      const nextActiveId = remaining[0]?.id ?? '';
      const nextLists = nextActiveId ? patientLists(nextActiveId) : EMPTY_LISTS;
      setSnapshot((prev) => {
        const caregiver = prev.caregiver
          ? {
              ...prev.caregiver,
              patientIds: prev.caregiver.patientIds.filter((id) => id !== patientId),
            }
          : prev.caregiver;
        // Someone else was deleted: drop them from the roster and leave the
        // caregiver exactly where they were.
        if (prev.activePatientId !== patientId) return { ...prev, caregiver };
        return { ...prev, caregiver, activePatientId: nextActiveId, ...nextLists };
      });
      if (nextActiveId) loadRecords(nextActiveId).catch(() => undefined);
    },
    [loadRecords, publishPatients],
  );

  const completeOnboarding = useCallback<AppStateValue['completeOnboarding']>(
    (patch) => {
      if (patch.language) setLanguage(patch.language);
      const chosenLanguage = patch.language ?? null;
      if (role === 'caregiver') {
        updateCaregiver({
          name: patch.name,
          relationToPatient: patch.relationToPatient ?? 'Family',
          ...(chosenLanguage ? { language: chosenLanguage } : {}),
        });
      } else {
        updatePatient({
          name: patch.name,
          age: patch.age,
          language: (chosenLanguage ?? undefined) as LanguageCode | undefined,
          speechSpeed: patch.speechSpeed,
          caregiverRelation: patch.caregiverRelation,
          preferredActivities: patch.preferredActivities,
          accessibility: { ...accessibility, ...(patch.accessibility ?? {}) },
        });
      }
    },
    [accessibility, role, setLanguage, updateCaregiver, updatePatient],
  );

  /*
   * A note on the shape of everything below.
   *
   * The service call happens first and its result is then handed to
   * `setSnapshot` — never the other way round. A `setSnapshot(prev => …)`
   * updater must be pure, and React deliberately runs it twice in development
   * to catch the ones that are not. Calling a service inside the updater
   * therefore writes twice; for `add` — which mints a fresh id each time — that
   * meant one tap on "Save reminder" quietly created two identical reminders.
   * The idempotent calls survived the double run, but still flushed to the
   * server twice for no reason.
   */

  const toggleActivity = useCallback((id: string) => {
    const target = activityService.listForDate(activePatientId).find((a) => a.id === id);
    if (!target) return;
    const activities = activityService.setCompleted(id, !target.completed, activePatientId);
    setSnapshot((prev) => ({ ...prev, activities }));
  }, [activePatientId]);

  const addReminder = useCallback((draft: ReminderDraft) => {
    const reminders = reminderService.add(activePatientId, draft, role ?? 'patient');
    setSnapshot((prev) => ({ ...prev, reminders }));
  }, [activePatientId, role]);

  const updateReminder = useCallback<AppStateValue['updateReminder']>((id, patch) => {
    const reminders = reminderService.update(id, patch, role ?? 'patient');
    setSnapshot((prev) => ({ ...prev, reminders }));
  }, [role]);

  const setReminderStatus = useCallback<AppStateValue['setReminderStatus']>((id, status) => {
    const reminders = reminderService.setStatus(id, status, role ?? 'patient');
    setSnapshot((prev) => ({ ...prev, reminders }));
  }, [role]);

  const setReminderEnabled = useCallback((id: string, enabled: boolean) => {
    const reminders = reminderService.setEnabled(id, enabled, role ?? 'patient');
    setSnapshot((prev) => ({ ...prev, reminders }));
  }, [role]);

  const removeReminder = useCallback((id: string) => {
    const reminders = reminderService.remove(id);
    setSnapshot((prev) => ({ ...prev, reminders }));
  }, []);

  const addFamilyMember = useCallback((draft: FamilyDraft) => {
    const family = familyService.add(activePatientId, draft);
    setSnapshot((prev) => ({ ...prev, family }));
  }, [activePatientId]);

  const updateFamilyMember = useCallback<AppStateValue['updateFamilyMember']>((id, patch) => {
    const family = familyService.update(id, patch);
    setSnapshot((prev) => ({ ...prev, family }));
  }, []);

  const removeFamilyMember = useCallback((id: string) => {
    const family = familyService.remove(id);
    setSnapshot((prev) => ({ ...prev, family }));
  }, []);

  const beginSession = useCallback(
    (gameId: GameId, difficulty: GameSession['difficulty']) => {
      const { sessions: next, id } = sessionService.begin({
        patientId: activePatientId,
        gameId,
        difficulty,
      });
      setSnapshot((prev) => ({ ...prev, sessions: next }));
      return id;
    },
    [activePatientId],
  );

  const finishSession = useCallback(
    (id: string, state: SessionState, outcome: SessionOutcome) => {
      const next = sessionService.finish(id, state, outcome);
      // An empty list means the row was not found — a stale id from a previous
      // sign-in, say. Leaving the snapshot alone is better than blanking it.
      if (next.length === 0) return;
      setSnapshot((prev) => ({
        ...prev,
        sessions: next,
        activities: activityService.listForDate(activePatientId),
        achievements: progressService.achievements(activePatientId),
      }));
    },
    [activePatientId],
  );

  const recordSession = useCallback((input: SessionInput) => {
    const next = sessionService.record({ ...input, patientId: activePatientId });
    setSnapshot((prev) => ({
      ...prev,
      sessions: next,
      activities: activityService.listForDate(activePatientId),
      achievements: progressService.achievements(activePatientId),
    }));
  }, [activePatientId]);

  const contactMember = useCallback((id: string) => {
    const careCircle = careCircleService.markContacted(id, activePatientId);
    setSnapshot((prev) => ({ ...prev, careCircle }));
  }, [activePatientId]);

  const acknowledgeAlert = useCallback((id: string) => {
    alertService.acknowledge(id);
    setSnapshot((prev) => ({
      ...prev,
      alerts: alertService.list(activePatientId),
    }));
  }, [activePatientId]);

  /**
   * Sets a patient's password. Only the server knows the hash; nothing here
   * holds, echoes or stores the plaintext beyond this call, and the server drops
   * that patient's existing sessions so an old device cannot stay signed in.
   */
  const resetPatientPassword = useCallback(async (patientId: string, password: string) => {
    await api.setPatientPassword(patientId, password);
  }, []);

  const changeOwnPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await api.changeOwnPassword({ currentPassword, newPassword });
    },
    [],
  );

  const signOut = useCallback(async () => {
    // Push anything still queued before the cache is cleared, or the last edit
    // made just before signing out would be lost.
    flushPendingSyncs();
    try {
      await api.logout();
    } catch {
      /* Even if the call fails, clearing local state signs the user out here. */
    }
    recordsCache.clear();
    setPatientList([]);
    // Nothing about the last account should outlive it on a shared device.
    removeValue(STORAGE_KEYS.activePatient);
    setSnapshot(NO_SESSION);
  }, []);

  /**
   * Restores the demo fixtures and stays signed in.
   *
   * The server does the work and refuses outright unless the session is a demo
   * one, so this cannot touch a real account's records. The queued write-through
   * is dropped first — flushing it afterwards would push the very data we just
   * asked the server to throw away back over the fresh copy.
   */
  const resetDemoData = useCallback(async () => {
    recordsCache.clear();
    await adoptSession(await api.resetDemo());
  }, [adoptSession]);


  const value = useMemo<AppStateValue>(
    () => ({
      hydrated,
      user,
      role,
      patient,
      patients: visiblePatients,
      caregiver,
      accessibility,
      timezone: sessionTimezone,
      viewingTimezone,
      isDemo: snapshot.isDemo,
      activities,
      reminders,
      sessions,
      achievements,
      family,
      careCircle,
      alerts,
      ability,
      insights,
      gameStats,
      recognitionPeople,
      configFor,
      setRole: (nextRole) => setSnapshot((prev) => ({ ...prev, role: nextRole })),
      setUser: (nextUser) => setSnapshot((prev) => ({ ...prev, user: nextUser })),
      completeOnboarding,
      updateAccessibility,
      updatePatient,
      updateCaregiver,
      selectPatient,
      refreshPatients,
      addPatient,
      removePatient,
      resetPatientPassword,
      changeOwnPassword,
      toggleActivity,
      addReminder,
      updateReminder,
      setReminderStatus,
      setReminderEnabled,
      removeReminder,
      addFamilyMember,
      updateFamilyMember,
      removeFamilyMember,
      beginSession,
      finishSession,
      recordSession,
      contactMember,
      acknowledgeAlert,
      adoptSession,
      signOut,
      resetDemoData,
    }),
    [
      hydrated,
      user,
      role,
      patient,
      visiblePatients,
      caregiver,
      accessibility,
      sessionTimezone,
      viewingTimezone,
      snapshot.isDemo,
      activities,
      reminders,
      sessions,
      achievements,
      family,
      careCircle,
      alerts,
      ability,
      insights,
      gameStats,
      recognitionPeople,
      configFor,
      completeOnboarding,
      updateAccessibility,
      updatePatient,
      updateCaregiver,
      selectPatient,
      refreshPatients,
      addPatient,
      removePatient,
      resetPatientPassword,
      changeOwnPassword,
      toggleActivity,
      addReminder,
      updateReminder,
      setReminderStatus,
      setReminderEnabled,
      removeReminder,
      addFamilyMember,
      updateFamilyMember,
      removeFamilyMember,
      beginSession,
      finishSession,
      recordSession,
      contactMember,
      acknowledgeAlert,
      adoptSession,
      signOut,
      resetDemoData,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}

// ------------------------------------------------------------------ helpers

/**
 * Fields the client may never set on a patient. `id`/`userId` are identity and
 * `caregiverId` is ownership — accepting either from a form would let the browser
 * reassign a patient to a different caregiver. The server rejects them too; this
 * is the near half of the same rule. `timezone` is stripped because it travels as
 * its own field, not inside a profile patch.
 */
function stripIdentity(patch: Partial<PatientProfile>): Partial<PatientProfile> {
  const {
    id: _id,
    userId: _userId,
    caregiverId: _caregiverId,
    timezone: _timezone,
    ...rest
  } = patch;
  return rest;
}

/** Same idea for the caregiver: their id and their roster are server-owned. */
function stripCaregiverIdentity(patch: Partial<CaregiverProfile>): Partial<CaregiverProfile> {
  const { id: _id, userId: _userId, patientIds: _patientIds, ...rest } = patch;
  return rest;
}

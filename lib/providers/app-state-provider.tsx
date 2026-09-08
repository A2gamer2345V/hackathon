'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
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
  PatientProfile,
  Reminder,
  SpeechSpeed,
  User,
  UserRole,
} from '@/lib/types';
import { emptyCognitiveRecord, emptyPreferences } from '@/lib/types';
import {
  activityService,
  alertService,
  careCircleService,
  ensureSeeded,
  familyService,
  patientService,
  progressService,
  reminderService,
  sessionService,
  type FamilyDraft,
  type ReminderDraft,
} from '@/lib/services/data';
import { abilityProfile, buildInsights, configureGame } from '@/lib/ai/engine';
import { authService, type AuthSession } from '@/lib/services/auth';
import { clearAll, readValue, removeValue, STORAGE_KEYS, writeValue } from '@/lib/services/storage';
import { demoCaregiverProfile, demoPatientA, DEMO_PATIENT_ID } from '@/lib/data/demo';
import { makeId } from '@/lib/utils';
import { useLanguage } from './language-provider';
import type { LanguageCode } from '@/lib/i18n/languages';

/**
 * Application state: who is signed in, whose data is on screen, and everything
 * that belongs to that person. All persistence goes through lib/services, so this
 * provider stays a thin coordination layer.
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
  completed: boolean;
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
  addPatient: (draft: { name: string } & Partial<PatientProfile>) => PatientProfile;
  removePatient: (patientId: string) => void;

  toggleActivity: (id: string) => void;
  addReminder: (draft: ReminderDraft) => void;
  updateReminder: (id: string, patch: Partial<Omit<Reminder, 'id' | 'patientId'>>) => void;
  setReminderStatus: (id: string, status: Reminder['status']) => void;
  setReminderEnabled: (id: string, enabled: boolean) => void;
  removeReminder: (id: string) => void;

  addFamilyMember: (draft: FamilyDraft) => void;
  updateFamilyMember: (id: string, patch: Partial<Omit<FamilyMember, 'id' | 'patientId'>>) => void;
  removeFamilyMember: (id: string) => void;

  recordSession: (input: SessionInput) => void;
  contactMember: (id: string) => void;
  acknowledgeAlert: (id: string) => void;

  signOut: () => void;
  resetDemoData: () => void;
}

/**
 * Everything the app reads out of storage, held in one module-level snapshot.
 *
 * `null` means "storage has not been read yet" — which is what the server and
 * the first client render both see, so the markup cannot disagree. The snapshot
 * is filled in when the first subscriber attaches, and every mutator publishes a
 * new one. Keeping it outside React is what lets hydration happen without
 * writing state from an effect.
 */
interface Snapshot {
  user: User | null;
  role: UserRole | null;
  patients: PatientProfile[];
  activePatientId: string;
  caregiver: CaregiverProfile;
  activities: DailyActivity[];
  reminders: Reminder[];
  sessions: GameSession[];
  achievements: Achievement[];
  family: FamilyMember[];
  careCircle: CareCircleMember[];
  alerts: CaregiverAlert[];
}

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

/**
 * The lists a screen sees before storage has been read. One shared instance per
 * field, so a pre-hydration render does not produce a new array each time and
 * invalidate everything downstream.
 */
const EMPTY_LISTS = {
  patients: [] as PatientProfile[],
  activities: [] as DailyActivity[],
  reminders: [] as Reminder[],
  sessions: [] as GameSession[],
  achievements: [] as Achievement[],
  family: [] as FamilyMember[],
  careCircle: [] as CareCircleMember[],
  alerts: [] as CaregiverAlert[],
};

const NO_INSIGHTS: AiInsight[] = [];

/** Reads every list belonging to one patient. */
function patientSlice(patientId: string) {
  return {
    activities: activityService.listForDate(patientId),
    reminders: reminderService.list(patientId),
    sessions: sessionService.list(patientId),
    achievements: progressService.achievements(patientId),
    family: familyService.list(patientId),
    careCircle: careCircleService.list(patientId),
    alerts: alertService.list(patientId),
  };
}

function loadSnapshot(): Snapshot {
  ensureSeeded();

  const session = readValue<AuthSession | null>(STORAGE_KEYS.session, null);
  const storedRole = readValue<UserRole | null>(STORAGE_KEYS.role, null);
  const storedCaregiver = readValue<CaregiverProfile | null>(STORAGE_KEYS.caregiverProfile, null);
  const user = session ? authService.getUser(session.userId) ?? null : null;
  const caregiver = storedCaregiver ?? demoCaregiverProfile;
  const patients = patientService.list();

  // Which patient is on screen: a patient session shows their own record, a
  // caregiver session shows whichever of their people they last opened.
  const ownedByUser = user ? patients.find((p) => p.userId === user.id) : null;
  const stored = readValue<string | null>(STORAGE_KEYS.activePatient, null);
  const activePatientId =
    (storedRole === 'patient' ? ownedByUser?.id : null) ??
    (stored && patients.some((p) => p.id === stored) ? stored : null) ??
    caregiver.patientIds[0] ??
    patients[0]?.id ??
    DEMO_PATIENT_ID;

  return {
    user,
    role: storedRole ?? null,
    patients,
    activePatientId,
    caregiver,
    ...patientSlice(activePatientId),
  };
}

/** For mutators, which may in principle run before the first subscription. */
function ensureSnapshot(): Snapshot {
  snapshot ??= loadSnapshot();
  return snapshot;
}

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function patchSnapshot(patch: Partial<Snapshot>) {
  publish({ ...ensureSnapshot(), ...patch });
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (snapshot === null) {
    snapshot = loadSnapshot();
    onStoreChange();
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = (): Snapshot | null => null;

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const hydrated = store !== null;
  const user = store?.user ?? null;
  const role = store?.role ?? null;
  const caregiver = store?.caregiver ?? null;

  const patients = store?.patients ?? EMPTY_LISTS.patients;
  const activePatientId = store?.activePatientId ?? DEMO_PATIENT_ID;
  const patient = store ? patients.find((p) => p.id === activePatientId) ?? null : null;

  // Empty lists before hydration, so a screen renders its loading state rather
  // than an empty one.
  const activities = store?.activities ?? EMPTY_LISTS.activities;
  const reminders = store?.reminders ?? EMPTY_LISTS.reminders;
  const sessions = store?.sessions ?? EMPTY_LISTS.sessions;
  const achievements = store?.achievements ?? EMPTY_LISTS.achievements;
  const family = store?.family ?? EMPTY_LISTS.family;
  const careCircle = store?.careCircle ?? EMPTY_LISTS.careCircle;
  const alerts = store?.alerts ?? EMPTY_LISTS.alerts;

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

  const persistCaregiver = useCallback((next: CaregiverProfile) => {
    writeValue(STORAGE_KEYS.caregiverProfile, next);
    patchSnapshot({ caregiver: next });
  }, []);

  const setRole = useCallback((next: UserRole) => {
    writeValue(STORAGE_KEYS.role, next);
    patchSnapshot({ role: next });
  }, []);

  const setUser = useCallback((next: User | null) => {
    // Signing in changes whose data belongs on screen, so the snapshot is
    // rebuilt from storage rather than patched field by field. The auth service
    // has already written the session by this point.
    publish({ ...loadSnapshot(), user: next });
  }, []);

  const updatePatient = useCallback((patch: Partial<PatientProfile>) => {
    const current = ensureSnapshot();
    patchSnapshot({ patients: patientService.update(current.activePatientId, patch) });
  }, []);

  const updateAccessibility = useCallback((patch: Partial<AccessibilityPreferences>) => {
    const current = ensureSnapshot();
    const target = current.patients.find((p) => p.id === current.activePatientId);
    if (!target) return;
    patchSnapshot({
      patients: patientService.update(target.id, {
        accessibility: { ...target.accessibility, ...patch },
      }),
    });
  }, []);

  const updateCaregiver = useCallback(
    (patch: Partial<CaregiverProfile>) => {
      persistCaregiver({ ...ensureSnapshot().caregiver, ...patch });
    },
    [persistCaregiver],
  );

  const selectPatient = useCallback((patientId: string) => {
    const current = ensureSnapshot();
    if (!current.patients.some((p) => p.id === patientId)) return;
    writeValue(STORAGE_KEYS.activePatient, patientId);
    patchSnapshot({ activePatientId: patientId, ...patientSlice(patientId) });
  }, []);

  const addPatient = useCallback<AppStateValue['addPatient']>((draft) => {
    const current = ensureSnapshot();
    const name = draft.name.trim();
    const profile: PatientProfile = {
      id: makeId('patient'),
      userId: null,
      photo: null,
      avatarSeed: name.toLowerCase() || 'patient',
      language: draft.language ?? current.caregiver.language,
      speechSpeed: 'normal',
      preferredActivities: [],
      accessibility: { ...DEFAULT_ACCESSIBILITY, textScale: 'large' },
      cognitive: emptyCognitiveRecord(),
      preferences: emptyPreferences(),
      createdAt: new Date().toISOString(),
      // Anything the caller supplied wins over the defaults above, except the
      // name, which is always the trimmed one.
      ...draft,
      name,
    };
    const patientsNext = patientService.save(profile);
    const caregiverNext: CaregiverProfile = {
      ...current.caregiver,
      patientIds: [...current.caregiver.patientIds, profile.id],
    };
    writeValue(STORAGE_KEYS.caregiverProfile, caregiverNext);
    writeValue(STORAGE_KEYS.activePatient, profile.id);
    patchSnapshot({
      patients: patientsNext,
      caregiver: caregiverNext,
      activePatientId: profile.id,
      ...patientSlice(profile.id),
    });
    return profile;
  }, []);

  const removePatient = useCallback((patientId: string) => {
    const current = ensureSnapshot();
    const patientsNext = patientService.remove(patientId);
    const caregiverNext: CaregiverProfile = {
      ...current.caregiver,
      patientIds: current.caregiver.patientIds.filter((id) => id !== patientId),
    };
    writeValue(STORAGE_KEYS.caregiverProfile, caregiverNext);
    const nextActive = caregiverNext.patientIds[0] ?? patientsNext[0]?.id ?? DEMO_PATIENT_ID;
    writeValue(STORAGE_KEYS.activePatient, nextActive);
    patchSnapshot({
      patients: patientsNext,
      caregiver: caregiverNext,
      activePatientId: nextActive,
      ...patientSlice(nextActive),
    });
  }, []);

  const completeOnboarding = useCallback<AppStateValue['completeOnboarding']>(
    (patch) => {
      if (patch.language) setLanguage(patch.language);
      const chosenLanguage = patch.language ?? language;
      const current = ensureSnapshot();

      if (current.role === 'caregiver') {
        persistCaregiver({
          ...current.caregiver,
          name: patch.name,
          relationToPatient: patch.relationToPatient ?? 'Family',
          language: chosenLanguage,
        });
      } else {
        const base = current.patients.find((p) => p.id === current.activePatientId);
        if (base) {
          patchSnapshot({
            patients: patientService.update(base.id, {
              name: patch.name,
              age: patch.age ?? base.age,
              language: chosenLanguage,
              speechSpeed: patch.speechSpeed ?? base.speechSpeed,
              caregiverRelation: patch.caregiverRelation ?? base.caregiverRelation,
              preferredActivities: patch.preferredActivities ?? base.preferredActivities,
              accessibility: { ...base.accessibility, ...(patch.accessibility ?? {}) },
            }),
          });
        }
      }

      const signedIn = current.user;
      if (signedIn) {
        const updated = authService.updateUser(signedIn.id, {
          onboarded: true,
          displayName: patch.name,
        });
        if (updated) patchSnapshot({ user: updated });
      }
    },
    [language, persistCaregiver, setLanguage],
  );

  const toggleActivity = useCallback((id: string) => {
    const current = ensureSnapshot();
    const target = current.activities.find((a) => a.id === id);
    if (!target) return;
    patchSnapshot({
      activities: activityService.setCompleted(id, !target.completed, current.activePatientId),
    });
  }, []);

  const addReminder = useCallback((draft: ReminderDraft) => {
    const current = ensureSnapshot();
    patchSnapshot({
      reminders: reminderService.add(
        current.activePatientId,
        draft,
        current.role ?? 'patient',
      ),
    });
  }, []);

  const updateReminder = useCallback<AppStateValue['updateReminder']>((id, patch) => {
    const current = ensureSnapshot();
    patchSnapshot({ reminders: reminderService.update(id, patch, current.role ?? 'patient') });
  }, []);

  const setReminderStatus = useCallback<AppStateValue['setReminderStatus']>((id, status) => {
    const current = ensureSnapshot();
    patchSnapshot({ reminders: reminderService.setStatus(id, status, current.role ?? 'patient') });
  }, []);

  const setReminderEnabled = useCallback((id: string, enabled: boolean) => {
    const current = ensureSnapshot();
    patchSnapshot({ reminders: reminderService.setEnabled(id, enabled, current.role ?? 'patient') });
  }, []);

  const removeReminder = useCallback((id: string) => {
    patchSnapshot({ reminders: reminderService.remove(id) });
  }, []);

  const addFamilyMember = useCallback((draft: FamilyDraft) => {
    const current = ensureSnapshot();
    patchSnapshot({ family: familyService.add(current.activePatientId, draft) });
  }, []);

  const updateFamilyMember = useCallback<AppStateValue['updateFamilyMember']>((id, patch) => {
    patchSnapshot({ family: familyService.update(id, patch) });
  }, []);

  const removeFamilyMember = useCallback((id: string) => {
    patchSnapshot({ family: familyService.remove(id) });
  }, []);

  const recordSession = useCallback((input: SessionInput) => {
    const current = ensureSnapshot();
    const next = sessionService.record({ ...input, patientId: current.activePatientId });
    // Playing an activity can tick off the matching item in today's plan, so the
    // plan is re-read rather than assumed unchanged.
    patchSnapshot({
      sessions: next,
      activities: activityService.listForDate(current.activePatientId),
      achievements: progressService.achievements(current.activePatientId),
    });
  }, []);

  const contactMember = useCallback((id: string) => {
    const current = ensureSnapshot();
    patchSnapshot({ careCircle: careCircleService.markContacted(id, current.activePatientId) });
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    const current = ensureSnapshot();
    alertService.acknowledge(id);
    patchSnapshot({ alerts: alertService.list(current.activePatientId) });
  }, []);

  const signOut = useCallback(() => {
    authService.signOut();
    removeValue(STORAGE_KEYS.role);
    patchSnapshot({ user: null, role: null });
  }, []);

  const resetDemoData = useCallback(() => {
    clearAll();
    publish(loadSnapshot());
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      hydrated,
      user,
      role,
      patient,
      patients: visiblePatients,
      caregiver,
      accessibility,
      activities,
      reminders,
      sessions,
      achievements,
      family,
      careCircle,
      alerts,
      ability,
      insights,
      recognitionPeople,
      configFor,
      setRole,
      setUser,
      completeOnboarding,
      updateAccessibility,
      updatePatient,
      updateCaregiver,
      selectPatient,
      addPatient,
      removePatient,
      toggleActivity,
      addReminder,
      updateReminder,
      setReminderStatus,
      setReminderEnabled,
      removeReminder,
      addFamilyMember,
      updateFamilyMember,
      removeFamilyMember,
      recordSession,
      contactMember,
      acknowledgeAlert,
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
      activities,
      reminders,
      sessions,
      achievements,
      family,
      careCircle,
      alerts,
      ability,
      insights,
      recognitionPeople,
      configFor,
      setRole,
      setUser,
      completeOnboarding,
      updateAccessibility,
      updatePatient,
      updateCaregiver,
      selectPatient,
      addPatient,
      removePatient,
      toggleActivity,
      addReminder,
      updateReminder,
      setReminderStatus,
      setReminderEnabled,
      removeReminder,
      addFamilyMember,
      updateFamilyMember,
      removeFamilyMember,
      recordSession,
      contactMember,
      acknowledgeAlert,
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

/** The demo patient record, used as the shape a fresh profile starts from. */
export const FALLBACK_PATIENT = demoPatientA;

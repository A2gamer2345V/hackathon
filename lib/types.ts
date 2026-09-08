import type { LanguageCode } from '@/lib/i18n/languages';
import type { TranslationKey } from '@/lib/i18n/locales/en';

// ---------------------------------------------------------------- identity

export type UserRole = 'patient' | 'caregiver';

export interface User {
  id: string;
  /** Email address or phone number used to sign in. */
  identifier: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  /** False until first-time profile setup has been completed. */
  onboarded: boolean;
}

export type SpeechSpeed = 'slow' | 'normal' | 'fast';
export type TextScale = 'normal' | 'large' | 'xlarge';

export interface AccessibilityPreferences {
  textScale: TextScale;
  highContrast: boolean;
  reducedMotion: boolean;
  voiceGuidance: boolean;
  notifications: boolean;
  offlineMode: boolean;
}

export interface VoicePreference {
  language: LanguageCode;
  speechSpeed: SpeechSpeed;
  /** Companion speaks aloud when true and voice guidance is on. */
  spokenResponses: boolean;
}

// ------------------------------------------------- cognitive record (caregiver)

/**
 * Where the caregiver — or a clinician who assessed the person — says things
 * stand. The app never derives or overwrites this: it is reference information
 * the adaptive engine may lean on, not a conclusion the software reached.
 */
export type CognitiveStage = 'not-recorded' | 'no-concern' | 'early' | 'moderate' | 'advanced';

export interface CognitiveRecord {
  stage: CognitiveStage;
  /** Local date `YYYY-MM-DD` of the assessment this stage came from. */
  assessedOn?: string;
  /** Who assessed — a clinic, a doctor, "family observation". Free text. */
  assessedBy?: string;
  /** Short caregiver-written tags, e.g. "remembering names", "time of day". */
  difficultyAreas: string[];
  strengthAreas: string[];
  /** Recent caregiver observations, in their own words. */
  observations: string;
}

export function emptyCognitiveRecord(): CognitiveRecord {
  return {
    stage: 'not-recorded',
    difficultyAreas: [],
    strengthAreas: [],
    observations: '',
  };
}

// ------------------------------------------------------- patient preferences

/**
 * What the person actually likes. Used to theme activities — a cricket follower
 * gets cricket imagery, someone who loves flowers gets flowers — so the
 * exercises feel like theirs rather than generic.
 */
export type InterestTag =
  | 'cricket'
  | 'football'
  | 'gardening'
  | 'flowers'
  | 'birds'
  | 'cats'
  | 'dogs'
  | 'cooking'
  | 'tea'
  | 'music'
  | 'singing'
  | 'radio'
  | 'films'
  | 'reading'
  | 'temple'
  | 'travel'
  | 'fishing'
  | 'knitting'
  | 'painting'
  | 'family';

/** The same tags as a list, for the caregiver's tick boxes. Order is display order. */
export const INTEREST_TAGS: InterestTag[] = [
  'cricket',
  'football',
  'gardening',
  'flowers',
  'birds',
  'cats',
  'dogs',
  'cooking',
  'tea',
  'music',
  'singing',
  'radio',
  'films',
  'reading',
  'temple',
  'travel',
  'fishing',
  'knitting',
  'painting',
  'family',
];

export interface PatientPreferences {
  /** Chips the caregiver ticks. Machine-readable, so activities can theme on them. */
  interests: InterestTag[];
  favouriteColours: string[];
  favouriteFoods: string[];
  favouriteMusic: string[];
  favouritePlaces: string[];
  favouriteFilms: string[];
  /** People, in their own words: "my brother Sunil", "Mrs Das next door". */
  favouritePeople: string[];
  /** Topics that reliably start a good conversation. */
  conversationTopics: string[];
  childhoodMemories: string;
  /** Things to steer clear of. Respected before any theming preference. */
  dislikes: string[];
}

export function emptyPreferences(): PatientPreferences {
  return {
    interests: [],
    favouriteColours: [],
    favouriteFoods: [],
    favouriteMusic: [],
    favouritePlaces: [],
    favouriteFilms: [],
    favouritePeople: [],
    conversationTopics: [],
    childhoodMemories: '',
    dislikes: [],
  };
}

// ---------------------------------------------------------------- profiles

export interface PatientProfile {
  id: string;
  /** Null when a caregiver added this person without giving them a login. */
  userId: string | null;
  name: string;
  age?: number;
  /** Data URL of a caregiver-supplied photo. Null falls back to initials. */
  photo: string | null;
  avatarSeed: string;
  language: LanguageCode;
  speechSpeed: SpeechSpeed;
  contactPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  /** Caregiver notes: routines, what settles them, anything a stand-in should know. */
  notes?: string;
  /** Free-form relationship label of the person who helps most. */
  caregiverRelation?: string;
  preferredActivities: GameId[];
  accessibility: AccessibilityPreferences;
  cognitive: CognitiveRecord;
  preferences: PatientPreferences;
  createdAt: string;
}

export interface CaregiverProfile {
  id: string;
  userId: string;
  name: string;
  relationToPatient: string;
  photo: string | null;
  avatarSeed: string;
  language: LanguageCode;
  contactPhone?: string;
  /** Every patient this caregiver looks after. Data is kept strictly separate. */
  patientIds: string[];
}

// ------------------------------------------------------------------ games

/**
 * The four domains the adaptive engine reasons about. A game belongs to exactly
 * one, so a game's sessions feed exactly one ability estimate.
 */
export type GameCategory = 'memory' | 'recognition' | 'problem-solving' | 'attention';

/** Same four buckets, named for how the AI layer talks about them. */
export type CognitiveDomain = GameCategory;

export const COGNITIVE_DOMAINS: CognitiveDomain[] = [
  'memory',
  'recognition',
  'problem-solving',
  'attention',
];

export type GameId =
  | 'memory-match'
  | 'face-names'
  | 'sudoku'
  | 'picture-recall'
  | 'word-recall'
  | 'number-tap'
  | 'sequence';

/** One scale everywhere: what the engine sets, stores and shows the caregiver. */
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_ORDER: DifficultyLevel[] = ['easy', 'medium', 'hard'];

export interface Game {
  id: GameId;
  category: GameCategory;
  /** Translation keys — never pre-translated strings, so language can change. */
  nameKey: `game.${GameId}.name`;
  descriptionKey: `game.${GameId}.desc`;
  howToKey: `game.${GameId}.how`;
  /** Where a brand-new player starts, before any session data exists. */
  baseDifficulty: DifficultyLevel;
  estimatedMinutes: number;
  /** Named accent used by the card illustration. */
  accent: 'sage' | 'clay' | 'sky' | 'sun' | 'lilac' | 'rose';
  /** True when the activity needs caregiver-entered people to work at all. */
  needsFamilyData?: boolean;
}

/**
 * One completed (or abandoned) run of an activity.
 *
 * Everything the adaptive engine needs is recorded here, at source, rather than
 * being re-derived later from a score alone.
 */
export interface GameSession {
  id: string;
  patientId: string;
  gameId: GameId;
  difficulty: DifficultyLevel;
  correct: number;
  total: number;
  /** 0–1. Stored rather than derived, so an abandoned run stays honest at 0/0. */
  accuracy: number;
  mistakes: number;
  hintsUsed: number;
  durationSeconds: number;
  /** Mean seconds per answer; null when nothing was answered. */
  averageResponseSeconds: number | null;
  /** False when the person chose "finish for now" partway through. */
  completed: boolean;
  /** ISO timestamp of completion. */
  completedAt: string;
}

// -------------------------------------------------------- adaptive AI layer

export type PerformanceTrend = 'improving' | 'steady' | 'declining' | 'not-enough-data';

/** How much the person seems to be taking on right now, across all activities. */
export type CognitiveLoad = 'light' | 'moderate' | 'heavy';

export interface DomainAbility {
  domain: CognitiveDomain;
  /** The level activities in this domain are currently set to. */
  level: DifficultyLevel;
  /** Where the engine wants to move next. Equal to `level` when holding. */
  suggestedLevel: DifficultyLevel;
  trend: PerformanceTrend;
  /** 0–1, based on how many recent sessions back the estimate. */
  confidence: number;
  sessions: number;
  /** 0–1 mean accuracy over the window the estimate is drawn from. */
  accuracy: number;
}

/**
 * What the engine tells a game to do. Each activity reads only the knobs it
 * understands and ignores the rest, so adding a game needs no engine change.
 */
export interface GameConfig {
  gameId: GameId;
  difficulty: DifficultyLevel;
  /** Rounds/questions to ask. */
  rounds: number;
  /** Answer choices to offer, where the activity has choices. */
  choices: number;
  /** Pairs to lay out, for matching activities. */
  pairs: number;
  /** How alike the wrong answers are to the right one. */
  distractorSimilarity: 'low' | 'medium' | 'high';
  /** Hints available. 0 means the hint button is hidden. */
  hintsAllowed: number;
  /** Almost always null: timers frighten people. Set only when it helps. */
  timeLimitSeconds: number | null;
  /** Why the engine chose this. Keys so the "why" can be translated. */
  rationale: AdaptationReason[];
}

export type AdaptationReason =
  | 'first-time'
  | 'high-accuracy'
  | 'low-accuracy'
  | 'quick-answers'
  | 'slower-answers'
  | 'many-hints'
  | 'no-hints-needed'
  | 'returning-after-break'
  | 'holding-steady'
  | 'caregiver-stage'
  | 'few-people-added';

export interface AbilityProfile {
  patientId: string;
  generatedAt: string;
  domains: DomainAbility[];
  load: CognitiveLoad;
  /** Total sessions the profile is drawn from. */
  sessions: number;
}

// ------------------------------------------------------------- AI insights

/**
 * A caregiver-facing observation drawn from app data.
 *
 * Both the sentence and its evidence are translation keys with parameters, so
 * an insight reads naturally in every language and no copy lives in components.
 * Insights describe activity in ElderEase. They are not clinical findings.
 */
export interface AiInsight {
  id: string;
  patientId: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  /** Fills the placeholders in both keys. */
  params: Record<string, string | number>;
  /** What the engine suggests doing about it, when it suggests anything. */
  recommendationKey?: TranslationKey;
  /** Why the engine said this — the numbers behind the sentence. */
  evidenceKey: TranslationKey;
  /** Days of data the insight was drawn from. */
  periodDays: number;
  severity: 'info' | 'attention';
  createdAt: string;
}

// ------------------------------------------------------------- daily plan

export type DayPart = 'morning' | 'afternoon' | 'evening';

export type ActivityKind =
  | 'walk'
  | 'meal'
  | 'medicine'
  | 'appointment'
  | 'hydration'
  | 'cognitive'
  | 'rest'
  | 'social';

export interface DailyActivity {
  id: string;
  patientId: string;
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  title: string;
  /** Optional translation key; when present it wins over `title`. */
  titleKey?: TranslationKey;
  kind: ActivityKind;
  dayPart: DayPart;
  /** 24-hour `HH:mm`. */
  time: string;
  completed: boolean;
  completedAt?: string;
  /** Set when this activity is a shortcut into a game. */
  linkedGameId?: GameId;
}

// --------------------------------------------------------------- reminders

export type ReminderType = 'medicine' | 'appointment' | 'water' | 'activity';
export type ReminderStatus = 'pending' | 'completed' | 'missed' | 'dismissed';
export type ReminderRepeat = 'once' | 'daily' | 'weekdays' | 'weekly';

export interface Reminder {
  id: string;
  patientId: string;
  title: string;
  type: ReminderType;
  /** 24-hour `HH:mm`. */
  time: string;
  /** Local date `YYYY-MM-DD`, used when `repeat` is `once`. */
  date?: string;
  /** 0 = Sunday … 6 = Saturday, used when `repeat` is `weekly`. */
  weekdays?: number[];
  note?: string;
  status: ReminderStatus;
  completedAt?: string;
  repeat: ReminderRepeat;
  /** Off keeps the reminder without alerting anyone. */
  enabled: boolean;
  /** Which side of the pair last touched it, so both screens can show that. */
  updatedBy: UserRole;
  updatedAt: string;
}

// ---------------------------------------------------------- recommendation

export interface Recommendation {
  id: string;
  gameId: GameId;
  /** Short machine-readable reason so the copy can be translated. */
  reason: RecommendationReason;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  /** 0–1 internal ranking score. Never shown as a medical number. */
  score: number;
}

export type RecommendationReason =
  | 'recent-favourite'
  | 'not-tried-recently'
  | 'builds-on-strength'
  | 'gentle-restart'
  | 'variety';

// ---------------------------------------------------------------- progress

export interface ProgressRecord {
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  activitiesCompleted: number;
  gamesPlayed: number;
  /** 0–1 share of reminders completed that day. */
  reminderAdherence: number;
  /** 0–1 average accuracy across games played that day. */
  averageAccuracy: number;
}

export interface Achievement {
  id: string;
  patientId: string;
  title: string;
  description: string;
  /** Optional translation keys; when present they win over the plain strings. */
  titleKey?: TranslationKey;
  descriptionKey?: TranslationKey;
  icon: 'star' | 'sunrise' | 'heart' | 'sparkles' | 'trophy';
  unlockedAt?: string;
}

/** Per-game rollup shown on the caregiver's performance screen. */
export interface GameStats {
  gameId: GameId;
  sessions: number;
  /** 0–1 mean accuracy. */
  accuracy: number;
  /** 0–1 best single session. */
  bestAccuracy: number;
  averageDurationSeconds: number;
  averageResponseSeconds: number | null;
  totalMistakes: number;
  totalHints: number;
  currentDifficulty: DifficultyLevel;
  trend: PerformanceTrend;
  lastPlayedAt?: string;
}

// -------------------------------------------------- family & recognition

export type Relationship =
  | 'wife'
  | 'husband'
  | 'son'
  | 'daughter'
  | 'brother'
  | 'sister'
  | 'mother'
  | 'father'
  | 'grandson'
  | 'granddaughter'
  | 'friend'
  | 'neighbour'
  | 'carer'
  | 'other';

/**
 * One person in the patient's world.
 *
 * The same records draw the family tree and supply the Face & Name activity, so
 * a caregiver enters each person once. Photos are stored as data URLs: local
 * only, no remote image ever.
 */
export interface FamilyMember {
  id: string;
  patientId: string;
  name: string;
  relationship: Relationship;
  /** Free text when `relationship` is `other`. */
  relationshipLabel?: string;
  photo: string | null;
  /** Anything worth remembering: "lives in Guwahati", "visits on Sundays". */
  notes?: string;
  /** Included in the Face & Name activity when true. */
  inRecognitionGame: boolean;
  createdAt: string;
}

// ------------------------------------------------------------- care circle

export type CareCircleRole = 'primary-caregiver' | 'family' | 'health-support';
export type ConnectionStatus = 'connected' | 'pending';

export interface CareCircleMember {
  id: string;
  /** Whose circle this is. Circles are never shared between patients. */
  patientId: string;
  name: string;
  relation: string;
  role: CareCircleRole;
  phone?: string;
  avatarSeed: string;
  status: ConnectionStatus;
  lastContactedAt?: string;
}

// ----------------------------------------------------------------- alerts

export type CaregiverAlertKind = 'activity-change' | 'missed-medicine' | 'low-activity';
export type AlertSeverity = 'info' | 'attention';

export interface CaregiverAlert {
  id: string;
  /** Which patient this is about. A caregiver with several patients needs this. */
  patientId: string;
  kind: CaregiverAlertKind;
  severity: AlertSeverity;
  /** Plain observation of app usage — never a clinical statement. */
  detail: string;
  createdAt: string;
  acknowledged: boolean;
}

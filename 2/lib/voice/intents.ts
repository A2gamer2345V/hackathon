/**
 * The controlled intent layer.
 *
 * Voice and typed commands both resolve to one of these fixed intents. Nothing
 * upstream — not a browser recogniser and not a future language model — can put
 * anything else into the application: unrecognised input becomes `UNKNOWN` and
 * the companion asks again. Routing and state changes are driven from this
 * enum only, never from raw transcript text.
 */

export const INTENTS = [
  'OPEN_HOME',
  'OPEN_GAMES',
  'OPEN_MEMORY_GAMES',
  'OPEN_ATTENTION_GAMES',
  'OPEN_MY_DAY',
  'OPEN_REMINDERS',
  'OPEN_PROGRESS',
  'OPEN_PLANNER',
  'OPEN_SETTINGS',
  'OPEN_CARE_CIRCLE',
  'NEXT_REMINDER',
  'START_RECOMMENDED',
  'GO_BACK',
  'HELP',
  'REPEAT',
  'SLOWER_SPEECH',
  'FASTER_SPEECH',
  'LARGER_TEXT',
  'HIGH_CONTRAST',
  'STOP_SPEAKING',
  'UNKNOWN',
] as const;

export type Intent = (typeof INTENTS)[number];

/** Where an intent navigates to, when it navigates at all. */
export const INTENT_ROUTES: Partial<Record<Intent, string>> = {
  OPEN_HOME: '/app',
  OPEN_GAMES: '/app/games',
  OPEN_MEMORY_GAMES: '/app/games?category=memory',
  OPEN_ATTENTION_GAMES: '/app/games?category=attention',
  OPEN_MY_DAY: '/app/my-day',
  OPEN_REMINDERS: '/app/reminders',
  OPEN_PROGRESS: '/app/progress',
  OPEN_PLANNER: '/app/planner',
  OPEN_SETTINGS: '/app/settings',
  OPEN_CARE_CIRCLE: '/app/care-circle',
};

/**
 * The element the companion highlights when it performs an intent, so the user
 * can learn where the button was. Matched against `data-companion-target`.
 */
export const INTENT_HIGHLIGHTS: Partial<Record<Intent, string>> = {
  OPEN_GAMES: 'nav-games',
  OPEN_MEMORY_GAMES: 'nav-games',
  OPEN_ATTENTION_GAMES: 'nav-games',
  OPEN_MY_DAY: 'nav-my-day',
  OPEN_REMINDERS: 'nav-reminders',
  OPEN_HOME: 'nav-home',
  OPEN_PROGRESS: 'nav-more',
  OPEN_SETTINGS: 'nav-more',
  OPEN_PLANNER: 'nav-more',
  OPEN_CARE_CIRCLE: 'nav-more',
};

export function isIntent(value: unknown): value is Intent {
  return typeof value === 'string' && (INTENTS as readonly string[]).includes(value);
}

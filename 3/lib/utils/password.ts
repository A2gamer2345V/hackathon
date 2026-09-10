/**
 * Password help for the caregiver.
 *
 * Two jobs, both client-side and neither security-critical: suggest something
 * reasonable when a caregiver has to invent a password for someone else, and give
 * a form the same verdict the server will reach so the user hears about a weak
 * password before a round trip. The server checks again and its answer is the one
 * that counts — see `lib/server/password.ts`.
 */

/** Word list chosen for readability aloud: no lookalikes, no awkward spellings. */
const WORDS = [
  'garden',
  'mango',
  'river',
  'lantern',
  'jasmine',
  'copper',
  'monsoon',
  'tiger',
  'meadow',
  'saffron',
  'harbour',
  'almond',
  'willow',
  'cinnamon',
  'peacock',
  'marigold',
  'temple',
  'orchard',
  'bamboo',
  'sunrise',
];

/**
 * A password a caregiver can read down the phone and a patient can type.
 *
 * Two words and two digits, hyphenated. Long enough to pass the strength rules,
 * and far easier to pass on than a random string — which matters because someone
 * else has to receive this and type it on a first try.
 */
export function suggestPassword(): string {
  const pick = () => WORDS[randomInt(WORDS.length)];
  let first = pick();
  let second = pick();
  while (second === first) second = pick();
  return `${first}-${second}-${10 + randomInt(90)}`;
}

/** Uniform in `[0, max)`, from the platform CSPRNG where there is one. */
function randomInt(max: number): number {
  const crypto = globalThis.crypto;
  if (crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/** Mirrors the server's minimum. Kept as one constant so they cannot drift apart. */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordVerdict = 'ok' | 'too-short' | 'too-common';

/** The handful of passwords that get typed regardless of any rule. */
const COMMON = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyui',
  'iloveyou',
  'letmein1',
  'welcome1',
  'admin123',
  'elderease',
]);

/**
 * The same verdict the server reaches, so a form can say what is wrong without a
 * round trip. Advisory only: this never decides whether a password is accepted.
 */
export function checkPassword(password: string): PasswordVerdict {
  if (password.length < MIN_PASSWORD_LENGTH) return 'too-short';
  if (COMMON.has(password.toLowerCase())) return 'too-common';
  return 'ok';
}

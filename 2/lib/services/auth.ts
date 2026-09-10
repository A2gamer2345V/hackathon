import type { User, UserRole } from '@/lib/types';
import { makeId } from '@/lib/utils';
import { readValue, removeValue, STORAGE_KEYS, writeValue } from './storage';

/**
 * Prototype authentication.
 *
 * This is deliberately NOT secure and is not pretending to be: accounts live in
 * this browser's localStorage, passwords are never stored at all, and any
 * password of sufficient length is accepted. It exists so the flow (sign up →
 * profile setup → dashboard, and returning-user sign in) can be demonstrated
 * end-to-end. Replacing `authService` with real API calls is the only change
 * needed on the UI side.
 */

export interface AuthSession {
  userId: string;
  role: UserRole;
  startedAt: string;
}

export interface Credentials {
  identifier: string;
  password: string;
}

export type AuthErrorCode = 'invalid-identifier' | 'invalid-password' | 'no-account' | 'exists';

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

const MIN_PASSWORD_LENGTH = 4;

function normalise(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function loadUsers(): User[] {
  return readValue<User[]>(STORAGE_KEYS.users, []);
}

function saveUsers(users: User[]): void {
  writeValue(STORAGE_KEYS.users, users);
}

function validate({ identifier, password }: Credentials): void {
  if (normalise(identifier).length < 3) throw new AuthError('invalid-identifier');
  if (password.trim().length < MIN_PASSWORD_LENGTH) throw new AuthError('invalid-password');
}

/** Simulated latency so loading states are exercised in the prototype. */
function delay<T>(value: T, ms = 380): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * The two demo accounts, with fixed ids so they line up with the seeded profiles.
 * Already "onboarded", because a demo should land on the dashboard rather than in
 * a setup form.
 */
export const DEMO_ACCOUNTS: Record<UserRole, User> = {
  patient: {
    id: 'user_ravi',
    identifier: 'ravi@demo.elderease',
    displayName: 'Ravi Sharma',
    role: 'patient',
    createdAt: '2026-06-01T09:00:00.000Z',
    onboarded: true,
  },
  caregiver: {
    id: 'user_meera',
    identifier: 'meera@demo.elderease',
    displayName: 'Meera Sharma',
    role: 'caregiver',
    createdAt: '2026-06-01T09:00:00.000Z',
    onboarded: true,
  },
};

export const authService = {
  getSession(): AuthSession | null {
    return readValue<AuthSession | null>(STORAGE_KEYS.session, null);
  },

  getUser(userId: string): User | null {
    return loadUsers().find((u) => u.id === userId) ?? null;
  },

  async signIn(credentials: Credentials, role: UserRole): Promise<User> {
    validate(credentials);
    const users = loadUsers();
    const id = normalise(credentials.identifier);
    let user = users.find((u) => normalise(u.identifier) === id && u.role === role);

    if (!user) {
      // A demo build should never dead-end someone at "no such account".
      // We create the account on first sign-in, and the UI says so plainly.
      user = {
        id: makeId('user'),
        identifier: credentials.identifier.trim(),
        displayName: '',
        role,
        createdAt: new Date().toISOString(),
        onboarded: false,
      };
      saveUsers([...users, user]);
    }

    writeValue<AuthSession>(STORAGE_KEYS.session, {
      userId: user.id,
      role: user.role,
      startedAt: new Date().toISOString(),
    });
    return delay(user);
  },

  async signUp(credentials: Credentials, role: UserRole, displayName: string): Promise<User> {
    validate(credentials);
    const users = loadUsers();
    const id = normalise(credentials.identifier);
    if (users.some((u) => normalise(u.identifier) === id && u.role === role)) {
      throw new AuthError('exists');
    }
    const user: User = {
      id: makeId('user'),
      identifier: credentials.identifier.trim(),
      displayName: displayName.trim(),
      role,
      createdAt: new Date().toISOString(),
      onboarded: false,
    };
    saveUsers([...users, user]);
    writeValue<AuthSession>(STORAGE_KEYS.session, {
      userId: user.id,
      role: user.role,
      startedAt: new Date().toISOString(),
    });
    return delay(user);
  },

  updateUser(userId: string, patch: Partial<Omit<User, 'id'>>): User | null {
    const users = loadUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return null;
    const updated = { ...users[index], ...patch };
    users[index] = updated;
    saveUsers(users);
    return updated;
  },

  /**
   * Signs straight in as one of the two built-in demo accounts.
   *
   * No form, no password, no second click: pressing "Demo as Patient" is the
   * whole interaction. The fixed ids are what tie these accounts to the seeded
   * profiles — `user_ravi` owns the demo patient record and `user_meera` owns the
   * caregiver record that looks after both demo patients.
   */
  async signInDemo(role: UserRole): Promise<User> {
    const template = DEMO_ACCOUNTS[role];
    const users = loadUsers();
    const existing = users.find((u) => u.id === template.id);
    const user = existing ?? template;
    if (!existing) saveUsers([...users, user]);

    writeValue<AuthSession>(STORAGE_KEYS.session, {
      userId: user.id,
      role: user.role,
      startedAt: new Date().toISOString(),
    });
    return delay(user, 120);
  },

  signOut(): void {
    removeValue(STORAGE_KEYS.session);
  },
};

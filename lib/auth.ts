export type UserRole = "student" | "educator" | "explorer";

export interface AuthUser {
  username?: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  avatarColor: string;
  isGuest?: boolean;
}

interface StoredAccount {
  username: string;
  name: string;
  role: UserRole;
  salt: string;
  hash: string;
  createdAt: string;
  avatarColor: string;
}

export interface SignUpInput {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface SignInInput {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface ProfileUpdateInput {
  name?: string;
  role?: UserRole;
  avatarColor?: string;
}

const ACCOUNTS_KEY = "cosmic-detective-accounts-v1";
const SESSION_KEY = "cosmic-detective-session-v1";
const LEGACY_TRAINING_KEY = "cosmic-detective-training-progress-v1";

export const PASTEL_AVATAR_COLORS = [
  "#C3B1E1", // lavender
  "#FFB5A7", // peach
  "#B5EAD7", // mint
  "#A2D2FF", // sky
  "#FFC8DD", // pink
] as const;

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }
}

function readAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage errors
  }
}

function saveSession(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      window.localStorage.removeItem(SESSION_KEY);
    } else {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
  } catch {
    // Ignore storage errors
  }
  notifyAuthChange();
}

function generateSaltHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hashes salt + password using Web Crypto SHA-256.
 * Never stores plain-text passwords.
 */
async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}`;
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input);
    const buffer = await window.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Deterministic fallback if subtle crypto is unavailable in a non-HTTPS test context
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

function pickAvatarColor(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) {
    sum = (sum + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return PASTEL_AVATAR_COLORS[sum % PASTEL_AVATAR_COLORS.length];
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed.name !== "string" || typeof parsed.role !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isUsernameTaken(username: string): boolean {
  const clean = username.trim().toLowerCase();
  if (!clean) return false;
  const accounts = readAccounts();
  return accounts.some((acc) => acc.username.toLowerCase() === clean);
}

export async function signUp(input: SignUpInput): Promise<AuthUser> {
  const name = input.name.trim();
  const username = input.username.trim();
  const password = input.password;
  const role = input.role;

  if (name.length < 2 || name.length > 40) {
    throw new Error("Full name must be between 2 and 40 characters.");
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new Error("Username must be 3–20 characters using only letters, numbers, or underscores.");
  }

  const accounts = readAccounts();
  const exists = accounts.some((acc) => acc.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    throw new Error("That username is taken");
  }

  const salt = generateSaltHex(16);
  const hash = await hashPasswordWithSalt(password, salt);
  const createdAt = new Date().toISOString();
  const avatarColor = pickAvatarColor(username.toLowerCase());

  const newAccount: StoredAccount = {
    username,
    name,
    role,
    salt,
    hash,
    createdAt,
    avatarColor,
  };

  accounts.push(newAccount);
  writeAccounts(accounts);

  // If the user already played as guest, copy guest training progress to their new account key if none exists yet
  try {
    const userKey = getTrainingStorageKey({ username, name, role, avatarColor });
    const existingUserProgress = window.localStorage.getItem(userKey);
    const guestProgress =
      window.localStorage.getItem("progress:guest") ||
      window.localStorage.getItem(LEGACY_TRAINING_KEY);
    if (!existingUserProgress && guestProgress) {
      window.localStorage.setItem(userKey, guestProgress);
    }
  } catch {
    // Ignore storage errors
  }

  const sessionUser: AuthUser = {
    username,
    name,
    role,
    createdAt,
    avatarColor,
    isGuest: false,
  };
  saveSession(sessionUser);
  return sessionUser;
}

export async function signIn(input: SignInInput): Promise<AuthUser> {
  const username = input.username.trim();
  const password = input.password;

  const accounts = readAccounts();
  const account = accounts.find((acc) => acc.username.toLowerCase() === username.toLowerCase());
  if (!account) {
    throw new Error("Wrong username or password");
  }

  const hash = await hashPasswordWithSalt(password, account.salt);
  if (hash !== account.hash) {
    throw new Error("Wrong username or password");
  }

  const sessionUser: AuthUser = {
    username: account.username,
    name: account.name,
    role: account.role,
    createdAt: account.createdAt,
    avatarColor: account.avatarColor || pickAvatarColor(account.username.toLowerCase()),
    isGuest: false,
  };

  saveSession(sessionUser);
  return sessionUser;
}

export function signOut(): void {
  saveSession(null);
}

export function continueAsGuest(): AuthUser {
  const guestUser: AuthUser = {
    name: "Guest",
    role: "explorer",
    avatarColor: "#A2D2FF",
    isGuest: true,
  };
  saveSession(guestUser);
  return guestUser;
}

export function updateProfile(partial: ProfileUpdateInput): AuthUser {
  const current = getCurrentUser();
  if (!current) {
    throw new Error("Not signed in");
  }

  const nextName = partial.name !== undefined ? partial.name.trim() : current.name;
  if (nextName.length < 2 || nextName.length > 40) {
    throw new Error("Full name must be between 2 and 40 characters.");
  }

  const nextRole = partial.role ?? current.role;
  const nextColor = partial.avatarColor ?? current.avatarColor;

  const updatedUser: AuthUser = {
    ...current,
    name: nextName,
    role: nextRole,
    avatarColor: nextColor,
  };

  if (!current.isGuest && current.username) {
    const accounts = readAccounts();
    const idx = accounts.findIndex(
      (acc) => acc.username.toLowerCase() === current.username!.toLowerCase()
    );
    if (idx !== -1) {
      accounts[idx] = {
        ...accounts[idx],
        name: nextName,
        role: nextRole,
        avatarColor: nextColor,
      };
      writeAccounts(accounts);
    }
  }

  saveSession(updatedUser);
  return updatedUser;
}

export function deleteAccount(): void {
  const current = getCurrentUser();
  if (current && !current.isGuest && current.username) {
    const accounts = readAccounts();
    const filtered = accounts.filter(
      (acc) => acc.username.toLowerCase() !== current.username!.toLowerCase()
    );
    writeAccounts(filtered);

    try {
      window.localStorage.removeItem(`progress:${current.username.toLowerCase()}`);
    } catch {
      // Ignore storage errors
    }
  }
  saveSession(null);
}

/**
 * Returns the per-user localStorage key for Training Mode scores & badges.
 * Registered users use `progress:<username>`, while guests / unauthenticated visitors use `progress:guest`.
 */
export function getTrainingStorageKey(user?: AuthUser | null): string {
  if (user && !user.isGuest && user.username) {
    return `progress:${user.username.toLowerCase()}`;
  }
  return "progress:guest";
}

export interface StoredTrainingSummary {
  score: number;
  moversFound: number;
  compareRoundsCompleted: number;
  unlockedBadges: string[];
  streak: number;
  bestTimeSec: number | null;
}

export function readTrainingProgressForUser(user?: AuthUser | null): StoredTrainingSummary {
  const fallback: StoredTrainingSummary = {
    score: 0,
    moversFound: 0,
    compareRoundsCompleted: 0,
    unlockedBadges: [],
    streak: 0,
    bestTimeSec: null,
  };
  if (typeof window === "undefined") return fallback;

  try {
    const key = getTrainingStorageKey(user);
    let raw = window.localStorage.getItem(key);
    if (!raw && key === "progress:guest") {
      // Migrate from legacy key if present
      raw = window.localStorage.getItem(LEGACY_TRAINING_KEY);
      if (raw) {
        window.localStorage.setItem("progress:guest", raw);
      }
    }
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredTrainingSummary>;
    return {
      score: typeof parsed.score === "number" ? parsed.score : 0,
      moversFound: typeof parsed.moversFound === "number" ? parsed.moversFound : 0,
      compareRoundsCompleted:
        typeof parsed.compareRoundsCompleted === "number" ? parsed.compareRoundsCompleted : 0,
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      bestTimeSec: typeof parsed.bestTimeSec === "number" ? parsed.bestTimeSec : null,
    };
  } catch {
    return fallback;
  }
}

export function getFirstName(name?: string | null): string {
  if (!name) return "Detective";
  const trimmed = name.trim();
  if (!trimmed) return "Detective";
  return trimmed.split(/\s+/)[0];
}

export function getInitials(name?: string | null): string {
  if (!name) return "G";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

import type { AuthProvider, AuthResult, UserProfile } from './AuthTypes';

const ACCOUNTS_KEY = 'kraken.accounts.v1';
const SESSION_KEY = 'kraken.session.v1';
const AVATAR_COLORS = [0x19e6ff, 0xff2bd6, 0x39ff9c, 0xffc23a, 0xff3b4e, 0xa45bff];

interface StoredAccount {
  id: string;
  username: string;
  displayName: string;
  avatarColor: number;
  createdAt: number;
  salt: string;
  passwordHash: string;
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 over password+salt via the browser's native SubtleCrypto. This is NOT production-grade
 * auth (no server, no rate limiting, no breach protection) — it just means a raw password never
 * sits in localStorage as plain text for this local, single-browser demo account system.
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function loadAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredAccount>) : {};
  } catch {
    return {};
  }
}

function saveAccounts(accounts: Record<string, StoredAccount>): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function toProfile(account: StoredAccount): UserProfile {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    avatarColor: account.avatarColor,
    provider: 'local',
    createdAt: account.createdAt,
  };
}

/** Accounts and sessions stored entirely in this browser's localStorage. No network, no server. */
export class LocalAuthProvider implements AuthProvider {
  readonly id = 'local' as const;
  readonly available = true;

  async signUp(username: string, password: string, displayName: string): Promise<AuthResult> {
    const key = username.trim().toLowerCase();
    if (key.length < 3) return { ok: false, error: 'USERNAME MUST BE AT LEAST 3 CHARACTERS' };
    if (password.length < 4) return { ok: false, error: 'PASSWORD MUST BE AT LEAST 4 CHARACTERS' };
    const accounts = loadAccounts();
    if (accounts[key]) return { ok: false, error: 'THAT USERNAME IS ALREADY TAKEN' };

    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const account: StoredAccount = {
      id: `local:${key}:${Date.now().toString(36)}`,
      username: username.trim(),
      displayName: displayName.trim() || username.trim(),
      avatarColor: AVATAR_COLORS[Object.keys(accounts).length % AVATAR_COLORS.length],
      createdAt: Date.now(),
      salt,
      passwordHash,
    };
    accounts[key] = account;
    saveAccounts(accounts);
    localStorage.setItem(SESSION_KEY, account.id);
    return { ok: true, profile: toProfile(account) };
  }

  async logIn(username: string, password: string): Promise<AuthResult> {
    const key = username.trim().toLowerCase();
    const accounts = loadAccounts();
    const account = accounts[key];
    if (!account) return { ok: false, error: 'NO ACCOUNT WITH THAT USERNAME' };
    const hash = await hashPassword(password, account.salt);
    if (hash !== account.passwordHash) return { ok: false, error: 'INCORRECT PASSWORD' };
    localStorage.setItem(SESSION_KEY, account.id);
    return { ok: true, profile: toProfile(account) };
  }

  async logOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
  }

  getCurrentUser(): UserProfile | null {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return null;
    const accounts = loadAccounts();
    const account = Object.values(accounts).find((a) => a.id === sessionId);
    return account ? toProfile(account) : null;
  }
}

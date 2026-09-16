export type AuthProviderId = 'local' | 'google';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarColor: number;
  provider: AuthProviderId;
  createdAt: number;
}

export interface AuthResult {
  ok: boolean;
  profile?: UserProfile;
  error?: string;
}

/**
 * A swappable auth backend. `LocalAuthProvider` is live today (accounts live in this browser
 * only — this is a hackathon-local demo, not real security). `GoogleAuthProvider` is a guided
 * stub: the shape is final, so wiring in a real Firebase project later is a drop-in swap, not a
 * rewrite. See src/profile/GoogleAuthProvider.ts for exactly what that swap needs.
 */
export interface AuthProvider {
  readonly id: AuthProviderId;
  readonly available: boolean;
  readonly unavailableReason?: string;
  signUp(username: string, password: string, displayName: string): Promise<AuthResult>;
  logIn(username: string, password: string): Promise<AuthResult>;
  logOut(): Promise<void>;
  getCurrentUser(): UserProfile | null;
}

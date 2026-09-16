import { GoogleAuthProvider } from './GoogleAuthProvider';
import { LocalAuthProvider } from './LocalAuthProvider';
import type { AuthProvider, UserProfile } from './AuthTypes';

const local = new LocalAuthProvider();
const google = new GoogleAuthProvider();

export const authProviders: readonly AuthProvider[] = [local, google];

let current: UserProfile | null = local.getCurrentUser();
const listeners = new Set<(profile: UserProfile | null) => void>();

/** The provider a session was created with owns logOut for it — tracked so logOut calls the right one. */
let activeProvider: AuthProvider = local;

export function getCurrentProfile(): UserProfile | null {
  return current;
}

export function setCurrentProfile(profile: UserProfile | null, provider: AuthProvider = local): void {
  current = profile;
  activeProvider = provider;
  for (const listener of listeners) listener(current);
}

export function onProfileChange(listener: (profile: UserProfile | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function logOut(): Promise<void> {
  await activeProvider.logOut();
  setCurrentProfile(null);
}

export function continueAsGuest(): UserProfile {
  const guest: UserProfile = {
    id: `guest:${Date.now().toString(36)}`,
    username: 'guest',
    displayName: 'GUEST DIVER',
    avatarColor: 0x7f93a8,
    provider: 'local',
    createdAt: Date.now(),
  };
  setCurrentProfile(guest, local);
  return guest;
}

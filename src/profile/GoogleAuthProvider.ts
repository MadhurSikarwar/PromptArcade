import type { AuthProvider, AuthResult, UserProfile } from './AuthTypes';

/**
 * GUIDED STUB — not wired to real Google Sign-In yet.
 *
 * To make this real (about 5 minutes):
 *   1. Go to https://console.firebase.google.com, create a free project.
 *   2. Build > Authentication > Get started > enable the "Google" sign-in provider.
 *   3. Project settings > General > "Your apps" > add a Web app, copy the firebaseConfig object.
 *   4. Add the package: npm install firebase
 *   5. In this file: import { initializeApp } from 'firebase/app'; import {
 *      getAuth, GoogleAuthProvider as GoogleProvider, signInWithPopup, signOut,
 *      onAuthStateChanged } from 'firebase/auth'; call initializeApp(firebaseConfig) once,
 *      then implement logIn() as signInWithPopup(auth, new GoogleProvider()) and map the
 *      returned Firebase user into a UserProfile (uid -> id, displayName, a fixed avatarColor).
 *   6. In src/profile/Session.ts, swap `new LocalAuthProvider()` for `new GoogleAuthProvider()`
 *      (or offer both side by side) — nothing else in the game needs to change, every caller
 *      only talks to the AuthProvider interface.
 *
 * Until then, this provider reports itself unavailable and every call fails cleanly.
 */
export class GoogleAuthProvider implements AuthProvider {
  readonly id = 'google' as const;
  readonly available = false;
  readonly unavailableReason = 'GOOGLE SIGN-IN NEEDS A FIREBASE PROJECT — SEE GoogleAuthProvider.ts';

  async signUp(): Promise<AuthResult> {
    return { ok: false, error: this.unavailableReason };
  }

  async logIn(): Promise<AuthResult> {
    return { ok: false, error: this.unavailableReason };
  }

  async logOut(): Promise<void> {
    /* nothing to sign out of */
  }

  getCurrentUser(): UserProfile | null {
    return null;
  }
}

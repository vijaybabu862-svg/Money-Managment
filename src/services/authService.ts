import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider, isFirebaseConfigured } from './firebase';
import { AuthState } from '../types/sync';

const LOCAL_AUTH_KEY = 'cashflow_local_auth_session';

const getStorage = (): Storage | null => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
};

export function getInitialAuthState(): AuthState {
  const storage = getStorage();
  if (!storage) {
    return { status: 'signed_out' };
  }

  // Check stored session if offline or demo login
  const stored = storage.getItem(LOCAL_AUTH_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AuthState;
      return parsed;
    } catch {
      // Fallback
    }
  }

  return { status: 'signed_out' };
}

export function saveLocalAuthState(state: AuthState): void {
  const storage = getStorage();
  if (!storage) return;
  if (state.status === 'signed_in') {
    storage.setItem(LOCAL_AUTH_KEY, JSON.stringify(state));
  } else {
    storage.removeItem(LOCAL_AUTH_KEY);
  }
}

export const AuthService = {
  /**
   * Signs in with Google account
   */
  async signInWithGoogle(): Promise<{ success: boolean; user?: AuthState; error?: string }> {
    if (isFirebaseConfigured() && auth) {
      try {
        const result = await signInWithPopup(auth, googleAuthProvider);
        const user = result.user;
        const authState: AuthState = {
          status: 'signed_in',
          userId: user.uid,
          email: user.email || undefined,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || undefined,
        };
        saveLocalAuthState(authState);
        return { success: true, user: authState };
      } catch (err: any) {
        console.error('[AuthService] Google Sign-In failed:', err);
        return { success: false, error: err.message || 'Google sign-in was cancelled or blocked.' };
      }
    } else {
      // Offline/Local development simulated sign-in
      const mockState: AuthState = {
        status: 'signed_in',
        userId: 'dev_user_vijay_862',
        email: 'vijaybabu862@gmail.com',
        displayName: 'VIJAY BABU GOVADA',
        photoURL: undefined,
      };
      saveLocalAuthState(mockState);
      return { success: true, user: mockState };
    }
  },

  /**
   * Signs out current user
   * Strictly preserves local financial records!
   */
  async signOut(): Promise<void> {
    if (isFirebaseConfigured() && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('[AuthService] Firebase signOut error:', err);
      }
    }
    saveLocalAuthState({ status: 'signed_out' });
  },

  /**
   * Subscribes to Firebase auth state changes
   */
  subscribeToAuthChanges(callback: (state: AuthState) => void): () => void {
    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          const authState: AuthState = {
            status: 'signed_in',
            userId: user.uid,
            email: user.email || undefined,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL || undefined,
          };
          saveLocalAuthState(authState);
          callback(authState);
        } else {
          // Check if there was a local offline demo session
          const local = getInitialAuthState();
          if (local.status === 'signed_in' && !isFirebaseConfigured()) {
            callback(local);
          } else {
            callback({ status: 'signed_out' });
          }
        }
      });
      return unsubscribe;
    } else {
      // Offline / test fallback
      const initial = getInitialAuthState();
      callback(initial);
      return () => {};
    }
  },
};

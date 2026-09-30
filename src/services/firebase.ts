import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const configFromJson: Record<string, string> =
  typeof firebaseAppletConfig === 'object' && firebaseAppletConfig !== null
    ? (firebaseAppletConfig as unknown as Record<string, string>)
    : {};

const getEnvVar = (key: string): string => {
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key]!;
    }
  } catch {}
  return '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || configFromJson.apiKey || '',
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || configFromJson.authDomain || '',
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || configFromJson.projectId || '',
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || configFromJson.storageBucket || '',
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || configFromJson.messagingSenderId || '',
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || configFromJson.appId || '',
};

const firestoreDatabaseId =
  getEnvVar('VITE_FIREBASE_DATABASE_ID') ||
  configFromJson.firestoreDatabaseId ||
  '(default)';

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    if (firestoreDatabaseId && firestoreDatabaseId !== '(default)') {
      db = getFirestore(app, firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn('[CASH FLOW Firebase] Failed to initialize Firebase:', err);
  }
}

// Validate connection to Firestore on initialization per Firebase Skill
async function testFirestoreConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or connection pending:', error.message);
    }
  }
}

if (db) {
  testFirestoreConnection().catch(() => {});
}

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db, firebaseConfig, firestoreDatabaseId };

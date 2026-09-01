import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Safely discover local configuration in AI Studio preview without failing when absent on Vercel
const localConfigs = import.meta.glob('../firebase-applet-config.json', { eager: true, import: 'default' });
const localConfig = (localConfigs['../firebase-applet-config.json'] as Record<string, any>) || {};

const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || localConfig.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || localConfig.authDomain || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || localConfig.projectId || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || localConfig.storageBucket || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || localConfig.messagingSenderId || '',
  appId: env.VITE_FIREBASE_APP_ID || localConfig.appId || '',
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || localConfig.firestoreDatabaseId || '(default)',
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore with dedicated Database ID
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db: Firestore = getFirestore(app, databaseId);

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };

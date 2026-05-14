import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

/**
 * Prefer `VITE_FIREBASE_*` in `.env` for deployments. Fallbacks match the MOF dashboard Firebase project.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDlPJV24iOsZJMLNoMYeQ02RpIXQBNydeI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "mofdashbaord.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "mofdashbaord",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "mofdashbaord.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "1037977713240",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:1037977713240:web:95696972a83d62cc7b282d",
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase is only available in the browser.");
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export const googleAuthProvider = new GoogleAuthProvider();

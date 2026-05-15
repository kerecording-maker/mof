import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  type Auth,
} from "firebase/auth";

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

export function signInWithGoogle() {
  return signInWithPopup(getFirebaseAuth(), googleAuthProvider);
}

export function signInWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

/** Map Firebase Auth errors to short user-facing messages. */
export function getAuthErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Sign-in failed. Check your credentials or try Google sign-in.";
  }
}

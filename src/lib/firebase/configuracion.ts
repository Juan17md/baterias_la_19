import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

/**
 * Configuración pública de la app web Firebase (proyecto bateriasla19).
 * Las variables provienen de `.env.local` (ver docs-obsidian/09_Entorno_Snippets.md).
 */
export const configuracionFirebase: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(configuracionFirebase);

/** Instancia única de Authentication para el cliente. */
export const auth: Auth = getAuth(app);

/** Instancia única de Firestore para el cliente. */
export const db: Firestore = getFirestore(app);

/** Indica si la app debe hablar con los emuladores locales (`NEXT_PUBLIC_FIREBASE_EMULADORES=true`). */
export const usarEmuladores =
  process.env.NEXT_PUBLIC_FIREBASE_EMULADORES === "true";

/**
 * Conecta Auth y Firestore a los emuladores locales (solo en el navegador y
 * cuando la bandera está activa). La bandera en `globalThis` evita conexiones
 * duplicadas durante el hot-reload de desarrollo.
 */
function conectarEmuladores(): void {
  if (!usarEmuladores || typeof window === "undefined") return;

  const bandera = globalThis as typeof globalThis & {
    __emuladoresFirebaseConectados?: boolean;
  };
  if (bandera.__emuladoresFirebaseConectados) return;

  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  bandera.__emuladoresFirebaseConectados = true;
}

conectarEmuladores();

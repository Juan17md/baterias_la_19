import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

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

/** Instancia única de la app Firebase compartida por Auth y Firestore. */
export const app = getApps().length
  ? getApp()
  : initializeApp(configuracionFirebase);

/** Instancia única de Authentication para el cliente. */
export const auth: Auth = getAuth(app);

/** Indica si la app debe hablar con los emuladores locales (`NEXT_PUBLIC_FIREBASE_EMULADORES=true`). */
export const usarEmuladores =
  process.env.NEXT_PUBLIC_FIREBASE_EMULADORES === "true";

/**
 * Conecta Auth al emulador local (solo en el navegador y cuando la bandera
 * está activa). La bandera en `globalThis` evita conexiones duplicadas durante
 * el hot-reload de desarrollo.
 */
function conectarEmuladorAuth(): void {
  if (!usarEmuladores || typeof window === "undefined") return;

  const bandera = globalThis as typeof globalThis & {
    __emuladorAuthConectado?: boolean;
  };
  if (bandera.__emuladorAuthConectado) return;

  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  bandera.__emuladorAuthConectado = true;
}

conectarEmuladorAuth();

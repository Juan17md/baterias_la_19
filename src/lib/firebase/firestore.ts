import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { app, usarEmuladores } from "@/lib/firebase/configuracion";

/** Instancia única de Firestore para el cliente. */
export const db: Firestore = getFirestore(app);

/**
 * Conecta Firestore al emulador local (solo en el navegador y cuando la bandera
 * está activa). La bandera en `globalThis` evita conexiones duplicadas durante
 * el hot-reload de desarrollo.
 */
function conectarEmuladorFirestore(): void {
  if (!usarEmuladores || typeof window === "undefined") return;

  const bandera = globalThis as typeof globalThis & {
    __emuladorFirestoreConectado?: boolean;
  };
  if (bandera.__emuladorFirestoreConectado) return;

  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  bandera.__emuladorFirestoreConectado = true;
}

conectarEmuladorFirestore();

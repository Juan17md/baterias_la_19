import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from "firebase/auth";
import {
  auth,
  configuracionFirebase,
  usarEmuladores,
} from "@/lib/firebase/configuracion";

/** Mensajes en español para los códigos de error más comunes de Firebase Auth. */
const MENSAJES_ERROR_AUTH: Record<string, string> = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "El correo no tiene un formato válido.",
  "auth/user-disabled": "Esta cuenta está desactivada.",
  "auth/too-many-requests":
    "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.",
  "auth/network-request-failed":
    "Sin conexión. Revisa tu internet e inténtalo de nuevo.",
  "auth/email-already-in-use": "Ese correo ya está registrado.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/operation-not-allowed":
    "El acceso con correo y contraseña no está habilitado en el proyecto.",
};

function esErrorConCodigo(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/** Traduce un error de Firebase Auth a un mensaje claro en español. */
export function mensajeDeErrorAuth(error: unknown): string {
  if (esErrorConCodigo(error) && MENSAJES_ERROR_AUTH[error.code]) {
    return MENSAJES_ERROR_AUTH[error.code];
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/** Inicia sesión con correo y contraseña (el perfil se carga en el AuthProvider). */
export async function iniciarSesion(
  correo: string,
  contrasena: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(
    auth,
    correo.trim().toLowerCase(),
    contrasena,
  );
}

/** Cierra la sesión activa. */
export async function cerrarSesionAuth(): Promise<void> {
  await signOut(auth);
}

/** Envía el correo de restablecimiento de contraseña. */
export async function enviarCorreoRestablecimiento(
  correo: string,
): Promise<void> {
  await sendPasswordResetEmail(auth, correo.trim().toLowerCase());
}

/**
 * Crea una cuenta nueva **sin afectar la sesión del administrador actual**:
 * se usa una instancia secundaria de la app Firebase (patrón documentado).
 * Devuelve el UID del usuario recién creado.
 */
export async function crearCuentaUsuario(
  correo: string,
  contrasena: string,
): Promise<string> {
  const appSecundaria = initializeApp(
    configuracionFirebase,
    `alta-usuario-${Date.now()}`,
  );

  try {
    const authSecundaria = getAuth(appSecundaria);
    if (usarEmuladores && typeof window !== "undefined") {
      connectAuthEmulator(authSecundaria, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    }

    const credencial = await createUserWithEmailAndPassword(
      authSecundaria,
      correo.trim().toLowerCase(),
      contrasena,
    );
    return credencial.user.uid;
  } finally {
    await deleteApp(appSecundaria).catch(() => undefined);
  }
}

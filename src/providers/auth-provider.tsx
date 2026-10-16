"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/configuracion";
import { obtenerPerfil } from "@/lib/servicios/usuarios";
import type { Usuario } from "@/types";

export type EstadoAuth = {
  /** Usuario de Firebase Auth (`null` si no hay sesión). */
  usuario: User | null;
  /** Perfil de Firestore (`usuarios/{uid}`) con rol y estado. */
  perfil: Usuario | null;
  /** `true` mientras se restaura la sesión al cargar la app. */
  cargando: boolean;
  /** Cierra la sesión activa. */
  cerrarSesion: () => Promise<void>;
};

export const ContextoAuth = createContext<EstadoAuth | null>(null);

/**
 * Provider de sesión: escucha Firebase Auth y carga el perfil de Firestore.
 * Si la cuenta no tiene perfil activo (`activo: false`) o no existe, se cierra
 * la sesión con un aviso (el bloqueo real también vive en las reglas).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cancelarSuscripcion = onAuthStateChanged(
      auth,
      async (usuarioFirebase) => {
        if (!usuarioFirebase) {
          setUsuario(null);
          setPerfil(null);
          setCargando(false);
          return;
        }

        try {
          const perfilEncontrado = await obtenerPerfil(usuarioFirebase.uid);
          if (!perfilEncontrado || !perfilEncontrado.activo) {
            await signOut(auth).catch(() => undefined);
            setUsuario(null);
            setPerfil(null);
            toast.error(
              "Tu cuenta no tiene un perfil activo. Contacta al administrador.",
            );
            return;
          }

          setUsuario(usuarioFirebase);
          setPerfil(perfilEncontrado);
        } catch {
          // Sin conexión o acceso denegado: se cierra la sesión para no quedar en un estado inconsistente.
          await signOut(auth).catch(() => undefined);
          setUsuario(null);
          setPerfil(null);
          toast.error(
            "No se pudo verificar tu perfil. Revisa tu conexión e inténtalo de nuevo.",
          );
        } finally {
          setCargando(false);
        }
      },
    );

    return cancelarSuscripcion;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <ContextoAuth.Provider value={{ usuario, perfil, cargando, cerrarSesion }}>
      {children}
    </ContextoAuth.Provider>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PantallaCarga } from "@/components/auth/pantalla-carga";

/**
 * Bloquea el renderizado del dashboard hasta tener sesión y perfil activos.
 * Si la cuenta conserva la contraseña temporal, redirige al cambio obligatorio.
 * La capa real de seguridad son las reglas de Firestore
 * (ver docs-obsidian/05_Base_de_Datos).
 */
export function ProteccionSesion({ children }: { children: React.ReactNode }) {
  const { usuario, perfil, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;

    if (!usuario || !perfil) {
      router.replace("/login");
      return;
    }

    if (perfil.debeCambiarContrasena) {
      router.replace("/cambiar-contrasena");
    }
  }, [cargando, usuario, perfil, router]);

  if (cargando || !usuario || !perfil || perfil.debeCambiarContrasena) {
    return <PantallaCarga />;
  }

  return <>{children}</>;
}

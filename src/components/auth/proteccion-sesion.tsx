"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function PantallaCarga() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Verificando sesión…
    </div>
  );
}

/**
 * Bloquea el renderizado del dashboard hasta tener sesión y perfil activos.
 * Sin sesión válida redirige a `/login` (la capa real de seguridad son las
 * reglas de Firestore, ver docs-obsidian/05_Base_de_Datos).
 */
export function ProteccionSesion({ children }: { children: React.ReactNode }) {
  const { usuario, perfil, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && (!usuario || !perfil)) {
      router.replace("/login");
    }
  }, [cargando, usuario, perfil, router]);

  if (cargando || !usuario || !perfil) {
    return <PantallaCarga />;
  }

  return <>{children}</>;
}

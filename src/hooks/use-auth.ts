"use client";

import { useContext } from "react";
import { ContextoAuth } from "@/providers/auth-provider";

/** Acceso al contexto de sesión (usuario, perfil y cierre de sesión). */
export function useAuth() {
  const contexto = useContext(ContextoAuth);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return contexto;
}

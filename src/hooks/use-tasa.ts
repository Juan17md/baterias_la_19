"use client";

import { useContext } from "react";
import { ContextoTasa } from "@/providers/tasa-provider";

/** Acceso al contexto de la tasa BCV (valor vigente y corrección manual). */
export function useTasa() {
  const contexto = useContext(ContextoTasa);
  if (!contexto) {
    throw new Error("useTasa debe usarse dentro de <TasaProvider>");
  }
  return contexto;
}

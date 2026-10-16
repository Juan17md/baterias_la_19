"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import {
  guardarTasaAutomatica,
  guardarTasaManual,
  obtenerTasaDeApi,
  obtenerTasaGuardada,
} from "@/lib/servicios/tasa";
import type { TasaBCV } from "@/types";

export type EstadoTasa = {
  /** Tasa vigente (de la API o corregida manualmente). */
  tasa: TasaBCV | null;
  /** `true` mientras se consulta la tasa al abrir el dashboard. */
  cargando: boolean;
  /** `true` si la última consulta a la API falló (se usa la última tasa guardada). */
  errorApi: boolean;
  /** Corrige la tasa manualmente (solo admin). */
  corregirTasa: (valor: number) => Promise<void>;
};

export const ContextoTasa = createContext<EstadoTasa | null>(null);

/**
 * Provider único de la tasa BCV (docs-obsidian/04_Arquitectura, flujo 5.4).
 * Al montar: lee la tasa guardada, consulta DolarAPI y actualiza la caché solo
 * si la fecha de la API es más reciente (una corrección manual posterior
 * prevalece). Si la API falla, se conserva la última tasa guardada.
 */
export function TasaProvider({ children }: { children: React.ReactNode }) {
  const { perfil } = useAuth();
  const [tasa, setTasa] = useState<TasaBCV | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorApi, setErrorApi] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarTasa() {
      try {
        const guardada = await obtenerTasaGuardada();
        if (cancelado) return;

        setTasa(guardada);

        try {
          const remota = await obtenerTasaDeApi();
          if (cancelado) return;

          setErrorApi(false);

          const fechaApiMs = remota.fecha
            ? new Date(remota.fecha).getTime()
            : 0;
          const guardadaMs = guardada?.fechaActualizacion?.toMillis() ?? 0;

          if (!guardada || fechaApiMs > guardadaMs) {
            await guardarTasaAutomatica(remota);
            if (cancelado) return;

            setTasa({
              valor: remota.valor,
              fuente: "dolarapi_oficial",
              fechaActualizacion: remota.fecha
                ? Timestamp.fromDate(new Date(remota.fecha))
                : Timestamp.now(),
              actualizadoPor: null,
            });
          }
        } catch {
          // API caída: se mantiene la última tasa guardada (aviso en la UI).
          if (!cancelado) setErrorApi(true);
        }
      } catch {
        // Firestore inaccesible: sin tasa disponible.
        if (!cancelado) setErrorApi(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarTasa();

    return () => {
      cancelado = true;
    };
  }, []);

  const corregirTasa = useCallback(
    async (valor: number) => {
      if (!perfil || perfil.rol !== "admin") {
        throw new Error("Solo un administrador puede corregir la tasa.");
      }

      await guardarTasaManual(valor, {
        uid: perfil.uid,
        nombre: perfil.nombre,
      });
      setTasa({
        valor,
        fuente: "manual",
        fechaActualizacion: Timestamp.now(),
        actualizadoPor: { uid: perfil.uid, nombre: perfil.nombre },
      });
    },
    [perfil],
  );

  return (
    <ContextoTasa.Provider value={{ tasa, cargando, errorApi, corregirTasa }}>
      {children}
    </ContextoTasa.Provider>
  );
}

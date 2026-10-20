"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/configuracion";
import { calcularKpis } from "@/lib/servicios/estadisticas";
import { mapearVenta } from "@/lib/servicios/ventas";
import { inicioDelDia, sumarDias } from "@/lib/utils";
import type { KpisEstadisticas, Venta } from "@/types";

/**
 * Escucha en tiempo real las ventas completadas de hoy. Es la única fuente
 * de los KPIs y de la lista de últimas ventas del dashboard (04_Arquitectura §8).
 */
export function useResumenDia(): {
  ventas: Venta[];
  kpis: KpisEstadisticas;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
} {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const inicio = inicioDelDia(new Date());
    const finExclusivo = sumarDias(inicio, 1);
    const consulta = query(
      collection(db, "ventas"),
      where("estado", "==", "completada"),
      where("fecha", ">=", Timestamp.fromDate(inicio)),
      where("fecha", "<", Timestamp.fromDate(finExclusivo)),
      orderBy("fecha", "desc"),
    );

    const cancelar = onSnapshot(
      consulta,
      (instantanea) => {
        setVentas(
          instantanea.docs.map((documento) =>
            mapearVenta(documento.id, documento.data()),
          ),
        );
        setCargando(false);
        setError(null);
      },
      () => {
        setError("No se pudo cargar el resumen de hoy.");
        setCargando(false);
      },
    );

    return cancelar;
  }, [intento]);

  return {
    ventas,
    kpis: calcularKpis(ventas),
    cargando,
    error,
    recargar: () => {
      setCargando(true);
      setError(null);
      setIntento((valor) => valor + 1);
    },
  };
}

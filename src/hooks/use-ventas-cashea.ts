"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { mapearFinanciamiento } from "@/lib/servicios/financiamientos";
import { mapearVenta } from "@/lib/servicios/ventas";
import type { Financiamiento, Venta } from "@/types";

/** Planes de Cashea que se cargan en el dashboard. */
const MAX_PLANES = 12;

/**
 * Escucha los planes de Cashea y sus ventas asociadas para la lista del
 * dashboard. Los planes llegan con el listener (índice `modalidad + fechaVenta`)
 * y los artículos de cada venta se resuelven con una única consulta `in` sobre
 * `ventas.financiamientoId`.
 */
export function useVentasCashea(): {
  planes: Financiamiento[];
  /** Ventas indexadas por su ID (la clave es `ventaId` del plan). */
  ventas: Map<string, Venta>;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
} {
  const [planes, setPlanes] = useState<Financiamiento[]>([]);
  const [ventas, setVentas] = useState<Map<string, Venta>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const consulta = query(
      collection(db, "financiamientos"),
      where("modalidad", "==", "cashea"),
      orderBy("fechaVenta", "desc"),
      limit(MAX_PLANES),
    );

    const cancelar = onSnapshot(
      consulta,
      (instantanea) => {
        setPlanes(
          instantanea.docs.map((documento) =>
            mapearFinanciamiento(documento.id, documento.data()),
          ),
        );
        setCargando(false);
        setError(null);
      },
      () => {
        setError("No se pudieron cargar las ventas por Cashea.");
        setCargando(false);
      },
    );

    return cancelar;
  }, [intento]);

  // Artículos vendidos: una sola consulta con `in` para todos los planes.
  useEffect(() => {
    const ids = planes.map((plan) => plan.ventaId).filter(Boolean);
    // Sin planes no hay filas que mostrar; el mapa anterior no se consulta.
    if (ids.length === 0) return;

    let cancelado = false;

    async function cargarVentas() {
      try {
        const instantanea = await getDocs(
          query(collection(db, "ventas"), where("financiamientoId", "in", ids)),
        );
        if (cancelado) return;
        const mapa = new Map<string, Venta>();
        instantanea.docs.forEach((documento) => {
          const venta = mapearVenta(documento.id, documento.data());
          mapa.set(venta.id, venta);
        });
        setVentas(mapa);
      } catch {
        // La lista sigue siendo utilizable sin los artículos de la venta.
        if (!cancelado) setVentas(new Map());
      }
    }

    void cargarVentas();
    return () => {
      cancelado = true;
    };
  }, [planes]);

  const recargar = useCallback(() => {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  }, []);

  return { planes, ventas, cargando, error, recargar };
}

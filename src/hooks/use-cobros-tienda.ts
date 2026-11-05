"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { mapearFinanciamiento } from "@/lib/servicios/financiamientos";
import type { Financiamiento } from "@/types";

/**
 * Escucha los planes de «Por la tienda» con estado activo y calcula el saldo
 * total por cobrar y el saldo vencido (cuotas cuya fecha de vencimiento ya
 * pasó). Se usa en el dashboard para mostrar los cobros pendientes de la tienda.
 *
 * Los totales se calculan sobre todos los planes activos; la lista visual se
 * recorta en el componente. Aplicar `limit()` aquí dejaría los KPIs incompletos.
 */
export function useCobrosTienda(): {
  porCobrar: number;
  vencido: number;
  planes: Financiamiento[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
} {
  const [planes, setPlanes] = useState<Financiamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const consulta = query(
      collection(db, "financiamientos"),
      where("modalidad", "==", "tienda"),
      where("estado", "==", "activo"),
      orderBy("proximaFechaVencimiento", "asc"),
    );

    const cancelar = onSnapshot(
      consulta,
      (instantanea) => {
        const planosTienda = instantanea.docs.map((documento) =>
          mapearFinanciamiento(documento.id, documento.data(), hoy),
        );
        setPlanes(planosTienda);
        setCargando(false);
        setError(null);
      },
      () => {
        setError("No se pudieron cargar los cobros pendientes de la tienda.");
        setCargando(false);
      },
    );

    return cancelar;
  }, [intento]);

  const recargar = useCallback(() => {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  }, []);

  const porCobrar = planes.reduce((suma, p) => suma + p.saldoPendiente, 0);
  // El KPI de vencido suma solo las cuotas con fecha pasada, no el saldo
  // completo del plan (las cuotas futuras siguen dentro de «Por cobrar»).
  const vencido = planes.reduce(
    (suma, plan) =>
      suma +
      plan.cuotas
        .filter((cuota) => cuota.estado === "vencida")
        .reduce((subtotal, cuota) => subtotal + cuota.monto, 0),
    0,
  );

  return { porCobrar, vencido, planes, cargando, error, recargar };
}

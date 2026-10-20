"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { mapearBateria } from "@/lib/servicios/baterias";
import type { Bateria } from "@/types";

/**
 * Escucha las baterías activas con stock bajo o agotado. El campo `stockBajo`
 * se mantiene denormalizado y la consulta usa el índice (activo, stockBajo, marca).
 */
export function useAlertasStock(): {
  alertas: Bateria[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
} {
  const [alertas, setAlertas] = useState<Bateria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const consulta = query(
      collection(db, "baterias"),
      where("activo", "==", true),
      where("stockBajo", "==", true),
      orderBy("marca"),
    );

    const cancelar = onSnapshot(
      consulta,
      (instantanea) => {
        const lista = instantanea.docs.map((documento) =>
          mapearBateria(documento.id, documento.data()),
        );
        lista.sort(
          (a, b) => a.stock - b.stock || a.marca.localeCompare(b.marca, "es"),
        );
        setAlertas(lista);
        setCargando(false);
        setError(null);
      },
      () => {
        setError("No se pudieron cargar las alertas de stock.");
        setCargando(false);
      },
    );

    return cancelar;
  }, [intento]);

  return {
    alertas,
    cargando,
    error,
    recargar: () => {
      setCargando(true);
      setError(null);
      setIntento((valor) => valor + 1);
    },
  };
}

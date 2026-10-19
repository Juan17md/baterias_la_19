import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/configuracion";
import type { Movimiento, TipoMovimiento } from "@/types";

function mapearMovimiento(
  id: string,
  datos: Record<string, unknown>,
): Movimiento {
  const resumen = (datos.bateriaResumen ?? {}) as Record<string, unknown>;
  const usuario = (datos.usuario ?? {}) as Record<string, unknown>;
  return {
    id,
    fecha: (datos.fecha as Movimiento["fecha"]) ?? null,
    tipo: (datos.tipo as TipoMovimiento) ?? "ajuste",
    bateriaId: String(datos.bateriaId ?? ""),
    bateriaResumen: {
      codigo: String(resumen.codigo ?? ""),
      marca: String(resumen.marca ?? ""),
      modelo: String(resumen.modelo ?? ""),
    },
    cantidad: Number(datos.cantidad ?? 0),
    stockAntes: Number(datos.stockAntes ?? 0),
    stockDespues: Number(datos.stockDespues ?? 0),
    motivo: String(datos.motivo ?? ""),
    ventaId: datos.ventaId == null ? null : String(datos.ventaId),
    usuario: {
      uid: String(usuario.uid ?? ""),
      nombre: String(usuario.nombre ?? ""),
    },
  };
}

export type PaginaMovimientos = {
  movimientos: Movimiento[];
  /** Cursor para pedir la página siguiente (`null` si ya no hay más). */
  ultimo: QueryDocumentSnapshot | null;
};

/** Historial de movimientos de una batería, paginado por fecha descendente. */
export async function listarMovimientosDeBateria(
  bateriaId: string,
  cantidad = 8,
  desde?: QueryDocumentSnapshot | null,
): Promise<PaginaMovimientos> {
  const consulta = query(
    collection(db, "movimientos"),
    where("bateriaId", "==", bateriaId),
    orderBy("fecha", "desc"),
    ...(desde ? [startAfter(desde)] : []),
    limit(cantidad),
  );
  const instantanea = await getDocs(consulta);
  const documentos = instantanea.docs;
  return {
    movimientos: documentos.map((documento) =>
      mapearMovimiento(documento.id, documento.data()),
    ),
    ultimo:
      documentos.length === cantidad
        ? (documentos[documentos.length - 1] ?? null)
        : null,
  };
}

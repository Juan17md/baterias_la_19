import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  Timestamp,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/configuracion";
import { calcularStockBajo } from "@/lib/servicios/baterias";
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

export type FiltrosMovimientos = {
  tipo?: TipoMovimiento | "todos";
  usuarioUid?: string | "todos";
  desde?: Date | null;
  hasta?: Date | null;
  cantidad?: number;
  cursor?: QueryDocumentSnapshot | null;
};

/** Historial global de movimientos paginado por fecha descendente, con filtros. */
export async function listarMovimientos(
  filtros: FiltrosMovimientos = {},
): Promise<PaginaMovimientos> {
  const {
    tipo = "todos",
    usuarioUid = "todos",
    desde = null,
    hasta = null,
    cantidad = 12,
    cursor = null,
  } = filtros;

  const condiciones: QueryConstraint[] = [];
  if (tipo !== "todos") condiciones.push(where("tipo", "==", tipo));
  if (usuarioUid !== "todos") {
    condiciones.push(where("usuario.uid", "==", usuarioUid));
  }
  if (desde) condiciones.push(where("fecha", ">=", Timestamp.fromDate(desde)));
  if (hasta) condiciones.push(where("fecha", "<", Timestamp.fromDate(hasta)));

  const consulta = query(
    collection(db, "movimientos"),
    ...condiciones,
    orderBy("fecha", "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
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

/**
 * Elimina un movimiento manual (admin) y revierte su efecto en el stock.
 * Los movimientos vinculados a una venta no se eliminan aquí: la venta debe
 * anularse desde su comprobante para reponer el stock de forma consistente.
 */
export async function eliminarMovimiento(movimientoId: string): Promise<void> {
  await runTransaction(db, async (transaccion) => {
    const referenciaMovimiento = doc(db, "movimientos", movimientoId);
    const instantaneaMovimiento = await transaccion.get(referenciaMovimiento);
    if (!instantaneaMovimiento.exists()) {
      throw new Error("El movimiento ya no existe.");
    }

    const datos = instantaneaMovimiento.data() as Record<string, unknown>;
    if (datos.ventaId != null) {
      throw new Error(
        "Los movimientos de una venta no se pueden eliminar. Anula la venta desde su comprobante.",
      );
    }

    const bateriaId = String(datos.bateriaId ?? "");
    if (!bateriaId) {
      throw new Error("El movimiento no tiene una batería asociada.");
    }

    const referenciaBateria = doc(db, "baterias", bateriaId);
    const instantaneaBateria = await transaccion.get(referenciaBateria);
    if (!instantaneaBateria.exists()) {
      throw new Error("La batería asociada ya no existe.");
    }

    const bateria = instantaneaBateria.data() as Record<string, unknown>;
    const stockActual = Number(bateria.stock ?? 0);
    // El movimiento guarda su efecto firmado: revertirlo es restarlo.
    const stockNuevo = stockActual - Number(datos.cantidad ?? 0);
    if (stockNuevo < 0) {
      throw new Error(
        `El stock de la batería quedaría negativo (${stockNuevo}). Ajusta el inventario antes de eliminar este movimiento.`,
      );
    }

    transaccion.update(referenciaBateria, {
      stock: stockNuevo,
      stockBajo: calcularStockBajo(
        stockNuevo,
        Number(bateria.stockMinimo ?? 0),
      ),
    });
    transaccion.delete(referenciaMovimiento);
  });
}

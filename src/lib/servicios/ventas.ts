import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Timestamp as TipoTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/configuracion";
import { calcularStockBajo } from "@/lib/servicios/baterias";
import {
  esquemaAnulacionVenta,
  esquemaVenta,
  type DatosVenta,
} from "@/lib/validaciones/ventas";
import type {
  EstadoVenta,
  ItemVenta,
  MetodoPago,
  ResumenUsuario,
  Venta,
} from "@/types";

const COLECCION = "ventas";

const METODOS_VALIDOS: MetodoPago[] = [
  "efectivo_bs",
  "efectivo_usd",
  "pago_movil",
  "transferencia_bs",
  "zelle",
  "binance",
  "punto_venta",
];

function mapearItem(datos: Record<string, unknown>): ItemVenta {
  return {
    bateriaId: String(datos.bateriaId ?? ""),
    codigo: String(datos.codigo ?? ""),
    descripcion: String(datos.descripcion ?? ""),
    cantidad: Number(datos.cantidad ?? 0),
    precioUnitario: Number(datos.precioUnitario ?? 0),
    subtotal: Number(datos.subtotal ?? 0),
  };
}

function mapearVenta(id: string, datos: Record<string, unknown>): Venta {
  const cliente = datos.cliente as Record<string, unknown> | null | undefined;
  const vendedor = (datos.vendedor ?? {}) as Record<string, unknown>;
  const anulacion = datos.anulacion as
    Record<string, unknown> | null | undefined;
  const items = Array.isArray(datos.items)
    ? datos.items.map((item) => mapearItem(item as Record<string, unknown>))
    : [];
  const metodoPago = METODOS_VALIDOS.includes(datos.metodoPago as MetodoPago)
    ? (datos.metodoPago as MetodoPago)
    : "efectivo_usd";

  return {
    id,
    numero: Number(datos.numero ?? 0),
    fecha: (datos.fecha as TipoTimestamp | null) ?? null,
    cliente: cliente
      ? {
          nombre: String(cliente.nombre ?? ""),
          telefono: String(cliente.telefono ?? ""),
        }
      : null,
    items,
    subtotal: Number(datos.subtotal ?? 0),
    descuento: Number(datos.descuento ?? 0),
    total: Number(datos.total ?? 0),
    tasaBCV: Number(datos.tasaBCV ?? 0),
    totalBs: Number(datos.totalBs ?? 0),
    metodoPago,
    incluyeInstalacion: datos.incluyeInstalacion === true,
    recibioBateriaUsada: datos.recibioBateriaUsada === true,
    vendedor: {
      uid: String(vendedor.uid ?? ""),
      nombre: String(vendedor.nombre ?? ""),
    },
    notas: datos.notas == null ? null : String(datos.notas),
    estado: datos.estado === "anulada" ? "anulada" : "completada",
    anulacion: anulacion
      ? {
          uid: String(anulacion.uid ?? ""),
          nombre: String(anulacion.nombre ?? ""),
          fecha: (anulacion.fecha as TipoTimestamp | null) ?? null,
          motivo: String(anulacion.motivo ?? ""),
        }
      : null,
  };
}

export type ResultadoVenta = {
  id: string;
  numero: number;
  total: number;
  totalBs: number;
  tasaBCV: number;
};

/**
 * Registra una venta en una sola transacción atómica: valida stock, descuenta
 * las baterías, crea los movimientos de salida, incrementa el consecutivo y
 * guarda la venta con el snapshot de la tasa BCV (04_Arquitectura §3).
 */
export async function registrarVenta(
  datos: DatosVenta,
  usuario: ResumenUsuario,
): Promise<ResultadoVenta> {
  const validado = esquemaVenta.safeParse(datos);
  if (!validado.success) {
    throw new Error("Los datos de la venta no son válidos.");
  }
  const {
    items,
    descuento,
    clienteNombre,
    clienteTelefono,
    metodoPago,
    incluyeInstalacion,
    recibioBateriaUsada,
    notas,
  } = validado.data;

  const identificadores = items.map((item) => item.bateriaId);
  if (new Set(identificadores).size !== identificadores.length) {
    throw new Error("Cada batería debe aparecer una sola vez en la venta.");
  }

  return runTransaction(db, async (transaccion) => {
    const contadorRef = doc(db, "contadores", "ventas");
    const tasaRef = doc(db, "configuracion", "tasa");

    // Todas las lecturas ocurren antes de cualquier escritura.
    const [contadorSnap, tasaSnap] = await Promise.all([
      transaccion.get(contadorRef),
      transaccion.get(tasaRef),
    ]);

    if (!contadorSnap.exists()) {
      throw new Error(
        "El consecutivo de ventas no está inicializado. Contacta al administrador.",
      );
    }
    const tasaBCV = Number(tasaSnap.data()?.valor ?? 0);
    if (!Number.isFinite(tasaBCV) || tasaBCV <= 0) {
      throw new Error(
        "No hay una tasa BCV válida configurada. Corrige la tasa e inténtalo de nuevo.",
      );
    }

    const referencias = items.map((item) =>
      doc(db, "baterias", item.bateriaId),
    );
    const instantaneas = await Promise.all(
      referencias.map((referencia) => transaccion.get(referencia)),
    );

    const lineas = items.map((item, indice) => {
      const instantanea = instantaneas[indice];
      if (!instantanea) {
        throw new Error("Una de las baterías de la venta ya no existe.");
      }
      const bateria = instantanea.data() as Record<string, unknown>;
      const codigo = String(bateria.codigo ?? "");
      if (bateria.activo === false) {
        throw new Error(`La batería ${codigo} está desactivada.`);
      }
      const stockAntes = Number(bateria.stock ?? 0);
      if (item.cantidad > stockAntes) {
        throw new Error(
          stockAntes === 0
            ? `La batería ${codigo} está agotada.`
            : `Stock insuficiente de ${codigo}: quedan ${stockAntes} unidades.`,
        );
      }
      const precioUnitario = Number(bateria.precioVenta ?? 0);
      if (!(precioUnitario > 0)) {
        throw new Error(
          `La batería ${codigo} no tiene un precio de venta válido.`,
        );
      }
      const descripcion = `${String(bateria.marca ?? "")} ${String(
        bateria.modelo ?? "",
      )} · ${Number(bateria.amperaje ?? 0)} Ah`;
      return {
        referencia: referencias[indice],
        bateria,
        item: {
          bateriaId: item.bateriaId,
          codigo,
          descripcion,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal: item.cantidad * precioUnitario,
        } satisfies ItemVenta,
        stockAntes,
        stockDespues: stockAntes - item.cantidad,
      };
    });

    const subtotal = lineas.reduce(
      (suma, linea) => suma + linea.item.subtotal,
      0,
    );
    if (descuento > subtotal) {
      throw new Error("El descuento no puede superar el subtotal de la venta.");
    }
    const total = subtotal - descuento;
    const totalBs = total * tasaBCV;
    const numero = Number(contadorSnap.data()?.valor ?? 0) + 1;
    const ventaRef = doc(collection(db, COLECCION));

    for (const linea of lineas) {
      transaccion.update(linea.referencia, {
        stock: linea.stockDespues,
        stockBajo: calcularStockBajo(
          linea.stockDespues,
          Number(linea.bateria.stockMinimo ?? 0),
        ),
        actualizadoEn: serverTimestamp(),
      });

      transaccion.set(doc(collection(db, "movimientos")), {
        fecha: serverTimestamp(),
        tipo: "salida",
        bateriaId: linea.item.bateriaId,
        bateriaResumen: {
          codigo: linea.item.codigo,
          marca: String(linea.bateria.marca ?? ""),
          modelo: String(linea.bateria.modelo ?? ""),
        },
        // Convención del proyecto: cantidad firmada (salida negativa).
        cantidad: -linea.item.cantidad,
        stockAntes: linea.stockAntes,
        stockDespues: linea.stockDespues,
        motivo: `Venta N.º ${numero}`,
        ventaId: ventaRef.id,
        usuario,
      });
    }

    transaccion.update(contadorRef, { valor: numero });

    transaccion.set(ventaRef, {
      numero,
      fecha: serverTimestamp(),
      cliente: clienteNombre
        ? { nombre: clienteNombre, telefono: clienteTelefono }
        : null,
      items: lineas.map((linea) => linea.item),
      subtotal,
      descuento,
      total,
      tasaBCV,
      totalBs,
      metodoPago,
      incluyeInstalacion,
      recibioBateriaUsada,
      vendedor: { uid: usuario.uid, nombre: usuario.nombre },
      notas: notas === "" ? null : notas,
      estado: "completada",
      anulacion: null,
    });

    return { id: ventaRef.id, numero, total, totalBs, tasaBCV };
  });
}

export type FiltrosVentas = {
  estado?: EstadoVenta | "todas";
  vendedorUid?: string | "todos";
  desde?: Date | null;
  hasta?: Date | null;
  cantidad?: number;
  cursor?: QueryDocumentSnapshot | null;
};

export type PaginaVentas = {
  ventas: Venta[];
  /** Cursor para pedir la página siguiente (`null` si ya no hay más). */
  ultimo: QueryDocumentSnapshot | null;
};

/** Historial de ventas paginado por fecha descendente, con filtros. */
export async function listarVentas(
  filtros: FiltrosVentas = {},
): Promise<PaginaVentas> {
  const {
    estado = "todas",
    vendedorUid = "todos",
    desde = null,
    hasta = null,
    cantidad = 10,
    cursor = null,
  } = filtros;

  const condiciones: QueryConstraint[] = [];
  if (estado !== "todas") condiciones.push(where("estado", "==", estado));
  if (vendedorUid !== "todos") {
    condiciones.push(where("vendedor.uid", "==", vendedorUid));
  }
  if (desde) condiciones.push(where("fecha", ">=", Timestamp.fromDate(desde)));
  if (hasta) condiciones.push(where("fecha", "<", Timestamp.fromDate(hasta)));

  const consulta = query(
    collection(db, COLECCION),
    ...condiciones,
    orderBy("fecha", "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(cantidad),
  );
  const instantanea = await getDocs(consulta);
  const documentos = instantanea.docs;

  return {
    ventas: documentos.map((documento) =>
      mapearVenta(documento.id, documento.data()),
    ),
    ultimo:
      documentos.length === cantidad
        ? (documentos[documentos.length - 1] ?? null)
        : null,
  };
}

/** Lee una venta por su ID (comprobante interno). */
export async function obtenerVenta(id: string): Promise<Venta | null> {
  const instantanea = await getDoc(doc(db, COLECCION, id));
  return instantanea.exists()
    ? mapearVenta(instantanea.id, instantanea.data())
    : null;
}

/**
 * Anula una venta completada: deja auditoría, repone el stock y crea un
 * movimiento de devolución por cada ítem. La venta original no se borra.
 */
export async function anularVenta(
  ventaId: string,
  motivo: string,
  usuario: ResumenUsuario,
): Promise<void> {
  const validado = esquemaAnulacionVenta.safeParse({ motivo });
  if (!validado.success) {
    throw new Error("Indica el motivo de la anulación (mínimo 3 caracteres).");
  }
  const motivoLimpio = validado.data.motivo;

  await runTransaction(db, async (transaccion) => {
    const ventaRef = doc(db, COLECCION, ventaId);
    const ventaSnap = await transaccion.get(ventaRef);
    if (!ventaSnap.exists()) throw new Error("La venta ya no existe.");

    const venta = ventaSnap.data() as Record<string, unknown>;
    if (venta.estado === "anulada") {
      throw new Error("Esta venta ya está anulada.");
    }
    const numero = Number(venta.numero ?? 0);
    const items = Array.isArray(venta.items)
      ? (venta.items as Record<string, unknown>[])
      : [];
    if (items.length === 0) {
      throw new Error("La venta no tiene ítems para reponer el stock.");
    }

    // Lecturas antes de escribir: batería de cada ítem.
    const referencias = items.map((item) =>
      doc(db, "baterias", String(item.bateriaId ?? "")),
    );
    const instantaneas = await Promise.all(
      referencias.map((referencia) => transaccion.get(referencia)),
    );

    const reposiciones = referencias.map((referencia, indice) => {
      const instantanea = instantaneas[indice];
      if (!instantanea) {
        throw new Error(
          "No se encontró una batería de la venta para reponer el stock.",
        );
      }
      const bateria = instantanea.data() as Record<string, unknown>;
      const cantidad = Number(items[indice]?.cantidad ?? 0);
      const stockAntes = Number(bateria.stock ?? 0);
      return {
        referencia,
        bateria,
        bateriaId: String(items[indice]?.bateriaId ?? ""),
        codigo: String(items[indice]?.codigo ?? bateria.codigo ?? ""),
        cantidad,
        stockAntes,
        stockDespues: stockAntes + cantidad,
      };
    });

    transaccion.update(ventaRef, {
      estado: "anulada",
      anulacion: {
        uid: usuario.uid,
        nombre: usuario.nombre,
        fecha: serverTimestamp(),
        motivo: motivoLimpio,
      },
    });

    for (const reposicion of reposiciones) {
      transaccion.update(reposicion.referencia, {
        stock: reposicion.stockDespues,
        stockBajo: calcularStockBajo(
          reposicion.stockDespues,
          Number(reposicion.bateria.stockMinimo ?? 0),
        ),
        actualizadoEn: serverTimestamp(),
      });

      transaccion.set(doc(collection(db, "movimientos")), {
        fecha: serverTimestamp(),
        tipo: "devolucion",
        bateriaId: reposicion.bateriaId,
        bateriaResumen: {
          codigo: reposicion.codigo,
          marca: String(reposicion.bateria.marca ?? ""),
          modelo: String(reposicion.bateria.modelo ?? ""),
        },
        cantidad: reposicion.cantidad,
        stockAntes: reposicion.stockAntes,
        stockDespues: reposicion.stockDespues,
        motivo: `Anulación venta N.º ${numero}`,
        ventaId,
        usuario,
      });
    }
  });
}

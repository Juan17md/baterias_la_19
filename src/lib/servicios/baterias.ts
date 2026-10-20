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
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import {
  esquemaDatosBateria,
  esquemaNuevaBateria,
  type DatosBateria,
  type DatosNuevaBateria,
} from "@/lib/validaciones/baterias";
import type { Bateria, EstadoStock, ResumenUsuario } from "@/types";

const COLECCION = "baterias";

/** `stock <= stockMinimo` (campo denormalizado del documento). */
export function calcularStockBajo(stock: number, stockMinimo: number): boolean {
  return stock <= stockMinimo;
}

/** Estado de stock para badges y filtros (06_Design_System §3.3). */
export function calcularEstadoStock(
  stock: number,
  stockMinimo: number,
): EstadoStock {
  if (stock === 0) return "agotado";
  return stock <= stockMinimo ? "bajo" : "en_stock";
}

export function mapearBateria(
  id: string,
  datos: Record<string, unknown>,
): Bateria {
  return {
    id,
    codigo: String(datos.codigo ?? ""),
    marca: String(datos.marca ?? ""),
    modelo: String(datos.modelo ?? ""),
    voltaje: Number(datos.voltaje ?? 0),
    amperaje: Number(datos.amperaje ?? 0),
    precioCompra: Number(datos.precioCompra ?? 0),
    precioVenta: Number(datos.precioVenta ?? 0),
    stock: Number(datos.stock ?? 0),
    stockMinimo: Number(datos.stockMinimo ?? 0),
    stockBajo: datos.stockBajo === true,
    proveedor: datos.proveedor == null ? null : String(datos.proveedor),
    garantiaMeses: Number(datos.garantiaMeses ?? 0),
    activo: datos.activo !== false,
    imagenUrl: datos.imagenUrl == null ? null : String(datos.imagenUrl),
    creadoEn: (datos.creadoEn as Timestamp | null) ?? null,
    actualizadoEn: (datos.actualizadoEn as Timestamp | null) ?? null,
  };
}

/**
 * Lista el catálogo completo ordenado por código. El catálogo de una tienda es
 * acotado, por lo que se lee una vez y la búsqueda/filtros/paginación se hacen
 * en el cliente (ver docs-obsidian/04_Arquitectura §8).
 */
export async function listarBaterias(): Promise<Bateria[]> {
  const consulta = query(collection(db, COLECCION), orderBy("codigo"));
  const instantanea = await getDocs(consulta);
  return instantanea.docs.map((documento) =>
    mapearBateria(documento.id, documento.data()),
  );
}

/** Lee una batería por su ID. */
export async function obtenerBateria(id: string): Promise<Bateria | null> {
  const instantanea = await getDoc(doc(db, COLECCION, id));
  return instantanea.exists()
    ? mapearBateria(instantanea.id, instantanea.data())
    : null;
}

/** Comprueba que el código (SKU) no esté en uso por otra batería. */
export async function codigoEstaDisponible(
  codigo: string,
  excluirId?: string,
): Promise<boolean> {
  const consulta = query(
    collection(db, COLECCION),
    where("codigo", "==", codigo.trim().toUpperCase()),
    limit(1),
  );
  const instantanea = await getDocs(consulta);
  if (instantanea.empty) return true;
  return instantanea.docs[0]?.id === excluirId;
}

function armarCampos(datos: DatosBateria) {
  return {
    codigo: datos.codigo,
    marca: datos.marca,
    modelo: datos.modelo,
    voltaje: datos.voltaje,
    amperaje: datos.amperaje,
    precioCompra: datos.precioCompra,
    precioVenta: datos.precioVenta,
    stockMinimo: datos.stockMinimo,
    proveedor: datos.proveedor ?? null,
    garantiaMeses: datos.garantiaMeses,
  };
}

/** Crea una batería con stock 0 y registra la entrada inicial si aplica. */
export async function crearBateria(
  datos: DatosNuevaBateria,
  usuario: ResumenUsuario,
): Promise<string> {
  const validado = esquemaNuevaBateria.safeParse(datos);
  if (!validado.success)
    throw new Error("Los datos de la batería no son válidos.");
  const valores = validado.data;

  const disponible = await codigoEstaDisponible(valores.codigo);
  if (!disponible)
    throw new Error(`Ya existe una batería con el código ${valores.codigo}.`);

  const referencia = doc(collection(db, COLECCION));
  await setDoc(referencia, {
    ...armarCampos(valores),
    stock: 0,
    stockBajo: true,
    activo: true,
    imagenUrl: null,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });

  if (valores.stockInicial > 0) {
    await registrarEntrada(
      referencia.id,
      valores.stockInicial,
      "Stock inicial",
      usuario,
    );
  }

  return referencia.id;
}

/** Actualiza los datos de una batería (el stock solo cambia por movimientos). */
export async function actualizarBateria(
  id: string,
  datos: DatosBateria,
): Promise<void> {
  const validado = esquemaDatosBateria.safeParse(datos);
  if (!validado.success)
    throw new Error("Los datos de la batería no son válidos.");

  const disponible = await codigoEstaDisponible(validado.data.codigo, id);
  if (!disponible)
    throw new Error(
      `Ya existe otra batería con el código ${validado.data.codigo}.`,
    );

  await updateDoc(doc(db, COLECCION, id), {
    ...armarCampos(validado.data),
    actualizadoEn: serverTimestamp(),
  });
}

/** Soft delete: activa o desactiva un producto (nunca se borra). */
export async function cambiarActivoBateria(
  id: string,
  activo: boolean,
): Promise<void> {
  await updateDoc(doc(db, COLECCION, id), {
    activo,
    actualizadoEn: serverTimestamp(),
  });
}

/** Registra una entrada de mercancía (transacción: stock + movimiento). */
export async function registrarEntrada(
  bateriaId: string,
  cantidad: number,
  motivo: string,
  usuario: ResumenUsuario,
): Promise<void> {
  await runTransaction(db, async (transaccion) => {
    const referencia = doc(db, COLECCION, bateriaId);
    const instantanea = await transaccion.get(referencia);
    if (!instantanea.exists()) throw new Error("La batería ya no existe.");

    const datos = instantanea.data();
    const stockAntes = Number(datos.stock ?? 0);
    const stockDespues = stockAntes + cantidad;

    transaccion.update(referencia, {
      stock: stockDespues,
      stockBajo: calcularStockBajo(
        stockDespues,
        Number(datos.stockMinimo ?? 0),
      ),
      actualizadoEn: serverTimestamp(),
    });

    transaccion.set(doc(collection(db, "movimientos")), {
      fecha: serverTimestamp(),
      tipo: "entrada",
      bateriaId,
      bateriaResumen: {
        codigo: String(datos.codigo ?? ""),
        marca: String(datos.marca ?? ""),
        modelo: String(datos.modelo ?? ""),
      },
      cantidad,
      stockAntes,
      stockDespues,
      motivo: motivo.trim(),
      ventaId: null,
      usuario,
    });
  });
}

/** Fija el stock al conteo físico, dejando un movimiento de ajuste auditable. */
export async function ajustarStock(
  bateriaId: string,
  nuevoStock: number,
  motivo: string,
  usuario: ResumenUsuario,
): Promise<void> {
  await runTransaction(db, async (transaccion) => {
    const referencia = doc(db, COLECCION, bateriaId);
    const instantanea = await transaccion.get(referencia);
    if (!instantanea.exists()) throw new Error("La batería ya no existe.");

    const datos = instantanea.data();
    const stockAntes = Number(datos.stock ?? 0);
    if (nuevoStock === stockAntes) {
      throw new Error("El stock no cambió: no hay nada que ajustar.");
    }

    transaccion.update(referencia, {
      stock: nuevoStock,
      stockBajo: calcularStockBajo(nuevoStock, Number(datos.stockMinimo ?? 0)),
      actualizadoEn: serverTimestamp(),
    });

    transaccion.set(doc(collection(db, "movimientos")), {
      fecha: serverTimestamp(),
      tipo: "ajuste",
      bateriaId,
      bateriaResumen: {
        codigo: String(datos.codigo ?? ""),
        marca: String(datos.marca ?? ""),
        modelo: String(datos.modelo ?? ""),
      },
      // Diferencia firmada: positiva si el stock subió, negativa si bajó.
      cantidad: nuevoStock - stockAntes,
      stockAntes,
      stockDespues: nuevoStock,
      motivo: motivo.trim(),
      ventaId: null,
      usuario,
    });
  });
}

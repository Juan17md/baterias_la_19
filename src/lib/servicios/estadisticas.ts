import {
  average,
  collection,
  count,
  getAggregateFromServer,
  getDocs,
  orderBy,
  query,
  sum,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/configuracion";
import { contarDiasInclusivos, inicioDelDia, sumarDias } from "@/lib/utils";
import type {
  EstadisticasPeriodo,
  KpisEstadisticas,
  MetodoPago,
  ProductoVendido,
  PuntoVentasDia,
  RangoEstadisticas,
  ResumenMetodoPago,
  Venta,
} from "@/types";
import { mapearVenta } from "./ventas";

const COLECCION_VENTAS = "ventas";
const FORMATO_DIA = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "short",
});

/** Límite de días por consulta para acotar lecturas y el tamaño de la serie. */
export const MAXIMO_DIAS_ESTADISTICAS = 366;

/** Clave local `YYYY-MM-DD` para agrupar ventas por día. */
function claveDia(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function etiquetaDia(fecha: Date): string {
  return FORMATO_DIA.format(fecha);
}

/** Total en bolívares guardado en la venta, con respaldo en la tasa histórica. */
function totalEnBs(venta: Venta): number {
  const totalGuardado = Number(venta.totalBs);
  if (Number.isFinite(totalGuardado) && totalGuardado > 0) {
    return totalGuardado;
  }
  return venta.tasaBCV > 0 ? venta.total * venta.tasaBCV : 0;
}

function unidadesDeVenta(venta: Venta): number {
  return venta.items.reduce((total, item) => total + item.cantidad, 0);
}

/** Calcula los KPIs de una lista de ventas ya cargadas. */
export function calcularKpis(ventas: Venta[]): KpisEstadisticas {
  const ingresosUsd = ventas.reduce((total, venta) => total + venta.total, 0);
  const ingresosBs = ventas.reduce(
    (total, venta) => total + totalEnBs(venta),
    0,
  );
  const unidades = ventas.reduce(
    (total, venta) => total + unidadesDeVenta(venta),
    0,
  );

  return {
    ingresosUsd,
    ingresosBs,
    ventas: ventas.length,
    unidades,
    ticketPromedio: ventas.length > 0 ? ingresosUsd / ventas.length : 0,
  };
}

/**
 * Construye la serie diaria completa del rango (incluye días sin ventas con
 * ceros para que la gráfica no pierda continuidad).
 */
export function calcularSerieDiaria(
  ventas: Venta[],
  desde: Date,
  hasta: Date,
): PuntoVentasDia[] {
  const puntos = new Map<string, PuntoVentasDia>();
  let cursor = inicioDelDia(desde);
  const limite = inicioDelDia(hasta);

  while (cursor.getTime() <= limite.getTime()) {
    const clave = claveDia(cursor);
    puntos.set(clave, {
      fecha: clave,
      etiqueta: etiquetaDia(cursor),
      totalUsd: 0,
      totalBs: 0,
      ventas: 0,
      unidades: 0,
    });
    cursor = sumarDias(cursor, 1);
  }

  for (const venta of ventas) {
    if (!venta.fecha) continue;
    const punto = puntos.get(claveDia(venta.fecha.toDate()));
    if (!punto) continue;

    punto.totalUsd += venta.total;
    punto.totalBs += totalEnBs(venta);
    punto.ventas += 1;
    punto.unidades += unidadesDeVenta(venta);
  }

  return [...puntos.values()];
}

/** Agrupa los ítems vendidos y devuelve el top por unidades. */
export function calcularTopProductos(
  ventas: Venta[],
  limite = 5,
): ProductoVendido[] {
  const productos = new Map<string, ProductoVendido>();

  for (const venta of ventas) {
    for (const item of venta.items) {
      const existente = productos.get(item.bateriaId) ?? {
        bateriaId: item.bateriaId,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidades: 0,
        subtotal: 0,
      };

      existente.unidades += item.cantidad;
      existente.subtotal += item.subtotal;
      productos.set(item.bateriaId, existente);
    }
  }

  return [...productos.values()]
    .sort((a, b) => b.unidades - a.unidades || b.subtotal - a.subtotal)
    .slice(0, limite);
}

/** Distribución de ingresos por método de pago, ordenada de mayor a menor. */
export function calcularMetodosPago(ventas: Venta[]): ResumenMetodoPago[] {
  const metodos = new Map<MetodoPago, { totalUsd: number; ventas: number }>();

  for (const venta of ventas) {
    const existente = metodos.get(venta.metodoPago) ?? {
      totalUsd: 0,
      ventas: 0,
    };
    existente.totalUsd += venta.total;
    existente.ventas += 1;
    metodos.set(venta.metodoPago, existente);
  }

  const totalBase = ventas.reduce((total, venta) => total + venta.total, 0);

  return [...metodos.entries()]
    .map(([metodo, datos]) => ({
      metodo,
      totalUsd: datos.totalUsd,
      ventas: datos.ventas,
      porcentaje: totalBase > 0 ? (datos.totalUsd / totalBase) * 100 : 0,
    }))
    .sort((a, b) => b.totalUsd - a.totalUsd);
}

/**
 * Obtiene KPIs, serie diaria, top de productos y métodos de pago de un rango.
 *
 * `count`, `sum` y `average` se resuelven en una única consulta de agregación.
 * La lectura de documentos se usa únicamente para los desgloses que Firestore
 * no puede agrupar (ítems y métodos de pago), siguiendo [[04_Arquitectura]] §8.
 */
export async function obtenerEstadisticas(
  rango: RangoEstadisticas,
): Promise<EstadisticasPeriodo> {
  const desde = inicioDelDia(rango.desde);
  const hasta = inicioDelDia(rango.hasta);

  if (
    !Number.isFinite(desde.getTime()) ||
    !Number.isFinite(hasta.getTime()) ||
    hasta.getTime() < desde.getTime()
  ) {
    throw new Error("El rango de fechas no es válido.");
  }

  if (contarDiasInclusivos(desde, hasta) > MAXIMO_DIAS_ESTADISTICAS) {
    throw new Error(`El rango máximo es de ${MAXIMO_DIAS_ESTADISTICAS} días.`);
  }

  const finExclusivo = sumarDias(hasta, 1);
  const consulta = query(
    collection(db, COLECCION_VENTAS),
    where("estado", "==", "completada"),
    where("fecha", ">=", Timestamp.fromDate(desde)),
    where("fecha", "<", Timestamp.fromDate(finExclusivo)),
    // Misma dirección que el índice (estado ASC, fecha DESC) ya desplegado.
    orderBy("fecha", "desc"),
  );

  const [agregados, instantanea] = await Promise.all([
    getAggregateFromServer(consulta, {
      conteo: count(),
      ingresos: sum("total"),
      promedio: average("total"),
    }),
    getDocs(consulta),
  ]);

  const { conteo, ingresos, promedio } = agregados.data();
  const ventas = instantanea.docs.map((documento) =>
    mapearVenta(documento.id, documento.data()),
  );
  const calculados = calcularKpis(ventas);
  const ingresosUsd = Number(ingresos ?? calculados.ingresosUsd);

  return {
    kpis: {
      ...calculados,
      ingresosUsd,
      ventas: Number(conteo ?? calculados.ventas),
      ticketPromedio: Number(promedio ?? calculados.ticketPromedio),
    },
    serie: calcularSerieDiaria(ventas, desde, hasta),
    productos: calcularTopProductos(ventas),
    metodosPago: calcularMetodosPago(ventas),
  };
}

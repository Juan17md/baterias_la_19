import { Timestamp } from "firebase/firestore";
import type {
  CuotaFinanciamiento,
  EstadoCuota,
  EstadoFinanciamiento,
  EstadoFinanciamientoVisible,
  LiquidacionCashea,
  ModalidadPago,
} from "@/types";

/** Cuotas permitidas por Cashea. */
export const CUOTAS_CASHEA = [1, 3, 6, 9, 12] as const;

/** Cashea siempre cobra cada 14 días. */
export const DIAS_CASHEA = 14;

/** Límite técnico para acotar el arreglo de cuotas de «Por la tienda». */
export const MAXIMO_CUOTAS_TIENDA = 60;

/** Límite técnico del plazo configurable de «Por la tienda». */
export const MAXIMO_DIAS_ENTRE_CUOTAS = 365;

/** Redondea a dos decimales (centavos) sin arrastrar errores de coma flotante. */
export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function inicioDelDiaLocal(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function sumarDiasLocales(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/**
 * Devuelve el siguiente lunes a las 00:00 locales posterior a la fecha dada.
 * Se usa para la liquidación semanal de Cashea.
 */
export function calcularSiguienteLunes(fecha: Date): Date {
  const base = inicioDelDiaLocal(fecha);
  const diaSemana = base.getDay(); // 0 = domingo, 1 = lunes
  let dias = (1 - diaSemana + 7) % 7;
  if (dias === 0) dias = 7;
  return sumarDiasLocales(base, dias);
}

export type EntradaPlanFinanciamiento = {
  modalidad: Exclude<ModalidadPago, "contado">;
  totalVenta: number;
  inicial: number;
  recargo?: number;
  numeroCuotas: number;
  diasEntreCuotas: number;
  fechaVenta: Date;
};

export type PlanFinanciamientoCalculado = {
  montoFinanciado: number;
  montoCuota: number;
  cuotas: CuotaFinanciamiento[];
  fechaPrimeraCuota: Timestamp;
  fechaUltimaCuota: Timestamp;
  liquidacion: LiquidacionCashea | null;
};

function validarEntrada(entrada: EntradaPlanFinanciamiento): void {
  const {
    modalidad,
    totalVenta,
    inicial,
    recargo = 0,
    numeroCuotas,
    diasEntreCuotas,
    fechaVenta,
  } = entrada;

  if (!Number.isFinite(totalVenta) || totalVenta <= 0) {
    throw new Error("El total de la venta debe ser mayor a cero.");
  }
  if (!Number.isFinite(inicial) || inicial < 0) {
    throw new Error("La inicial no puede ser negativa.");
  }
  if (inicial >= totalVenta) {
    throw new Error("La inicial debe ser menor que el total de la venta.");
  }
  if (!Number.isFinite(recargo) || recargo < 0) {
    throw new Error("El recargo no puede ser negativo.");
  }
  if (!Number.isInteger(numeroCuotas) || numeroCuotas < 1) {
    throw new Error("La cantidad de cuotas debe ser al menos 1.");
  }
  if (
    !Number.isInteger(diasEntreCuotas) ||
    diasEntreCuotas < 1 ||
    diasEntreCuotas > MAXIMO_DIAS_ENTRE_CUOTAS
  ) {
    throw new Error(
      `El plazo entre cuotas debe estar entre 1 y ${MAXIMO_DIAS_ENTRE_CUOTAS} días.`,
    );
  }
  if (Number.isNaN(fechaVenta.getTime())) {
    throw new Error("La fecha de la venta no es válida.");
  }

  if (modalidad === "cashea") {
    if (!(CUOTAS_CASHEA as readonly number[]).includes(numeroCuotas)) {
      throw new Error("Cashea solo permite 1, 3, 6, 9 o 12 cuotas.");
    }
    if (diasEntreCuotas !== DIAS_CASHEA) {
      throw new Error("Cashea siempre usa 14 días entre cuotas.");
    }
    if (recargo !== 0) {
      throw new Error("Cashea no permite recargos.");
    }
  }

  if (modalidad === "tienda" && numeroCuotas > MAXIMO_CUOTAS_TIENDA) {
    throw new Error(`El máximo de cuotas es ${MAXIMO_CUOTAS_TIENDA}.`);
  }

  // Decisión de negocio (2026-11-02): la tienda no aplica recargos ni interés.
  if (modalidad === "tienda" && recargo !== 0) {
    throw new Error("Las ventas «Por la tienda» no aplican recargos.");
  }
}

/**
 * Calcula el calendario de cuotas y la liquidación de Cashea a partir del
 * total de la venta. Es la fuente de verdad: el servicio siempre recalcula y
 * nunca confía en el calendario que muestra el cliente.
 */
export function calcularPlanFinanciamiento(
  entrada: EntradaPlanFinanciamiento,
): PlanFinanciamientoCalculado {
  validarEntrada(entrada);
  const {
    modalidad,
    totalVenta,
    inicial,
    recargo = 0,
    numeroCuotas,
    diasEntreCuotas,
    fechaVenta,
  } = entrada;

  const montoFinanciado = redondear2(totalVenta - inicial + recargo);
  if (montoFinanciado <= 0) {
    throw new Error("El monto financiado debe ser mayor a cero.");
  }
  if (montoFinanciado < numeroCuotas * 0.01) {
    throw new Error(
      "El monto financiado es demasiado bajo para la cantidad de cuotas.",
    );
  }

  // La base se trunca a centavos para que la última cuota absorba el redondeo
  // sin quedar en cero ni en negativo.
  const cuotaBase = Math.floor((montoFinanciado / numeroCuotas) * 100) / 100;
  const baseFecha = inicioDelDiaLocal(fechaVenta);
  const cuotas: CuotaFinanciamiento[] = [];
  let acumulado = 0;

  for (let indice = 1; indice <= numeroCuotas; indice += 1) {
    const monto =
      indice === numeroCuotas
        ? redondear2(montoFinanciado - acumulado)
        : cuotaBase;
    acumulado = redondear2(acumulado + monto);
    cuotas.push({
      numero: indice,
      monto,
      fechaVencimiento: Timestamp.fromDate(
        sumarDiasLocales(baseFecha, diasEntreCuotas * indice),
      ),
      estado: modalidad === "cashea" ? "informativa" : "pendiente",
      pagoId: null,
    });
  }

  const liquidacion: LiquidacionCashea | null =
    modalidad === "cashea"
      ? {
          montoEsperado: montoFinanciado,
          fechaEsperada: Timestamp.fromDate(calcularSiguienteLunes(fechaVenta)),
          estado: "pendiente",
          montoRecibido: null,
          fechaRecibida: null,
          comision: 0,
          referencia: null,
        }
      : null;

  return {
    montoFinanciado,
    montoCuota: cuotaBase,
    cuotas,
    fechaPrimeraCuota: cuotas[0].fechaVencimiento as Timestamp,
    fechaUltimaCuota: cuotas[cuotas.length - 1].fechaVencimiento as Timestamp,
    liquidacion,
  };
}

export type DatosEstadoFinanciamiento = {
  modalidad: Exclude<ModalidadPago, "contado">;
  estado: EstadoFinanciamiento;
  cuotas: CuotaFinanciamiento[];
  liquidacion: LiquidacionCashea | null;
};

/** Deriva el estado visible (`vencido` incluido) sin escribir en Firestore. */
export function calcularEstadoFinanciamiento(
  datos: DatosEstadoFinanciamiento,
  hoy: Date = new Date(),
): EstadoFinanciamientoVisible {
  if (datos.estado === "liquidado") return "liquidado";
  if (datos.estado === "pagado") return "pagado";

  if (datos.modalidad === "cashea") {
    if (datos.liquidacion?.estado === "recibida") return "liquidado";
    const esperada = datos.liquidacion?.fechaEsperada?.toDate();
    if (esperada && esperada < inicioDelDiaLocal(hoy)) return "vencido";
    return "activo";
  }

  const pendientes = datos.cuotas.filter(
    (cuota) => cuota.estado !== "pagada" && cuota.estado !== "informativa",
  );
  if (pendientes.length === 0) return "pagado";

  const hoyInicio = inicioDelDiaLocal(hoy);
  const tieneVencida = pendientes.some((cuota) => {
    if (cuota.estado === "vencida") return true;
    return cuota.fechaVencimiento
      ? cuota.fechaVencimiento.toDate() < hoyInicio
      : false;
  });
  return tieneVencida ? "vencido" : "activo";
}

/** Recalcula una cuota al leerla para mostrar «vencida» sin persistirlo. */
export function derivarEstadoCuota(
  cuota: CuotaFinanciamiento,
  hoy: Date = new Date(),
): EstadoCuota {
  if (cuota.estado === "pagada" || cuota.estado === "informativa") {
    return cuota.estado;
  }
  if (cuota.estado === "vencida") return "vencida";
  const vencimiento = cuota.fechaVencimiento?.toDate();
  if (vencimiento && vencimiento < inicioDelDiaLocal(hoy)) return "vencida";
  return "pendiente";
}

export type DatosSaldoFinanciamiento = {
  modalidad: Exclude<ModalidadPago, "contado">;
  cuotas: CuotaFinanciamiento[];
  liquidacion: LiquidacionCashea | null;
};

/** Saldo por cobrar (tienda) o por liquidar (Cashea). */
export function calcularSaldoPendiente(
  datos: DatosSaldoFinanciamiento,
): number {
  if (datos.modalidad === "cashea") {
    return datos.liquidacion?.estado === "recibida"
      ? 0
      : (datos.liquidacion?.montoEsperado ?? 0);
  }
  return redondear2(
    datos.cuotas
      .filter((cuota) => cuota.estado !== "pagada")
      .reduce((suma, cuota) => suma + cuota.monto, 0),
  );
}

/** Primera cuota pendiente de «Por la tienda» (Cashea no tiene cobro propio). */
export function calcularProximaCuota(
  cuotas: CuotaFinanciamiento[],
): CuotaFinanciamiento | null {
  return (
    cuotas.find(
      (cuota) => cuota.estado !== "pagada" && cuota.estado !== "informativa",
    ) ?? null
  );
}

import { z } from "zod";
import {
  CUOTAS_CASHEA,
  DIAS_CASHEA,
  MAXIMO_CUOTAS_TIENDA,
  MAXIMO_DIAS_ENTRE_CUOTAS,
} from "@/lib/dominio/financiamientos";
import { METODOS_PAGO } from "@/lib/validaciones/metodos-pago";

/** Convierte texto de formularios a número (acepta coma decimal). */
function aNumero(valor: unknown): unknown {
  if (typeof valor === "string") {
    const limpio = valor.trim().replace(",", ".");
    return limpio === "" ? Number.NaN : Number(limpio);
  }
  return valor;
}

/** Acepta un recargo vacío como 0 (campo opcional del formulario). */
const recargoOpcional = z.preprocess(
  (valor) =>
    typeof valor === "string" && valor.trim() === "" ? 0 : aNumero(valor),
  z
    .number({ error: "Indica el recargo en $" })
    .min(0, "El recargo no puede ser negativo")
    .default(0),
);

/**
 * Plan que captura el modal de venta. El cálculo definitivo se hace en el
 * servicio con `calcularPlanFinanciamiento`; aquí solo se valida la forma.
 */
export const esquemaPlanFinanciamiento = z.object({
  inicial: z.preprocess(
    aNumero,
    z
      .number({ error: "Indica la inicial en $" })
      .min(0, "La inicial no puede ser negativa"),
  ),
  numeroCuotas: z.preprocess(
    aNumero,
    z
      .number({ error: "Indica la cantidad de cuotas" })
      .int({ error: "La cantidad de cuotas debe ser un número entero" })
      .min(1, "Debe haber al menos una cuota")
      .max(
        MAXIMO_CUOTAS_TIENDA,
        `El máximo de cuotas es ${MAXIMO_CUOTAS_TIENDA}`,
      ),
  ),
  diasEntreCuotas: z.preprocess(
    aNumero,
    z
      .number({ error: "Indica el plazo entre cuotas" })
      .int({ error: "El plazo debe ser un número entero de días" })
      .min(1, "El plazo debe ser al menos 1 día")
      .max(
        MAXIMO_DIAS_ENTRE_CUOTAS,
        `El plazo máximo es ${MAXIMO_DIAS_ENTRE_CUOTAS} días`,
      ),
  ),
  recargo: recargoOpcional,
});

export type DatosPlanFinanciamiento = z.infer<typeof esquemaPlanFinanciamiento>;

/** Cobro de una cuota completa de «Por la tienda». */
export const esquemaPagoFinanciamiento = z.object({
  cuotaNumero: z.preprocess(
    aNumero,
    z
      .number({ error: "Selecciona la cuota a cobrar" })
      .int({ error: "La cuota debe ser un número entero" })
      .positive("La cuota debe ser mayor a cero"),
  ),
  metodoPago: z.enum(METODOS_PAGO, { error: "Selecciona un método de pago" }),
  referencia: z
    .string()
    .trim()
    .max(80, "Máximo 80 caracteres")
    .optional()
    .default(""),
  nota: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .default(""),
  fecha: z.coerce.date().optional(),
});

export type DatosPagoFinanciamiento = z.infer<typeof esquemaPagoFinanciamiento>;

/** Anulación de un cobro: el motivo es obligatorio y queda auditado. */
export const esquemaAnulacionPago = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, "Escribe el motivo de la anulación")
    .max(120, "Máximo 120 caracteres"),
});

export type DatosAnulacionPago = z.infer<typeof esquemaAnulacionPago>;

/** Confirmación manual de la liquidación semanal de Cashea. */
export const esquemaLiquidacionCashea = z.object({
  montoRecibido: z.preprocess(
    aNumero,
    z
      .number({ error: "Indica el monto recibido en $" })
      .min(0, "El monto recibido no puede ser negativo"),
  ),
  fechaRecibida: z.coerce.date().optional(),
  referencia: z
    .string()
    .trim()
    .max(80, "Máximo 80 caracteres")
    .optional()
    .default(""),
});

export type DatosLiquidacionCashea = z.infer<typeof esquemaLiquidacionCashea>;

export type ErrorReglaCashea = {
  campo: "numeroCuotas" | "diasEntreCuotas" | "recargo";
  mensaje: string;
};

/** Reglas específicas de Cashea que dependen de la modalidad de la venta. */
export function validarReglasCashea(
  datos: DatosPlanFinanciamiento,
): ErrorReglaCashea[] {
  const errores: ErrorReglaCashea[] = [];
  if (!(CUOTAS_CASHEA as readonly number[]).includes(datos.numeroCuotas)) {
    errores.push({
      campo: "numeroCuotas",
      mensaje: "Cashea solo permite 1, 3, 6, 9 o 12 cuotas",
    });
  }
  if (datos.diasEntreCuotas !== DIAS_CASHEA) {
    errores.push({
      campo: "diasEntreCuotas",
      mensaje: "Cashea siempre usa 14 días entre cuotas",
    });
  }
  if (datos.recargo !== 0) {
    errores.push({
      campo: "recargo",
      mensaje: "Cashea no permite recargos",
    });
  }
  return errores;
}

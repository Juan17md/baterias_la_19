import type { MetodoPago } from "@/types";

/**
 * Métodos de pago aceptados en el mostrador. Se comparten entre ventas y
 * cobros de financiamiento para mantener una única lista de valores válidos.
 */
export const METODOS_PAGO = [
  "efectivo_bs",
  "efectivo_usd",
  "pago_movil",
  "transferencia_bs",
  "zelle",
  "binance",
  "punto_venta",
] as const satisfies readonly MetodoPago[];

/** Comprueba en tiempo de ejecución si un valor es un método de pago válido. */
export function esMetodoPago(valor: unknown): valor is MetodoPago {
  return (
    typeof valor === "string" &&
    (METODOS_PAGO as readonly string[]).includes(valor)
  );
}

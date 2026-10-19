import type { EstadoVenta, MetodoPago } from "@/types";

/** Etiquetas legibles de los métodos de pago (05_Base_de_Datos §2.3). */
export const ETIQUETAS_METODO_PAGO: Record<MetodoPago, string> = {
  efectivo_bs: "Efectivo Bs",
  efectivo_usd: "Efectivo $",
  pago_movil: "Pago Móvil",
  transferencia_bs: "Transferencia Bs",
  zelle: "Zelle",
  binance: "Binance",
  punto_venta: "Punto de venta",
};

/** Etiquetas legibles del estado de una venta. */
export const ETIQUETAS_ESTADO_VENTA: Record<EstadoVenta, string> = {
  completada: "Completada",
  anulada: "Anulada",
};

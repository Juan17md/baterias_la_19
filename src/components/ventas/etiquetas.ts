import type {
  EstadoCuota,
  EstadoFinanciamientoVisible,
  EstadoVenta,
  MetodoPago,
  ModalidadPago,
} from "@/types";

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

/** Etiquetas legibles de la modalidad con la que se pagó una venta. */
export const ETIQUETAS_MODALIDAD_PAGO: Record<ModalidadPago, string> = {
  contado: "Contado",
  cashea: "Cashea",
  tienda: "Por la tienda",
};

/** Etiquetas legibles del estado visible de un financiamiento. */
export const ETIQUETAS_ESTADO_FINANCIAMIENTO: Record<
  EstadoFinanciamientoVisible,
  string
> = {
  activo: "Activo",
  vencido: "Vencido",
  pagado: "Pagado",
  liquidado: "Liquidado",
};

/** Etiquetas legibles del estado de una cuota. */
export const ETIQUETAS_ESTADO_CUOTA: Record<EstadoCuota, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  vencida: "Vencida",
  informativa: "Informativa",
};

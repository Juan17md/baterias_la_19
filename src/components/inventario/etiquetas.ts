import type { EstadoStock, TipoBateria, TipoMovimiento } from "@/types";

/** Etiquetas legibles en español para los valores del dominio. */
export const ETIQUETAS_TIPO_BATERIA: Record<TipoBateria, string> = {
  libre_mantenimiento: "Libre mantenimiento",
  humeda: "Húmeda",
  agm: "AGM",
  gel: "Gel",
  efb: "EFB",
};

export const ETIQUETAS_ESTADO_STOCK: Record<EstadoStock, string> = {
  en_stock: "En stock",
  bajo: "Stock bajo",
  agotado: "Agotado",
};

export const ETIQUETAS_TIPO_MOVIMIENTO: Record<TipoMovimiento, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  devolucion: "Devolución",
};

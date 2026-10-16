import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases condicionales y resuelve conflictos de utilidades de Tailwind. */
export function cn(...clases: ClassValue[]) {
  return twMerge(clsx(clases));
}

/** Formatea un número con separadores y decimales locales (es-VE). */
export function formatearNumero(valor: number, decimales = 2): string {
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

/** Formatea una fecha corta en español (día, mes y hora). */
export function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

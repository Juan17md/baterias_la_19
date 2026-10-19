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

/** Normaliza texto para búsquedas (sin acentos, en minúsculas). */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Convierte el valor de un `<input type="date">` al inicio del día local.
 * Con `finExclusivo` devuelve el inicio del día siguiente (rango [desde, hasta)).
 */
export function fechaDesdeInput(
  valor: string,
  finExclusivo = false,
): Date | null {
  if (!valor) return null;
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;
  if (finExclusivo) fecha.setDate(fecha.getDate() + 1);
  return fecha;
}

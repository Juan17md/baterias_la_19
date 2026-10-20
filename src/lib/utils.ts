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

/** Devuelve una copia de la fecha al inicio del día local. */
export function inicioDelDia(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

/** Suma (o resta) días conservando la hora local. */
export function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/** Convierte una fecha local a `YYYY-MM-DD` para `<input type="date">`. */
export function fechaAInput(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Cantidad de días calendario entre dos fechas inclusivas. */
export function contarDiasInclusivos(desde: Date, hasta: Date): number {
  const inicio = inicioDelDia(desde).getTime();
  const fin = inicioDelDia(hasta).getTime();
  return Math.round((fin - inicio) / 86_400_000) + 1;
}

/** Formatea una fecha sin hora (día, mes corto y año). */
export function formatearFechaCorta(fecha: Date): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

/** Formatea solo la hora local (HH:mm). */
export function formatearHora(fecha: Date): string {
  return new Intl.DateTimeFormat("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

/** Formato compacto para ejes de gráficos (1,2 k / 3,4 M). */
export function formatearNumeroCompacto(valor: number): string {
  const absoluto = Math.abs(valor);
  if (absoluto >= 1_000_000) {
    return `${formatearNumero(valor / 1_000_000, 1)} M`;
  }
  if (absoluto >= 1_000) {
    return `${formatearNumero(valor / 1_000, 1)} k`;
  }
  return formatearNumero(valor, absoluto > 0 && absoluto < 10 ? 2 : 0);
}

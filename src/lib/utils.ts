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

/** Interpreta una fecha `YYYY-MM-DD` como fecha local al inicio del día. */
export function parsearFechaIso(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

/** Presenta una fecha local como `dd/mm/aaaa` para el campo de texto. */
export function formatearFechaEntrada(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

/**
 * Interpreta una fecha escrita por el usuario y la devuelve como `YYYY-MM-DD`.
 * Acepta `dd/mm/aaaa`, `dd-mm-aaaa`, `dd.mm.aaaa`, `aaaa-mm-dd` y `ddmmaaaa`.
 */
export function parsearFechaEntrada(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;

  function validar(candidato: string): string | null {
    return parsearFechaIso(candidato) ? candidato : null;
  }

  const numeros = /^(\d{2})(\d{2})(\d{4})$/.exec(limpio);
  if (numeros) {
    return validar(`${numeros[3]}-${numeros[2]}-${numeros[1]}`);
  }

  const diaMesAnio = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(limpio);
  if (diaMesAnio) {
    const [, dia, mes, anio] = diaMesAnio;
    return validar(`${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`);
  }

  const anioMesDia = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(limpio);
  if (anioMesDia) {
    const [, anio, mes, dia] = anioMesDia;
    return validar(`${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`);
  }

  return null;
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

/**
 * Enfoca el primer campo marcado como inválido después de que React pinte los
 * errores. Se usa al enviar formularios para que el teclado y los lectores de
 * pantalla aterricen directamente en el problema.
 */
export function enfocarPrimerCampoInvalido(
  formulario: HTMLFormElement | null,
): void {
  if (!formulario) return;
  requestAnimationFrame(() => {
    formulario.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases condicionales y resuelve conflictos de utilidades de Tailwind. */
export function cn(...clases: ClassValue[]) {
  return twMerge(clsx(clases));
}

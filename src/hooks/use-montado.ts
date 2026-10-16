"use client";

import { useSyncExternalStore } from "react";

const suscribirVacio = () => () => {};

/**
 * Devuelve `false` durante el renderizado en servidor y la primera hidratación,
 * y `true` una vez montado en el cliente (patrón recomendado de React 19 para
 * evitar desajustes de hidratación).
 */
export function useMontado() {
  return useSyncExternalStore(
    suscribirVacio,
    () => true,
    () => false,
  );
}

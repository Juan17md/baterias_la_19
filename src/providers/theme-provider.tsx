"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Proveedor de tema (claro/oscuro) basado en next-themes.
 * El tema por defecto sigue al sistema operativo y la preferencia se persiste.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

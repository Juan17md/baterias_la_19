"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Proveedor de tema (claro/oscuro) basado en next-themes.
 * La aplicación inicia en modo claro y persiste la preferencia elegida.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

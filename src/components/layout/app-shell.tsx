"use client";

import { useCallback, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

/** Shell del dashboard: barra lateral + cabecera + contenido. */
function AppShell({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const abrirMenu = useCallback(() => setMenuAbierto(true), []);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  return (
    <div className="flex min-h-svh flex-1">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background focus:outline-none"
      >
        Saltar al contenido
      </a>
      <AppSidebar abierto={menuAbierto} alCerrar={cerrarMenu} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <AppHeader alAbrirMenu={abrirMenu} menuAbierto={menuAbierto} />
        <main
          id="contenido-principal"
          tabIndex={-1}
          className="flex-1 scroll-mt-14 p-4 focus-visible:outline-none lg:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export { AppShell };

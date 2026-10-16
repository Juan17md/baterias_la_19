"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

/** Shell del dashboard: barra lateral + cabecera + contenido. */
function AppShell({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex min-h-svh flex-1">
      <AppSidebar
        abierto={menuAbierto}
        alCerrar={() => setMenuAbierto(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <AppHeader alAbrirMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export { AppShell };

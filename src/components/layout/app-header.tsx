"use client";

import { Menu, ShoppingCart, User } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  alAbrirMenu: () => void;
};

/** Cabecera del dashboard: menú móvil, tasa BCV, venta rápida, tema y usuario. */
function AppHeader({ alAbrirMenu }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir menú de navegación"
        onClick={alAbrirMenu}
      >
        <Menu className="size-5" />
      </Button>

      <div className="flex-1" />

      {/* Tasa BCV — se conectará al servicio de tasa en la Fase 3 */}
      <div className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground sm:flex">
        <span className="font-medium text-foreground">Tasa BCV</span>
        <span className="font-mono">— Bs/$</span>
      </div>

      <Button
        onClick={() =>
          toast.info("El registro de ventas estará disponible en la Fase 5.")
        }
      >
        <ShoppingCart className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Registrar venta</span>
      </Button>

      <ThemeToggle />

      <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 md:flex">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium">Usuario</span>
      </div>
    </header>
  );
}

export { AppHeader };

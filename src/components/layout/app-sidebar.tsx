"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAVEGACION = [
  { etiqueta: "Dashboard", href: "/dashboard", icono: LayoutDashboard },
  { etiqueta: "Inventario", href: "/dashboard/inventario", icono: Package },
  { etiqueta: "Historial", href: "/dashboard/historial", icono: History },
  {
    etiqueta: "Estadísticas",
    href: "/dashboard/estadisticas",
    icono: BarChart3,
  },
  { etiqueta: "Usuarios", href: "/dashboard/usuarios", icono: Users },
] as const;

type AppSidebarProps = {
  abierto: boolean;
  alCerrar: () => void;
};

/** Barra lateral: fija en escritorio y tipo drawer en pantallas menores a lg. */
function AppSidebar({ abierto, alCerrar }: AppSidebarProps) {
  const rutaActual = usePathname();

  return (
    <>
      {abierto ? (
        <button
          type="button"
          aria-label="Cerrar menú de navegación"
          onClick={alCerrar}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-card transition-transform duration-[250ms] ease-in-out lg:translate-x-0",
          abierto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link
          href="/dashboard"
          onClick={alCerrar}
          className="flex h-14 items-center gap-2.5 border-b border-border px-4"
        >
          <span className="flex items-center justify-center rounded-lg dark:bg-white dark:p-1">
            <Image
              src="/logo-sin-fondo.png"
              alt="Logo de Baterías La 19"
              width={32}
              height={32}
              priority
              className="size-8 object-contain"
            />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Baterías La 19</span>
            <span className="text-xs text-muted-foreground">
              Sistema de gestión
            </span>
          </span>
        </Link>

        <nav
          aria-label="Módulos"
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
        >
          {NAVEGACION.map((elemento) => {
            const activo =
              elemento.href === "/dashboard"
                ? rutaActual === "/dashboard"
                : rutaActual.startsWith(elemento.href);
            const Icono = elemento.icono;

            return (
              <Link
                key={elemento.href}
                href={elemento.href}
                onClick={alCerrar}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                  activo
                    ? "bg-primary/10 text-primary before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icono className="size-4 shrink-0" aria-hidden="true" />
                {elemento.etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() =>
              toast.info(
                "El cierre de sesión se habilitará en la Fase 3 (Autenticación).",
              )
            }
          >
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  );
}

export { AppSidebar };

"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const NAVEGACION = [
  {
    etiqueta: "Dashboard",
    href: "/dashboard",
    icono: LayoutDashboard,
    soloAdmin: false,
  },
  {
    etiqueta: "Inventario",
    href: "/dashboard/inventario",
    icono: Package,
    soloAdmin: false,
  },
  {
    etiqueta: "Historial",
    href: "/dashboard/historial",
    icono: History,
    soloAdmin: false,
  },
  {
    etiqueta: "Estadísticas",
    href: "/dashboard/estadisticas",
    icono: BarChart3,
    soloAdmin: false,
  },
  {
    etiqueta: "Usuarios",
    href: "/dashboard/usuarios",
    icono: Users,
    soloAdmin: true,
  },
] as const;

const SELECTOR_ENFOCABLES =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function suscribirEscritorio(notificar: () => void) {
  const consulta = window.matchMedia("(min-width: 1024px)");
  consulta.addEventListener("change", notificar);
  return () => consulta.removeEventListener("change", notificar);
}

function leerEscritorio() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function leerEscritorioEnServidor() {
  return false;
}

type AppSidebarProps = {
  abierto: boolean;
  alCerrar: () => void;
};

/** Barra lateral: fija en escritorio y tipo drawer en pantallas menores a lg. */
function AppSidebar({ abierto, alCerrar }: AppSidebarProps) {
  const rutaActual = usePathname();
  const { perfil, cerrarSesion } = useAuth();
  const esAdmin = perfil?.rol === "admin";
  const referenciaAside = useRef<HTMLElement>(null);
  const esEscritorio = useSyncExternalStore(
    suscribirEscritorio,
    leerEscritorio,
    leerEscritorioEnServidor,
  );
  const navegacionVisible = NAVEGACION.filter(
    (elemento) => !elemento.soloAdmin || esAdmin,
  );

  useEffect(() => {
    if (!abierto || esEscritorio) return;

    const aside = referenciaAside.current;
    if (!aside) return;

    const focoAnterior =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    aside.querySelector<HTMLElement>("nav a[href]")?.focus();

    function obtenerEnfocables() {
      return Array.from(
        aside?.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES) ?? [],
      ).filter((elemento) => elemento.offsetParent !== null);
    }

    function manejarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        alCerrar();
        return;
      }

      if (evento.key !== "Tab") return;

      const enfocables = obtenerEnfocables();
      if (enfocables.length === 0) return;

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", manejarTecla);

    return () => {
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = overflowAnterior;
      if (focoAnterior?.isConnected) focoAnterior.focus();
    };
  }, [abierto, alCerrar, esEscritorio]);

  async function manejarCerrarSesion() {
    await cerrarSesion();
    toast.success("Sesión cerrada.");
  }

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
        id="menu-navegacion"
        ref={referenciaAside}
        inert={!abierto && !esEscritorio}
        role={!esEscritorio && abierto ? "dialog" : undefined}
        aria-modal={!esEscritorio && abierto ? true : undefined}
        aria-label="Menú de navegación"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-card transition-transform duration-[250ms] ease-in-out lg:translate-x-0",
          abierto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link
          href="/dashboard"
          onClick={alCerrar}
          className="flex h-14 items-center gap-2.5 border-b border-border px-4 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
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

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2.5 right-2.5 lg:hidden"
          aria-label="Cerrar menú de navegación"
          onClick={alCerrar}
        >
          <X className="size-5" aria-hidden="true" />
        </Button>

        <nav
          aria-label="Módulos"
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
        >
          {navegacionVisible.map((elemento) => {
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
                  "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset",
                  activo
                    ? "bg-primary/10 text-primary-text before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
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
            onClick={() => void manejarCerrarSesion()}
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

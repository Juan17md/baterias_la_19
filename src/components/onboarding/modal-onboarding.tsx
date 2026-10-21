"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  History,
  LayoutDashboard,
  Loader2,
  Package,
  Store,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { marcarOnboardingCompletado } from "@/lib/servicios/usuarios";
import { cn } from "@/lib/utils";

type PasoOnboarding = {
  titulo: string;
  descripcion: string;
  puntos: string[];
  icono: LucideIcon;
  tono: string;
  nota?: string;
};

const PASOS: PasoOnboarding[] = [
  {
    titulo: "Bienvenido a Baterías La 19",
    descripcion:
      "Este es tu espacio para controlar el inventario, las ventas y la información del negocio.",
    puntos: [
      "Todo lo que necesitas, en un solo lugar.",
      "La información se actualiza en tiempo real.",
      "Puedes usar el sistema desde tu computadora o teléfono.",
    ],
    icono: Store,
    tono: "bg-primary/10 text-primary-text",
  },
  {
    titulo: "Tu dashboard",
    descripcion:
      "Al iniciar sesión verás un resumen del día y los accesos más importantes.",
    puntos: [
      "Ventas e ingresos del día.",
      "Alertas de stock bajo.",
      "Accesos rápidos para vender o revisar el inventario.",
    ],
    icono: LayoutDashboard,
    tono: "bg-warning/10 text-warning-text",
  },
  {
    titulo: "Inventario",
    descripcion: "Consulta y mantén actualizado el stock de tus baterías.",
    puntos: [
      "Busca por código, marca o modelo.",
      "Registra entradas y ajustes de stock.",
      "Revisa el historial de cada producto, incluidas las salidas por venta.",
    ],
    icono: Package,
    tono: "bg-primary/10 text-primary-text",
  },
  {
    titulo: "Ventas e historial",
    descripcion:
      "Registra cada venta y consulta lo que ha pasado en la tienda.",
    puntos: [
      "Vende desde el dashboard o desde la ficha de una batería.",
      "Consulta el comprobante y los datos de cada venta.",
      "Filtra y anula ventas desde el historial.",
    ],
    icono: History,
    tono: "bg-info/10 text-info-text",
  },
  {
    titulo: "Estadísticas y tasa BCV",
    descripcion:
      "Analiza el comportamiento del negocio y consulta la tasa del día.",
    puntos: [
      "Revisa ventas por día, semana, mes o período.",
      "Identifica los productos más vendidos.",
      "Consulta la tasa BCV vigente en el encabezado.",
    ],
    icono: BarChart3,
    tono: "bg-success/10 text-success-text",
    nota: "Ya conoces lo esencial. Pulsa «Empezar» para entrar al dashboard.",
  },
];

/** Guía inicial que se muestra una sola vez a cada usuario. */
export function ModalOnboarding() {
  const { perfil, recargarPerfil } = useAuth();
  const [pasoActual, setPasoActual] = useState(0);
  const [completando, setCompletando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const guardandoRef = useRef(false);

  const abierto = Boolean(perfil && !perfil.onboardingCompletado);
  const paso = PASOS[pasoActual];
  const esUltimo = pasoActual === PASOS.length - 1;
  const Icono = paso.icono;

  useEffect(() => {
    if (!abierto) return;
    refTitulo.current?.focus();
  }, [abierto, pasoActual]);

  async function completar() {
    if (!perfil || perfil.onboardingCompletado || guardandoRef.current) return;

    guardandoRef.current = true;
    setCompletando(true);
    setError(null);

    try {
      await marcarOnboardingCompletado(perfil.uid);
      await recargarPerfil();
      toast.success("Guía inicial completada.");
    } catch {
      setError(
        "No se pudo guardar la guía. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      guardandoRef.current = false;
      setCompletando(false);
    }
  }

  function manejarCambioApertura(nuevoAbierto: boolean) {
    if (!nuevoAbierto) void completar();
  }

  function irAlSiguiente() {
    if (esUltimo) {
      void completar();
      return;
    }

    setError(null);
    setPasoActual((actual) => Math.min(actual + 1, PASOS.length - 1));
  }

  function irAlAnterior() {
    setError(null);
    setPasoActual((actual) => Math.max(actual - 1, 0));
  }

  return (
    <Dialog open={abierto} onOpenChange={manejarCambioApertura}>
      <DialogContent
        className="max-w-xl overflow-hidden p-0"
        onOpenAutoFocus={(evento) => {
          evento.preventDefault();
          refTitulo.current?.focus();
        }}
      >
        <div className="border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent p-6 pb-5">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl",
                paso.tono,
              )}
            >
              <Icono className="size-6" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 pr-8">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Paso {pasoActual + 1} de {PASOS.length}
              </p>
              <DialogTitle
                ref={refTitulo}
                tabIndex={-1}
                className="text-xl font-semibold tracking-tight focus:outline-none"
              >
                {paso.titulo}
              </DialogTitle>
              <DialogDescription>{paso.descripcion}</DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6" aria-live="polite">
          <div key={pasoActual} className="animate-fundido-entrada">
            <ul className="flex flex-col gap-3">
              {paso.puntos.map((punto) => (
                <li key={punto} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success-text">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <span>{punto}</span>
                </li>
              ))}
            </ul>
            {paso.nota ? (
              <p className="mt-5 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {paso.nota}
              </p>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive-text">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-border p-6 pt-4">
          <div className="mb-4 flex items-center gap-1.5" aria-hidden="true">
            {PASOS.map((_, indice) => (
              <span
                key={indice}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-150",
                  indice <= pasoActual ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => void completar()}
              disabled={completando}
            >
              Omitir guía
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {pasoActual > 0 ? (
                <Button
                  variant="outline"
                  onClick={irAlAnterior}
                  disabled={completando}
                >
                  Anterior
                </Button>
              ) : null}
              <Button onClick={irAlSiguiente} disabled={completando}>
                {completando ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Guardando…
                  </>
                ) : esUltimo ? (
                  "Empezar"
                ) : (
                  "Siguiente"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

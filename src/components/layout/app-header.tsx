"use client";

import { useState } from "react";
import { Menu, RefreshCw, ShoppingCart, User } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useTasa } from "@/hooks/use-tasa";
import { formatearFecha, formatearNumero } from "@/lib/utils";

type AppHeaderProps = {
  alAbrirMenu: () => void;
};

/**
 * Cabecera del dashboard: menú móvil, tasa BCV vigente (con corrección manual
 * para el admin), venta rápida, tema y usuario.
 */
function AppHeader({ alAbrirMenu }: AppHeaderProps) {
  const { perfil } = useAuth();
  const { tasa, cargando, errorApi, corregirTasa } = useTasa();
  const [dialogoTasaAbierto, setDialogoTasaAbierto] = useState(false);
  const [valorTasa, setValorTasa] = useState("");
  const [guardandoTasa, setGuardandoTasa] = useState(false);

  const esAdmin = perfil?.rol === "admin";

  const tituloTasa = tasa
    ? `${tasa.fuente === "manual" ? "Corrección manual" : "DolarAPI oficial"}${
        tasa.fechaActualizacion
          ? ` · ${formatearFecha(tasa.fechaActualizacion.toDate())}`
          : ""
      }${errorApi ? " · La API no respondió; se muestra la última tasa guardada" : ""}`
    : errorApi
      ? "No se pudo consultar la API ni la tasa guardada"
      : "Consultando la tasa…";

  async function manejarCorreccionTasa(
    evento: React.FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();
    const valor = Number(valorTasa.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Ingresa un valor válido mayor que cero.");
      return;
    }

    setGuardandoTasa(true);
    try {
      await corregirTasa(valor);
      toast.success("Tasa corregida correctamente.");
      setDialogoTasaAbierto(false);
      setValorTasa("");
    } catch {
      toast.error("No se pudo guardar la tasa. Inténtalo de nuevo.");
    } finally {
      setGuardandoTasa(false);
    }
  }

  const contenidoTasa = (
    <>
      <span className="font-medium text-foreground">Tasa BCV</span>
      <span className="font-mono">
        {tasa ? `${formatearNumero(tasa.valor)} Bs` : cargando ? "…" : "—"}
      </span>
      {errorApi ? (
        <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
      ) : null}
    </>
  );

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

      {esAdmin ? (
        <button
          type="button"
          title={tituloTasa}
          onClick={() => {
            setValorTasa(tasa ? String(tasa.valor) : "");
            setDialogoTasaAbierto(true);
          }}
          className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted sm:flex"
        >
          {contenidoTasa}
          <RefreshCw className="size-3" aria-hidden="true" />
        </button>
      ) : (
        <div
          title={tituloTasa}
          className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground sm:flex"
        >
          {contenidoTasa}
        </div>
      )}

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
        <span className="flex flex-col leading-tight">
          <span className="max-w-32 truncate text-sm font-medium">
            {perfil?.nombre ?? "Usuario"}
          </span>
          <span className="text-xs text-muted-foreground">
            {esAdmin ? "Administrador" : "Usuario"}
          </span>
        </span>
      </div>

      <Dialog open={dialogoTasaAbierto} onOpenChange={setDialogoTasaAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Corregir tasa BCV</DialogTitle>
            <DialogDescription>
              Se usará como referencia para los precios en bolívares hasta que
              la API vuelva a responder o se corrija de nuevo.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={manejarCorreccionTasa}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="valor-tasa" className="text-xs font-medium">
                Valor en Bs por USD
              </label>
              <Input
                id="valor-tasa"
                inputMode="decimal"
                placeholder="Ej. 879,12"
                value={valorTasa}
                onChange={(evento) => setValorTasa(evento.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogoTasaAbierto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardandoTasa}>
                {guardandoTasa ? "Guardando…" : "Guardar tasa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}

export { AppHeader };

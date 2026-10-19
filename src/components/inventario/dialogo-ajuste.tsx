"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { ajustarStock } from "@/lib/servicios/baterias";
import { esquemaAjuste } from "@/lib/validaciones/baterias";
import type { Bateria } from "@/types";

type Props = {
  bateria: Bateria;
  abierto: boolean;
  onAbiertoCambio: (abierto: boolean) => void;
  /** Se invoca tras aplicar el ajuste para refrescar la ficha. */
  onAjustado: () => void;
};

/** Diálogo para fijar el stock al conteo físico (movimiento de ajuste). */
export function DialogoAjuste({
  bateria,
  abierto,
  onAbiertoCambio,
  onAjustado,
}: Props) {
  const { perfil } = useAuth();
  const [nuevoStock, setNuevoStock] = useState(String(bateria.stock));
  const [motivo, setMotivo] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const nuevoNumero = Number(nuevoStock.trim().replace(",", "."));
  const diferencia =
    nuevoStock.trim() !== "" && Number.isInteger(nuevoNumero)
      ? nuevoNumero - bateria.stock
      : null;
  const sinCambios = diferencia === 0;

  function manejarCambio(abiertoNuevo: boolean) {
    if (abiertoNuevo) {
      setNuevoStock(String(bateria.stock));
      setMotivo("");
      setErrores({});
      setErrorServidor(null);
    }
    onAbiertoCambio(abiertoNuevo);
  }

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando || !perfil) return;

    const resultado = esquemaAjuste.safeParse({ nuevoStock, motivo });
    if (!resultado.success) {
      const nuevos: Record<string, string> = {};
      for (const problema of resultado.error.issues) {
        const campo = String(problema.path[0] ?? "");
        if (campo && !nuevos[campo]) nuevos[campo] = problema.message;
      }
      setErrores(nuevos);
      return;
    }

    setErrores({});
    setGuardando(true);
    setErrorServidor(null);
    try {
      await ajustarStock(
        bateria.id,
        resultado.data.nuevoStock,
        resultado.data.motivo,
        { uid: perfil.uid, nombre: perfil.nombre },
      );
      const diferenciaFinal = resultado.data.nuevoStock - bateria.stock;
      toast.success(
        `Ajuste registrado en ${bateria.codigo}: ${diferenciaFinal > 0 ? "+" : ""}${diferenciaFinal} unidades.`,
      );
      onAjustado();
      manejarCambio(false);
    } catch (fallo) {
      setErrorServidor(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo aplicar el ajuste.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={manejarCambio}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste de stock</DialogTitle>
          <DialogDescription>
            Fija el stock al conteo físico real de «{bateria.codigo}». El cambio
            queda auditado con motivo obligatorio.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={manejarEnvio}
          className="flex flex-col gap-4"
          noValidate
        >
          {errorServidor ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text"
            >
              {errorServidor}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ajuste-stock" className="text-xs font-medium">
              Stock físico contado
            </label>
            <Input
              id="ajuste-stock"
              value={nuevoStock}
              onChange={(evento) => {
                setNuevoStock(evento.target.value);
                setErrores((anteriores) => ({ ...anteriores, nuevoStock: "" }));
              }}
              placeholder="Ej. 3"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={errores.nuevoStock ? true : undefined}
            />
            {errores.nuevoStock ? (
              <p className="text-xs text-destructive-text">
                {errores.nuevoStock}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ajuste-motivo" className="text-xs font-medium">
              Motivo del ajuste
            </label>
            <Input
              id="ajuste-motivo"
              value={motivo}
              onChange={(evento) => {
                setMotivo(evento.target.value);
                setErrores((anteriores) => ({ ...anteriores, motivo: "" }));
              }}
              placeholder="Ej. Conteo físico de inventario"
              autoComplete="off"
              aria-invalid={errores.motivo ? true : undefined}
            />
            {errores.motivo ? (
              <p className="text-xs text-destructive-text">{errores.motivo}</p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Stock actual: <span className="font-mono">{bateria.stock}</span>
            {diferencia !== null ? (
              <>
                {" → "}
                <span className="font-mono font-medium">{nuevoNumero}</span>
                {sinCambios ? (
                  <span className="text-warning-text">
                    {" "}
                    · el stock no cambia
                  </span>
                ) : (
                  <span>
                    {" "}
                    · diferencia {diferencia > 0 ? "+" : ""}
                    {diferencia}
                  </span>
                )}
              </>
            ) : null}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => manejarCambio(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando || sinCambios}>
              {guardando ? "Aplicando…" : "Aplicar ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

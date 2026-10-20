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
import { registrarEntrada } from "@/lib/servicios/baterias";
import { enfocarPrimerCampoInvalido } from "@/lib/utils";
import { esquemaEntrada } from "@/lib/validaciones/baterias";
import type { Bateria } from "@/types";

type Props = {
  bateria: Bateria;
  abierto: boolean;
  onAbiertoCambio: (abierto: boolean) => void;
  /** Se invoca tras registrar la entrada para refrescar la ficha. */
  onRegistrada: () => void;
};

/** Diálogo para sumar unidades al stock con movimiento de entrada auditable. */
export function DialogoEntrada({
  bateria,
  abierto,
  onAbiertoCambio,
  onRegistrada,
}: Props) {
  const { perfil } = useAuth();
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const cantidadNumero = Number(cantidad.trim().replace(",", "."));
  const previa =
    cantidad.trim() !== "" &&
    Number.isInteger(cantidadNumero) &&
    cantidadNumero > 0
      ? bateria.stock + cantidadNumero
      : null;

  function manejarCambio(abiertoNuevo: boolean) {
    if (!abiertoNuevo) {
      setCantidad("");
      setMotivo("");
      setErrores({});
      setErrorServidor(null);
    }
    onAbiertoCambio(abiertoNuevo);
  }

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando || !perfil) return;

    const formulario = evento.currentTarget;
    const resultado = esquemaEntrada.safeParse({ cantidad, motivo });
    if (!resultado.success) {
      const nuevos: Record<string, string> = {};
      for (const problema of resultado.error.issues) {
        const campo = String(problema.path[0] ?? "");
        if (campo && !nuevos[campo]) nuevos[campo] = problema.message;
      }
      setErrores(nuevos);
      enfocarPrimerCampoInvalido(formulario);
      return;
    }

    setErrores({});
    setGuardando(true);
    setErrorServidor(null);
    try {
      await registrarEntrada(
        bateria.id,
        resultado.data.cantidad,
        resultado.data.motivo,
        { uid: perfil.uid, nombre: perfil.nombre },
      );
      toast.success(
        `Entrada registrada: +${resultado.data.cantidad} unidades de ${bateria.codigo}.`,
      );
      onRegistrada();
      manejarCambio(false);
    } catch (fallo) {
      setErrorServidor(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo registrar la entrada.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={manejarCambio}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar entrada</DialogTitle>
          <DialogDescription>
            Suma unidades al stock de «{bateria.codigo}» y deja un movimiento de
            entrada auditable.
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
            <label htmlFor="entrada-cantidad" className="text-xs font-medium">
              Cantidad que entra
            </label>
            <Input
              id="entrada-cantidad"
              name="cantidad"
              value={cantidad}
              onChange={(evento) => {
                setCantidad(evento.target.value);
                setErrores((anteriores) => ({ ...anteriores, cantidad: "" }));
              }}
              placeholder="Ej. 4"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={errores.cantidad ? true : undefined}
              aria-describedby={
                errores.cantidad ? "entrada-cantidad-error" : undefined
              }
            />
            {errores.cantidad ? (
              <p
                id="entrada-cantidad-error"
                role="alert"
                className="text-xs text-destructive-text"
              >
                {errores.cantidad}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="entrada-motivo" className="text-xs font-medium">
              Motivo (proveedor o factura)
            </label>
            <Input
              id="entrada-motivo"
              name="motivo"
              value={motivo}
              onChange={(evento) => {
                setMotivo(evento.target.value);
                setErrores((anteriores) => ({ ...anteriores, motivo: "" }));
              }}
              placeholder="Ej. Compra a proveedor · Factura 00123"
              autoComplete="off"
              aria-invalid={errores.motivo ? true : undefined}
              aria-describedby={
                errores.motivo ? "entrada-motivo-error" : undefined
              }
            />
            {errores.motivo ? (
              <p
                id="entrada-motivo-error"
                role="alert"
                className="text-xs text-destructive-text"
              >
                {errores.motivo}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Stock actual: <span className="font-mono">{bateria.stock}</span>
            {previa !== null ? (
              <>
                {" → "}
                <span className="font-mono font-medium">{previa}</span>
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
            <Button type="submit" disabled={guardando}>
              {guardando ? "Registrando…" : "Registrar entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

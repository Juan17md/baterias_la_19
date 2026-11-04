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
import { ETIQUETAS_METODO_PAGO } from "@/components/ventas/etiquetas";
import { anularPago } from "@/lib/servicios/financiamientos";
import {
  enfocarPrimerCampoInvalido,
  formatearFecha,
  formatearNumero,
} from "@/lib/utils";
import { esquemaAnulacionPago } from "@/lib/validaciones/financiamientos";
import type { PagoFinanciamiento } from "@/types";

type Props = {
  abierto: boolean;
  onAbiertoCambio: (abierto: boolean) => void;
  financiamientoId: string;
  pago: PagoFinanciamiento | null;
  /** Se invoca tras anular el pago para refrescar el plan y su historial. */
  onAnulado: () => void;
};

/**
 * Anulación de un cobro: el motivo es obligatorio y el pago no se borra, queda
 * auditado. La cuota vuelve a pendiente o vencida.
 *
 * El diálogo se monta solo cuando hay un pago seleccionado, así que el
 * formulario arranca limpio en cada apertura.
 */
export function DialogoAnularPago({
  abierto,
  onAbiertoCambio,
  financiamientoId,
  pago,
  onAnulado,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);

  function manejarCambio(abiertoNuevo: boolean) {
    if (!abiertoNuevo && anulando) return;
    if (!abiertoNuevo) {
      setErrorMotivo(null);
      setErrorServidor(null);
    }
    onAbiertoCambio(abiertoNuevo);
  }

  async function manejarAnulacion(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!pago || anulando) return;

    const formulario = evento.currentTarget;
    const validado = esquemaAnulacionPago.safeParse({ motivo });
    if (!validado.success) {
      setErrorMotivo(
        validado.error.issues[0]?.message ??
          "Escribe el motivo de la anulación.",
      );
      enfocarPrimerCampoInvalido(formulario);
      return;
    }

    setErrorMotivo(null);
    setErrorServidor(null);
    setAnulando(true);
    try {
      await anularPago(financiamientoId, pago.id, validado.data.motivo);
      toast.success("Cobro anulado: la cuota vuelve a estar pendiente.");
      onAnulado();
      onAbiertoCambio(false);
    } catch (fallo) {
      setErrorServidor(
        fallo instanceof Error ? fallo.message : "No se pudo anular el cobro.",
      );
    } finally {
      setAnulando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={manejarCambio}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Anular cobro de la cuota {pago?.cuotaNumero ?? ""}
          </DialogTitle>
          <DialogDescription>
            El pago no se borra: queda auditado con tu motivo y la cuota vuelve
            a pendiente o vencida.
          </DialogDescription>
        </DialogHeader>

        {pago ? (
          <dl className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Monto</dt>
              <dd className="font-mono">$ {formatearNumero(pago.monto)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Método</dt>
              <dd className="text-sm">
                {ETIQUETAS_METODO_PAGO[pago.metodoPago]}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Fecha</dt>
              <dd className="text-sm">
                {pago.fecha ? formatearFecha(pago.fecha.toDate()) : "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Referencia</dt>
              <dd className="text-sm">{pago.referencia || "—"}</dd>
            </div>
          </dl>
        ) : null}

        {errorServidor ? (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text"
          >
            <span>{errorServidor}</span>
          </div>
        ) : null}

        <form
          onSubmit={manejarAnulacion}
          className="mt-4 flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="anular-pago-motivo" className="text-xs font-medium">
              Motivo de la anulación
            </label>
            <Input
              id="anular-pago-motivo"
              name="motivo"
              value={motivo}
              onChange={(evento) => {
                setMotivo(evento.target.value);
                setErrorMotivo(null);
              }}
              placeholder="Ej. Cobro duplicado por error"
              autoComplete="off"
              autoFocus
              maxLength={120}
              aria-invalid={errorMotivo ? true : undefined}
              aria-describedby={
                errorMotivo ? "anular-pago-motivo-error" : undefined
              }
            />
            {errorMotivo ? (
              <p
                id="anular-pago-motivo-error"
                role="alert"
                className="text-xs text-destructive-text"
              >
                {errorMotivo}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => manejarCambio(false)}
              disabled={anulando}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={anulando}>
              {anulando ? "Anulando…" : "Anular cobro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

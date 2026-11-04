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
import { marcarLiquidacionCashea } from "@/lib/servicios/financiamientos";
import {
  enfocarPrimerCampoInvalido,
  fechaAInput,
  formatearFechaCorta,
  formatearNumero,
} from "@/lib/utils";
import { esquemaLiquidacionCashea } from "@/lib/validaciones/financiamientos";
import type { Financiamiento } from "@/types";

type Props = {
  abierto: boolean;
  onAbiertoCambio: (abierto: boolean) => void;
  financiamiento: Financiamiento;
  /** Se invoca tras confirmar la liquidación para refrescar el plan. */
  onConfirmado: () => void;
};

/**
 * Confirmación manual de la liquidación semanal de Cashea: se registra el
 * monto recibido, la fecha y la referencia de la transferencia.
 *
 * El diálogo se monta solo cuando hay una liquidación pendiente, así que el
 * formulario arranca con el monto esperado en cada apertura.
 */
export function DialogoLiquidarCashea({
  abierto,
  onAbiertoCambio,
  financiamiento,
  onConfirmado,
}: Props) {
  const liquidacion = financiamiento.liquidacion;
  const [monto, setMonto] = useState(() =>
    liquidacion ? String(liquidacion.montoEsperado) : "",
  );
  const [fecha, setFecha] = useState(() => fechaAInput(new Date()));
  const [referencia, setReferencia] = useState("");
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function manejarCambio(abiertoNuevo: boolean) {
    if (!abiertoNuevo && guardando) return;
    if (!abiertoNuevo) setErrorServidor(null);
    onAbiertoCambio(abiertoNuevo);
  }

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;

    const formulario = evento.currentTarget;
    const validado = esquemaLiquidacionCashea.safeParse({
      montoRecibido: monto,
      fechaRecibida: fecha || undefined,
      referencia,
    });
    if (!validado.success) {
      setErrorServidor(
        validado.error.issues[0]?.message ??
          "Revisa los datos de la liquidación.",
      );
      enfocarPrimerCampoInvalido(formulario);
      return;
    }

    setErrorServidor(null);
    setGuardando(true);
    try {
      await marcarLiquidacionCashea(financiamiento.id, validado.data);
      toast.success("Liquidación de Cashea confirmada.");
      onConfirmado();
      onAbiertoCambio(false);
    } catch (fallo) {
      setErrorServidor(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo confirmar la liquidación.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={manejarCambio}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar liquidación de Cashea</DialogTitle>
          <DialogDescription>
            Registra la transferencia del saldo que Cashea recibe en la tienda.
          </DialogDescription>
        </DialogHeader>

        {liquidacion ? (
          <dl className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Monto esperado</dt>
              <dd className="font-mono">
                $ {formatearNumero(liquidacion.montoEsperado)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Fecha esperada</dt>
              <dd className="text-sm">
                {liquidacion.fechaEsperada
                  ? formatearFechaCorta(liquidacion.fechaEsperada.toDate())
                  : "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Cliente</dt>
              <dd className="text-sm">{financiamiento.cliente.nombre}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Venta</dt>
              <dd className="font-mono text-sm">
                N.º {financiamiento.numeroVenta}
              </dd>
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
          onSubmit={manejarEnvio}
          className="mt-4 flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="liquidacion-monto"
                className="text-xs font-medium"
              >
                Monto recibido ($)
              </label>
              <Input
                id="liquidacion-monto"
                name="montoRecibido"
                value={monto}
                onChange={(evento) => setMonto(evento.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="liquidacion-fecha"
                className="text-xs font-medium"
              >
                Fecha de recepción
              </label>
              <Input
                id="liquidacion-fecha"
                name="fechaRecibida"
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="liquidacion-referencia"
              className="text-xs font-medium"
            >
              Referencia (opcional)
            </label>
            <Input
              id="liquidacion-referencia"
              name="referencia"
              value={referencia}
              onChange={(evento) => setReferencia(evento.target.value)}
              placeholder="Ej. Transferencia del lunes"
              autoComplete="off"
              maxLength={80}
            />
          </div>

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
              {guardando ? "Confirmando…" : "Confirmar liquidación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

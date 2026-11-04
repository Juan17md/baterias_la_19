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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ETIQUETAS_METODO_PAGO } from "@/components/ventas/etiquetas";
import { registrarPago } from "@/lib/servicios/financiamientos";
import {
  enfocarPrimerCampoInvalido,
  fechaAInput,
  formatearFechaCorta,
  formatearNumero,
} from "@/lib/utils";
import { esquemaPagoFinanciamiento } from "@/lib/validaciones/financiamientos";
import { METODOS_PAGO } from "@/lib/validaciones/metodos-pago";
import type { CuotaFinanciamiento, Financiamiento, MetodoPago } from "@/types";

type Props = {
  abierto: boolean;
  onAbiertoCambio: (abierto: boolean) => void;
  financiamiento: Financiamiento;
  cuota: CuotaFinanciamiento;
  /** Se invoca tras registrar el cobro para refrescar el plan. */
  onRegistrado: () => void;
};

/**
 * Cobro de una cuota completa de «Por la tienda». El monto y la tasa BCV los
 * calcula el servicio en la transacción; aquí solo se capturan el método, la
 * referencia y la nota.
 *
 * El diálogo se monta solo cuando hay una cuota seleccionada, así que el
 * formulario arranca limpio en cada apertura.
 */
export function DialogoRegistrarPago({
  abierto,
  onAbiertoCambio,
  financiamiento,
  cuota,
  onRegistrado,
}: Props) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo_usd");
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState(() => fechaAInput(new Date()));
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
    const validado = esquemaPagoFinanciamiento.safeParse({
      cuotaNumero: String(cuota.numero),
      metodoPago,
      referencia,
      nota,
      ...(fecha ? { fecha } : {}),
    });
    if (!validado.success) {
      setErrorServidor(
        validado.error.issues[0]?.message ?? "Revisa los datos del cobro.",
      );
      enfocarPrimerCampoInvalido(formulario);
      return;
    }

    setErrorServidor(null);
    setGuardando(true);
    try {
      const resultado = await registrarPago(financiamiento.id, validado.data);
      toast.success(
        `Cuota ${cuota.numero} cobrada: $ ${formatearNumero(resultado.monto)}.`,
      );
      onRegistrado();
      onAbiertoCambio(false);
    } catch (fallo) {
      setErrorServidor(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo registrar el cobro.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={manejarCambio}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Cobrar cuota {cuota.numero} de {financiamiento.numeroCuotas}
          </DialogTitle>
          <DialogDescription>
            Se cobra la cuota completa. El saldo y la próxima fecha se
            actualizan al instante.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Monto</dt>
              <dd className="font-mono">$ {formatearNumero(cuota.monto)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Vencimiento</dt>
              <dd className="text-sm">
                {cuota.fechaVencimiento
                  ? formatearFechaCorta(cuota.fechaVencimiento.toDate())
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

          {errorServidor ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text"
            >
              <span>{errorServidor}</span>
            </div>
          ) : null}

          <form
            onSubmit={manejarEnvio}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pago-metodo" className="text-xs font-medium">
                Método de pago
              </label>
              <Select
                value={metodoPago}
                onValueChange={(valor) => setMetodoPago(valor as MetodoPago)}
              >
                <SelectTrigger id="pago-metodo">
                  <SelectValue placeholder="Selecciona un método" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((metodo) => (
                    <SelectItem key={metodo} value={metodo}>
                      {ETIQUETAS_METODO_PAGO[metodo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pago-fecha" className="text-xs font-medium">
                  Fecha del cobro
                </label>
                <Input
                  id="pago-fecha"
                  name="fecha"
                  type="date"
                  value={fecha}
                  onChange={(evento) => setFecha(evento.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="pago-referencia"
                  className="text-xs font-medium"
                >
                  Referencia (opcional)
                </label>
                <Input
                  id="pago-referencia"
                  name="referencia"
                  value={referencia}
                  onChange={(evento) => setReferencia(evento.target.value)}
                  placeholder="Ej. N.º 001234"
                  autoComplete="off"
                  maxLength={80}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pago-nota" className="text-xs font-medium">
                Nota (opcional)
              </label>
              <textarea
                id="pago-nota"
                name="nota"
                value={nota}
                onChange={(evento) => setNota(evento.target.value)}
                rows={2}
                placeholder="Ej. Pagó en efectivo por la mitad…"
                maxLength={200}
                className="flex w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
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
                {guardando ? "Registrando…" : "Registrar cobro"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

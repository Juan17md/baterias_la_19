"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, ReceiptText, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeEstadoVenta } from "@/components/ventas/badge-estado-venta";
import { ETIQUETAS_METODO_PAGO } from "@/components/ventas/etiquetas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { anularVenta, obtenerVenta } from "@/lib/servicios/ventas";
import { formatearFecha, formatearNumero } from "@/lib/utils";
import { esquemaAnulacionVenta } from "@/lib/validaciones/ventas";
import type { Venta } from "@/types";

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{valor}</dd>
    </div>
  );
}

/** Comprobante interno de una venta con la acción de anulación auditada. */
export function DetalleVenta({ id }: { id: string }) {
  const { perfil } = useAuth();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);

  const [anularAbierto, setAnularAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const encontrada = await obtenerVenta(id);
        if (cancelado) return;
        setVenta(encontrada);
      } catch {
        if (!cancelado) setVenta(null);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [id, recarga]);

  function manejarCambioAnular(abiertoNuevo: boolean) {
    if (!abiertoNuevo && anulando) return;
    if (!abiertoNuevo) {
      setMotivo("");
      setErrorMotivo(null);
      setErrorAnulacion(null);
    }
    setAnularAbierto(abiertoNuevo);
  }

  async function manejarAnulacion(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!venta || !perfil || anulando) return;

    const validado = esquemaAnulacionVenta.safeParse({ motivo });
    if (!validado.success) {
      setErrorMotivo(
        validado.error.issues[0]?.message ??
          "Indica el motivo de la anulación.",
      );
      return;
    }

    setErrorMotivo(null);
    setErrorAnulacion(null);
    setAnulando(true);
    try {
      await anularVenta(venta.id, validado.data.motivo, {
        uid: perfil.uid,
        nombre: perfil.nombre,
      });
      toast.success("Venta anulada: stock repuesto y auditoría registrada.");
      manejarCambioAnular(false);
      setRecarga((valor) => valor + 1);
    } catch (fallo) {
      setErrorAnulacion(
        fallo instanceof Error ? fallo.message : "No se pudo anular la venta.",
      );
    } finally {
      setAnulando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="flex flex-col gap-3 p-6 lg:col-span-2">
            {Array.from({ length: 7 }).map((_, indice) => (
              <Skeleton key={indice} className="h-5 w-full" />
            ))}
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            {Array.from({ length: 5 }).map((_, indice) => (
              <Skeleton key={indice} className="h-5 w-full" />
            ))}
          </Card>
        </div>
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader titulo="Comprobante de venta" />
        <EmptyState
          icono={ReceiptText}
          titulo="Comprobante no encontrado"
          descripcion="La venta no existe o fue eliminada. Vuelve al historial para consultar las ventas registradas."
          accion={
            <Button asChild variant="outline">
              <Link href="/dashboard/historial">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver al historial
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const horas = new Intl.DateTimeFormat("es-VE", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo={`Comprobante N.º ${venta.numero}`}
        descripcion={
          venta.fecha
            ? `Emitido el ${horas.format(venta.fecha.toDate())}`
            : "Fecha no disponible"
        }
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/historial">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver al historial
              </Link>
            </Button>
            {venta.estado === "completada" ? (
              <Button
                variant="destructive"
                onClick={() => setAnularAbierto(true)}
              >
                <Ban className="size-4" aria-hidden="true" />
                Anular venta
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle>Baterías La 19</CardTitle>
                <CardDescription>Comprobante interno de venta</CardDescription>
              </div>
              <BadgeEstadoVenta estado={venta.estado} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Dato
                etiqueta="Fecha"
                valor={venta.fecha ? formatearFecha(venta.fecha.toDate()) : "—"}
              />
              <Dato etiqueta="Vendedor" valor={venta.vendedor.nombre || "—"} />
              <Dato
                etiqueta="Cliente"
                valor={venta.cliente?.nombre ?? "Cliente ocasional"}
              />
              <Dato
                etiqueta="Teléfono"
                valor={venta.cliente?.telefono || "—"}
              />
              <Dato
                etiqueta="Método de pago"
                valor={ETIQUETAS_METODO_PAGO[venta.metodoPago]}
              />
              <Dato
                etiqueta="Tasa BCV aplicada"
                valor={`${formatearNumero(venta.tasaBCV, 4)} Bs/$`}
              />
              <Dato
                etiqueta="Instalación"
                valor={venta.incluyeInstalacion ? "Sí" : "No"}
              />
              <Dato
                etiqueta="Batería usada recibida"
                valor={venta.recibioBateriaUsada ? "Sí" : "No"}
              />
            </dl>

            {venta.notas ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium">Notas: </span>
                {venta.notas}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Código</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 text-center font-medium">Cant.</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Precio unit.
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {venta.items.map((item) => (
                    <tr
                      key={item.bateriaId}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.codigo}
                      </td>
                      <td className="px-4 py-3">{item.descripcion}</td>
                      <td className="px-4 py-3 text-center font-mono">
                        {item.cantidad}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        $ {formatearNumero(item.precioUnitario)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        $ {formatearNumero(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totales</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  $ {formatearNumero(venta.subtotal)}
                </span>
              </div>
              {venta.descuento > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="font-mono">
                    − $ {formatearNumero(venta.descuento)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="font-mono">
                  $ {formatearNumero(venta.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>En bolívares</span>
                <span className="font-mono">
                  Bs {formatearNumero(venta.totalBs)}
                </span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Equivalencia calculada con la tasa BCV del momento de la venta (
                {formatearNumero(venta.tasaBCV, 4)} Bs/$).
              </p>
            </CardContent>
          </Card>

          {venta.anulacion ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-base text-destructive-text">
                  Venta anulada
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <p className="font-medium">{venta.anulacion.motivo}</p>
                <p className="text-xs text-muted-foreground">
                  {venta.anulacion.nombre}
                  {venta.anulacion.fecha
                    ? ` · ${formatearFecha(venta.anulacion.fecha.toDate())}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  El stock fue repuesto con movimientos de devolución.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog open={anularAbierto} onOpenChange={manejarCambioAnular}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anular venta N.º {venta.numero}</DialogTitle>
            <DialogDescription>
              Se repondrá el stock de las baterías con movimientos de devolución
              y la venta quedará auditada con tu usuario. El comprobante no se
              borra.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={manejarAnulacion}
            className="flex flex-col gap-4"
            noValidate
          >
            {errorAnulacion ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text"
              >
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{errorAnulacion}</span>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="anulacion-motivo" className="text-xs font-medium">
                Motivo de la anulación
              </label>
              <Input
                id="anulacion-motivo"
                value={motivo}
                onChange={(evento) => {
                  setMotivo(evento.target.value);
                  setErrorMotivo(null);
                }}
                placeholder="Ej. Venta duplicada por error"
                autoComplete="off"
                autoFocus
                aria-invalid={errorMotivo ? true : undefined}
              />
              {errorMotivo ? (
                <p className="text-xs text-destructive-text">{errorMotivo}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => manejarCambioAnular(false)}
                disabled={anulando}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={anulando}>
                {anulando ? "Anulando…" : "Anular venta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

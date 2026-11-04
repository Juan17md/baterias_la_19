"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  ReceiptText,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { BadgeEstadoCuota } from "@/components/financiamientos/badge-estado-cuota";
import { BadgeEstadoFinanciamiento } from "@/components/financiamientos/badge-estado-financiamiento";
import { PageHeader } from "@/components/layout/page-header";
import { ETIQUETAS_METODO_PAGO } from "@/components/ventas/etiquetas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { calcularProximaCuota } from "@/lib/dominio/financiamientos";
import {
  listarPagos,
  obtenerFinanciamiento,
} from "@/lib/servicios/financiamientos";
import {
  formatearFecha,
  formatearFechaCorta,
  formatearNumero,
} from "@/lib/utils";
import type {
  CuotaFinanciamiento,
  Financiamiento,
  PagoFinanciamiento,
} from "@/types";
import { DialogoAnularPago } from "./dialogo-anular-pago";
import { DialogoLiquidarCashea } from "./dialogo-liquidar-cashea";
import { DialogoRegistrarPago } from "./dialogo-registrar-pago";

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

type Props = { id: string };

/**
 * Detalle de un plan de financiamiento: datos del cliente y la venta,
 * calendario de cuotas, historial de pagos y las acciones de cobranza.
 */
export function DetalleFinanciamiento({ id }: Props) {
  const [financiamiento, setFinanciamiento] = useState<Financiamiento | null>(
    null,
  );
  const [pagos, setPagos] = useState<PagoFinanciamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const [cobro, setCobro] = useState<CuotaFinanciamiento | null>(null);
  const [pagoAAnular, setPagoAAnular] = useState<PagoFinanciamiento | null>(
    null,
  );
  const [liquidacionAbierta, setLiquidacionAbierta] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(false);
      try {
        const plan = await obtenerFinanciamiento(id);
        if (cancelado) return;
        setFinanciamiento(plan);
        if (!plan) {
          setPagos([]);
          return;
        }
        const historial = await listarPagos(id);
        if (cancelado) return;
        setPagos(historial);
      } catch {
        if (!cancelado) setError(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [id, recarga]);

  if (cargando) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card className="flex flex-col gap-3 p-6">
          {Array.from({ length: 6 }).map((_, indice) => (
            <Skeleton key={indice} className="h-5 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (error || !financiamiento) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader titulo="Financiamiento" />
        <EmptyState
          icono={TriangleAlert}
          titulo="Financiamiento no encontrado"
          descripcion="El plan ya no existe o fue eliminado. Vuelve al módulo para consultar los financiamientos vigentes."
          accion={
            <Button asChild variant="outline">
              <Link href="/dashboard/financiamientos">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver a financiamientos
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const esCashea = financiamiento.modalidad === "cashea";
  const liquidacion = financiamiento.liquidacion;
  const proximaCuota = esCashea
    ? null
    : calcularProximaCuota(financiamiento.cuotas);
  const pagosVigentes = new Map(
    pagos
      .filter((pago) => !pago.anulacion)
      .map((pago) => [pago.id, pago] as const),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo={`Financiamiento de la venta N.º ${financiamiento.numeroVenta}`}
        descripcion={`${
          esCashea ? "Plan de Cashea" : "Crédito directo de la tienda"
        } · ${financiamiento.cliente.nombre}${
          financiamiento.fechaVenta
            ? ` · ${formatearFechaCorta(financiamiento.fechaVenta.toDate())}`
            : ""
        }`}
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/financiamientos">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/dashboard/historial/venta/${financiamiento.ventaId}`}
              >
                <ReceiptText className="size-4" aria-hidden="true" />
                Ver comprobante
              </Link>
            </Button>
            {!esCashea && proximaCuota ? (
              <Button onClick={() => setCobro(proximaCuota)}>
                <CircleDollarSign className="size-4" aria-hidden="true" />
                Cobrar cuota {proximaCuota.numero}
              </Button>
            ) : null}
            {esCashea && liquidacion?.estado !== "recibida" ? (
              <Button onClick={() => setLiquidacionAbierta(true)}>
                <HandCoins className="size-4" aria-hidden="true" />
                Confirmar liquidación
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
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="size-4" aria-hidden="true" />
                  Resumen del plan
                </CardTitle>
                <CardDescription>
                  Datos congelados al momento de la venta.
                </CardDescription>
              </div>
              <BadgeEstadoFinanciamiento
                estado={financiamiento.estadoDerivado}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Dato
                etiqueta="Modalidad"
                valor={esCashea ? "Cashea" : "Por la tienda"}
              />
              <Dato
                etiqueta="Cliente"
                valor={financiamiento.cliente.nombre || "—"}
              />
              <Dato
                etiqueta="Teléfono"
                valor={financiamiento.cliente.telefono || "—"}
              />
              <Dato
                etiqueta="Total de la venta"
                valor={`$ ${formatearNumero(financiamiento.totalVenta)}`}
              />
              <Dato
                etiqueta="Inicial"
                valor={`$ ${formatearNumero(financiamiento.inicial)}`}
              />
              <Dato
                etiqueta="Método de la inicial"
                valor={ETIQUETAS_METODO_PAGO[financiamiento.metodoPagoInicial]}
              />
              <Dato
                etiqueta="Monto financiado"
                valor={`$ ${formatearNumero(financiamiento.montoFinanciado)}`}
              />
              <Dato
                etiqueta="Cuotas"
                valor={`${financiamiento.numeroCuotas} × $ ${formatearNumero(financiamiento.montoCuota)}`}
              />
              <Dato
                etiqueta={esCashea ? "Saldo por liquidar" : "Saldo por cobrar"}
                valor={`$ ${formatearNumero(financiamiento.saldoPendiente)}`}
              />
              <Dato
                etiqueta="Cuotas cobradas"
                valor={`${financiamiento.cuotasPagadas} de ${financiamiento.numeroCuotas}`}
              />
              <Dato
                etiqueta="Plazo entre cuotas"
                valor={`${financiamiento.diasEntreCuotas} días`}
              />
              <Dato
                etiqueta="Tasa BCV de la venta"
                valor={`${formatearNumero(financiamiento.tasaBCVVenta, 4)} Bs/$`}
              />
            </dl>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="size-4" aria-hidden="true" />
                Calendario de cuotas
              </h3>
              <div className="mt-2 overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Cuotas del plan con vencimiento, monto, estado y cobro
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-medium">
                        Cuota
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Vencimiento
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-medium"
                      >
                        Monto
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-medium"
                      >
                        Estado
                      </th>
                      {!esCashea ? (
                        <th scope="col" className="px-4 py-3 font-medium">
                          Cobro
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {financiamiento.cuotas.map((cuota) => {
                      const pago = cuota.pagoId
                        ? pagosVigentes.get(cuota.pagoId)
                        : undefined;
                      return (
                        <tr
                          key={cuota.numero}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 font-mono text-xs">
                            {cuota.numero}/{financiamiento.numeroCuotas}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {cuota.fechaVencimiento
                              ? formatearFechaCorta(
                                  cuota.fechaVencimiento.toDate(),
                                )
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            $ {formatearNumero(cuota.monto)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <BadgeEstadoCuota estado={cuota.estado} />
                          </td>
                          {!esCashea ? (
                            <td className="px-4 py-3 text-xs">
                              {pago ? (
                                <>
                                  {ETIQUETAS_METODO_PAGO[pago.metodoPago]}
                                  {pago.referencia
                                    ? ` · ${pago.referencia}`
                                    : ""}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {esCashea ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Liquidación de Cashea
                </CardTitle>
                <CardDescription>
                  El saldo se liquida el lunes siguiente a las 00:00.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {liquidacion ? (
                  <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
                    <Dato
                      etiqueta="Monto esperado"
                      valor={`$ ${formatearNumero(liquidacion.montoEsperado)}`}
                    />
                    <Dato
                      etiqueta="Fecha esperada"
                      valor={
                        liquidacion.fechaEsperada
                          ? formatearFechaCorta(
                              liquidacion.fechaEsperada.toDate(),
                            )
                          : "—"
                      }
                    />
                    <Dato
                      etiqueta="Estado"
                      valor={
                        <Badge
                          variant={
                            liquidacion.estado === "recibida"
                              ? "success"
                              : "warning"
                          }
                        >
                          {liquidacion.estado === "recibida"
                            ? "Recibida"
                            : "Pendiente"}
                        </Badge>
                      }
                    />
                    <Dato
                      etiqueta="Monto recibido"
                      valor={
                        liquidacion.montoRecibido == null
                          ? "—"
                          : `$ ${formatearNumero(liquidacion.montoRecibido)}`
                      }
                    />
                    <Dato
                      etiqueta="Fecha recibida"
                      valor={
                        liquidacion.fechaRecibida
                          ? formatearFechaCorta(
                              liquidacion.fechaRecibida.toDate(),
                            )
                          : "—"
                      }
                    />
                    <Dato
                      etiqueta="Referencia"
                      valor={liquidacion.referencia || "—"}
                    />
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Este plan no tiene una liquidación registrada.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pagos registrados</CardTitle>
                <CardDescription>
                  Cobros de cuotas completas, incluidos los anulados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pagos.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                    Aún no hay pagos registrados para este plan.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {pagos.map((pago) => (
                      <li
                        key={pago.id}
                        className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono">
                            Cuota {pago.cuotaNumero} · $
                            {formatearNumero(pago.monto)}
                          </span>
                          {pago.anulacion ? (
                            <Badge variant="destructive">Anulado</Badge>
                          ) : (
                            <Badge variant="success">Registrado</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ETIQUETAS_METODO_PAGO[pago.metodoPago]} ·{" "}
                          {pago.fecha
                            ? formatearFecha(pago.fecha.toDate())
                            : "sin fecha"}
                          {pago.referencia ? ` · ${pago.referencia}` : ""}
                        </p>
                        {pago.nota ? (
                          <p className="text-xs text-muted-foreground">
                            {pago.nota}
                          </p>
                        ) : null}
                        {pago.anulacion ? (
                          <p className="text-xs text-destructive-text">
                            {pago.anulacion.motivo}
                          </p>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-fit"
                            onClick={() => setPagoAAnular(pago)}
                          >
                            <Ban className="size-4" aria-hidden="true" />
                            Anular cobro
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {financiamiento.notas || "Este plan no tiene notas."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {cobro ? (
        <DialogoRegistrarPago
          abierto
          onAbiertoCambio={(abierto) => {
            if (!abierto) setCobro(null);
          }}
          financiamiento={financiamiento}
          cuota={cobro}
          onRegistrado={() => setRecarga((valor) => valor + 1)}
        />
      ) : null}

      {pagoAAnular ? (
        <DialogoAnularPago
          abierto
          onAbiertoCambio={(abierto) => {
            if (!abierto) setPagoAAnular(null);
          }}
          financiamientoId={financiamiento.id}
          pago={pagoAAnular}
          onAnulado={() => {
            setPagoAAnular(null);
            setRecarga((valor) => valor + 1);
          }}
        />
      ) : null}

      {liquidacionAbierta ? (
        <DialogoLiquidarCashea
          abierto
          onAbiertoCambio={setLiquidacionAbierta}
          financiamiento={financiamiento}
          onConfirmado={() => setRecarga((valor) => valor + 1)}
        />
      ) : null}
    </div>
  );
}

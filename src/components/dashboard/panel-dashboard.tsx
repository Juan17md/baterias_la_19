"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Package,
  Plus,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { TarjetaKpi } from "@/components/estadisticas/tarjeta-kpi";
import { PageHeader } from "@/components/layout/page-header";
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
import { DialogoRegistrarVenta } from "@/components/ventas/dialogo-registrar-venta";
import { ETIQUETAS_METODO_PAGO } from "@/components/ventas/etiquetas";
import { useAlertasStock } from "@/hooks/use-alertas-stock";
import { useResumenDia } from "@/hooks/use-resumen-dia";
import { formatearHora, formatearNumero } from "@/lib/utils";
import type { Bateria, Venta } from "@/types";

function MensajeError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-text sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="inline-flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {mensaje}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}

function FilaVenta({ venta }: { venta: Venta }) {
  return (
    <li>
      <Link
        href={`/dashboard/historial/venta/${venta.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset sm:px-6"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold">
              #{venta.numero}
            </span>
            <span className="text-xs text-muted-foreground">
              {venta.fecha ? formatearHora(venta.fecha.toDate()) : "—"}
            </span>
            <Badge variant="neutral">
              {ETIQUETAS_METODO_PAGO[venta.metodoPago]}
            </Badge>
          </div>
          <p className="truncate text-sm">
            {venta.cliente?.nombre || "Consumidor final"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-semibold">
            $ {formatearNumero(venta.total)}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Bs {formatearNumero(venta.totalBs)}
          </p>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

function FilaAlerta({ bateria }: { bateria: Bateria }) {
  const agotado = bateria.stock === 0;
  return (
    <li>
      <Link
        href={`/dashboard/inventario/${bateria.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset sm:px-6"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-sm font-medium">
            {bateria.marca} {bateria.modelo}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {bateria.codigo} · Stock {bateria.stock} / mín.{" "}
            {bateria.stockMinimo}
          </p>
        </div>
        <Badge variant={agotado ? "destructive" : "warning"}>
          {agotado ? "Agotado" : "Stock bajo"}
        </Badge>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

/** Panel principal: KPIs del día, últimas ventas y alertas de stock. */
export function PanelDashboard() {
  const { ventas, kpis, cargando, error, recargar } = useResumenDia();
  const {
    alertas,
    cargando: cargandoAlertas,
    error: errorAlertas,
    recargar: recargarAlertas,
  } = useAlertasStock();
  const [ventaAbierta, setVentaAbierta] = useState(false);
  const ultimasVentas = ventas.slice(0, 5);
  const alertasVisibles = alertas.slice(0, 5);
  const cargandoKpis = cargando && ventas.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Dashboard"
        descripcion="Resumen del día: ventas, ingresos, ticket promedio, stock crítico y últimas ventas."
        acciones={
          <>
            <Button type="button" onClick={() => setVentaAbierta(true)}>
              <ShoppingCart className="size-4" aria-hidden="true" />
              Registrar venta
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/inventario/nuevo">
                <Plus className="size-4" aria-hidden="true" />
                Agregar batería
              </Link>
            </Button>
          </>
        }
      />

      {error ? <MensajeError mensaje={error} onReintentar={recargar} /> : null}
      {errorAlertas ? (
        <MensajeError mensaje={errorAlertas} onReintentar={recargarAlertas} />
      ) : null}

      {cargandoKpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => (
            <div
              key={indice}
              className="rounded-lg border border-border bg-card p-5"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaKpi
            etiqueta="Ingresos de hoy"
            valor={`$ ${formatearNumero(kpis.ingresosUsd)}`}
            detalle={`Bs ${formatearNumero(kpis.ingresosBs)}`}
            icono={CircleDollarSign}
            tono="primary"
          />
          <TarjetaKpi
            etiqueta="Ventas de hoy"
            valor={String(kpis.ventas)}
            detalle={
              kpis.ventas === 1 ? "venta completada" : "ventas completadas"
            }
            icono={ReceiptText}
            tono="info"
          />
          <TarjetaKpi
            etiqueta="Unidades vendidas"
            valor={String(kpis.unidades)}
            detalle={
              kpis.unidades === 1 ? "batería vendida" : "baterías vendidas"
            }
            icono={Package}
            tono="success"
          />
          <TarjetaKpi
            etiqueta="Ticket promedio"
            valor={`$ ${formatearNumero(kpis.ticketPromedio)}`}
            detalle="por venta de hoy"
            icono={TrendingUp}
            tono="warning"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Últimas ventas</CardTitle>
              <CardDescription>
                Las cinco ventas más recientes de hoy.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/historial">
                Ver historial
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {cargando && ultimasVentas.length === 0 ? (
              <div className="flex flex-col gap-3 p-4 sm:p-6">
                {Array.from({ length: 3 }, (_, indice) => (
                  <Skeleton key={indice} className="h-14 w-full" />
                ))}
              </div>
            ) : error && ultimasVentas.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground sm:p-6">
                No se pudieron cargar las ventas de hoy.
              </p>
            ) : ultimasVentas.length > 0 ? (
              <ul className="divide-y divide-border border-t border-border">
                {ultimasVentas.map((venta) => (
                  <FilaVenta key={venta.id} venta={venta} />
                ))}
              </ul>
            ) : (
              <div className="p-4 sm:p-6">
                <EmptyState
                  icono={ReceiptText}
                  titulo="Sin ventas registradas hoy"
                  descripcion="Las ventas completadas aparecerán aquí en cuanto se registren."
                  accion={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVentaAbierta(true)}
                    >
                      Registrar la primera venta
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Alertas de stock</CardTitle>
              <CardDescription>
                Productos en o por debajo del mínimo.
              </CardDescription>
            </div>
            {alertas.length > 0 ? (
              <Badge variant="warning">{alertas.length}</Badge>
            ) : null}
          </CardHeader>

          <CardContent className="p-0">
            {cargandoAlertas && alertas.length === 0 ? (
              <div className="flex flex-col gap-3 p-4 sm:p-6">
                {Array.from({ length: 3 }, (_, indice) => (
                  <Skeleton key={indice} className="h-12 w-full" />
                ))}
              </div>
            ) : errorAlertas && alertas.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground sm:p-6">
                No se pudieron cargar las alertas de stock.
              </p>
            ) : alertasVisibles.length > 0 ? (
              <ul className="divide-y divide-border border-t border-border">
                {alertasVisibles.map((bateria) => (
                  <FilaAlerta key={bateria.id} bateria={bateria} />
                ))}
              </ul>
            ) : (
              <div className="p-4 sm:p-6">
                <EmptyState
                  icono={CheckCircle2}
                  titulo="Stock en orden"
                  descripcion="Ninguna batería está por debajo de su stock mínimo."
                />
              </div>
            )}
          </CardContent>

          <div className="border-t border-border p-4 sm:px-6">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/dashboard/inventario">
                Ver inventario completo
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      <DialogoRegistrarVenta
        abierto={ventaAbierta}
        onAbiertoCambio={setVentaAbierta}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, HandCoins, ReceiptText } from "lucide-react";
import { DialogoLiquidarCashea } from "@/components/financiamientos/dialogo-liquidar-cashea";
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
import { useVentasCashea } from "@/hooks/use-ventas-cashea";
import { formatearFechaCorta, formatearNumero } from "@/lib/utils";
import type { Financiamiento, Venta } from "@/types";

/** Filas visibles en la tarjeta del dashboard. */
const MAX_FILAS = 5;

function resumirArticulos(venta: Venta | undefined): string {
  if (!venta || venta.items.length === 0) return "Artículos no disponibles";
  const visibles = venta.items.slice(0, 2).map((item) => {
    const descripcion = item.descripcion || item.codigo;
    return `${item.cantidad}× ${descripcion}`;
  });
  const restantes = venta.items.length - visibles.length;
  return [
    visibles.join(" · "),
    ...(restantes > 0 ? [`+${restantes} artículo(s) más`] : []),
  ].join(" · ");
}

type FilaProps = {
  plan: Financiamiento;
  venta: Venta | undefined;
  onPagoRecibido: (plan: Financiamiento) => void;
};

function FilaCashea({ plan, venta, onPagoRecibido }: FilaProps) {
  const liquidacion = plan.liquidacion;
  const recibido = liquidacion?.estado === "recibida";
  const monto = recibido
    ? (liquidacion?.montoRecibido ?? 0)
    : (liquidacion?.montoEsperado ?? plan.saldoPendiente);
  const fecha = recibido
    ? liquidacion?.fechaRecibida
    : liquidacion?.fechaEsperada;

  return (
    <li className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/historial/venta/${plan.ventaId}`}
            className="font-mono text-xs font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            #{plan.numeroVenta}
          </Link>
          <Badge variant={recibido ? "success" : "warning"}>
            {recibido ? "Pago recibido" : "Liquidación pendiente"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Inicial $ {formatearNumero(plan.inicial)}
          </span>
        </div>
        <p className="truncate text-sm font-medium">{plan.cliente.nombre}</p>
        <p className="truncate text-xs text-muted-foreground">
          {resumirArticulos(venta)}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="font-mono text-sm font-semibold">
            $ {formatearNumero(monto)}
          </p>
          <p className="text-xs text-muted-foreground">
            {recibido ? "Recibido" : "Esperado"}{" "}
            {fecha ? formatearFechaCorta(fecha.toDate()) : "—"}
          </p>
        </div>
        {!recibido ? (
          <Button
            type="button"
            size="sm"
            onClick={() => onPagoRecibido(plan)}
            aria-label={`Registrar el pago recibido de Cashea para la venta N.º ${plan.numeroVenta}`}
          >
            <HandCoins className="size-4" aria-hidden="true" />
            Pago recibido
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Tarjeta del dashboard con las ventas financiadas por Cashea: artículos
 * vendidos, monto que Cashea debe liquidar y la acción de registrar el pago
 * recibido.
 */
export function VentasCashea() {
  const { planes, ventas, cargando, error, recargar } = useVentasCashea();
  const [planEnLiquidacion, setPlanEnLiquidacion] =
    useState<Financiamiento | null>(null);

  // Primero las liquidaciones pendientes y luego las ya recibidas.
  const visibles = useMemo(() => {
    const pendientes = planes
      .filter((plan) => plan.liquidacion?.estado !== "recibida")
      .sort((a, b) => {
        const fechaA = a.liquidacion?.fechaEsperada?.toMillis() ?? 0;
        const fechaB = b.liquidacion?.fechaEsperada?.toMillis() ?? 0;
        return fechaA - fechaB;
      });
    const recibidas = planes.filter(
      (plan) => plan.liquidacion?.estado === "recibida",
    );
    return [...pendientes, ...recibidas].slice(0, MAX_FILAS);
  }, [planes]);

  const pendientes = planes.filter(
    (plan) => plan.liquidacion?.estado !== "recibida",
  ).length;

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Ventas por Cashea</CardTitle>
          <CardDescription>
            Artículos vendidos con Cashea y el saldo que la tienda recibe.
          </CardDescription>
        </div>
        {pendientes > 0 ? (
          <Badge variant="warning">{pendientes} por liquidar</Badge>
        ) : null}
      </CardHeader>

      <CardContent className="p-0">
        {cargando && planes.length === 0 ? (
          <div className="flex flex-col gap-3 p-4 sm:p-6">
            {Array.from({ length: 3 }).map((_, indice) => (
              <Skeleton key={indice} className="h-14 w-full" />
            ))}
          </div>
        ) : error && planes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground sm:p-6">
            No se pudieron cargar las ventas por Cashea.
          </p>
        ) : visibles.length > 0 ? (
          <ul className="border-t border-border">
            {visibles.map((plan) => (
              <FilaCashea
                key={plan.id}
                plan={plan}
                venta={ventas.get(plan.ventaId)}
                onPagoRecibido={setPlanEnLiquidacion}
              />
            ))}
          </ul>
        ) : (
          <div className="p-4 sm:p-6">
            <EmptyState
              icono={ReceiptText}
              titulo="Sin ventas por Cashea"
              descripcion="Las ventas financiadas con Cashea aparecerán aquí con su saldo pendiente de liquidación."
            />
          </div>
        )}
      </CardContent>

      <div className="border-t border-border p-4 sm:px-6">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/dashboard/financiamientos">
            Ver financiamientos
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {planEnLiquidacion ? (
        <DialogoLiquidarCashea
          abierto
          onAbiertoCambio={(abierto) => {
            if (!abierto) setPlanEnLiquidacion(null);
          }}
          financiamiento={planEnLiquidacion}
          onConfirmado={recargar}
        />
      ) : null}
    </Card>
  );
}

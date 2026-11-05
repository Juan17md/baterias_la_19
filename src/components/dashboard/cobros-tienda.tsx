"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, HandCoins, Plus, TriangleAlert } from "lucide-react";
import { TarjetaKpi } from "@/components/estadisticas/tarjeta-kpi";
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
import { DialogoRegistrarPago } from "@/components/financiamientos/dialogo-registrar-pago";
import { useCobrosTienda } from "@/hooks/use-cobros-tienda";
import { formatearFechaCorta, formatearNumero } from "@/lib/utils";
import type { CuotaFinanciamiento, Financiamiento } from "@/types";

const MAX_FILAS = 5;

/** Busca la próxima cuota sin pagar de un plan de la tienda. */
function proximaCuotaPendiente(
  plan: Financiamiento,
): CuotaFinanciamiento | null {
  return (
    plan.cuotas.find(
      (cuota) => cuota.pagoId === null && cuota.estado !== "pagada",
    ) ?? null
  );
}

type FilaCobroProps = {
  plan: Financiamiento;
  onCobrar: (cuota: CuotaFinanciamiento) => void;
};

function FilaCobro({ plan, onCobrar }: FilaCobroProps) {
  const vencido = plan.estadoDerivado === "vencido";
  const cuota = proximaCuotaPendiente(plan);

  return (
    <li className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/financiamientos/${plan.id}`}
            className="font-mono text-xs font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            #{plan.numeroVenta}
          </Link>
          <Badge variant={vencido ? "destructive" : "warning"}>
            {vencido ? "Vencido" : "Pendiente"}
          </Badge>
        </div>
        <p className="truncate text-sm font-medium">{plan.cliente.nombre}</p>
        <p className="truncate text-xs text-muted-foreground">
          Próxima cuota:
          {plan.proximaFechaVencimiento
            ? formatearFechaCorta(plan.proximaFechaVencimiento.toDate())
            : "—"}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
        {cuota ? (
          <Button
            type="button"
            size="sm"
            onClick={() => onCobrar(cuota)}
            className="flex items-center gap-1.5"
          >
            <Plus className="size-4" aria-hidden="true" />
            Registrar pago
          </Button>
        ) : null}
        <div className="flex flex-col gap-0.5 text-left sm:text-right">
          <p className="text-xs text-muted-foreground">Pendiente</p>
          <p className="font-mono text-sm font-semibold">
            $ {formatearNumero(plan.saldoPendiente)}
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * Tarjeta del dashboard con los cobros pendientes de ventas financiadas
 * «Por la tienda»: saldo por cobrar, saldo vencido y lista de los planes más
 * cercanos a vencer, con enlace al módulo de financiamientos.
 */
export function CobrosTienda() {
  const { porCobrar, vencido, planes, cargando, error } = useCobrosTienda();

  const visibles = planes.slice(0, MAX_FILAS);
  const [cobroAbierto, setCobroAbierto] = useState<{
    plan: Financiamiento;
    cuota: CuotaFinanciamiento;
  } | null>(null);

  function manejarCobro(plan: Financiamiento, cuota: CuotaFinanciamiento) {
    setCobroAbierto({ plan, cuota });
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Cobros pendientes - Tienda</CardTitle>
          <CardDescription>
            Saldo por cobrar de ventas financiadas «Por la tienda».
          </CardDescription>
        </div>
        {vencido > 0 ? (
          <Badge variant="destructive">${vencido.toFixed(2)} vencido</Badge>
        ) : null}
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid gap-4 border-b border-border p-4 sm:grid-cols-2">
          <TarjetaKpi
            etiqueta="Por cobrar"
            valor={`$ ${formatearNumero(porCobrar)}`}
            detalle="Saldo pendiente de planes activos"
            icono={HandCoins}
            tono="warning"
          />
          <TarjetaKpi
            etiqueta="Vencido"
            valor={`$ ${formatearNumero(vencido)}`}
            detalle="Saldo con cuotas vencidas"
            icono={TriangleAlert}
            tono={vencido > 0 ? "warning" : "success"}
          />
        </div>

        {cargando && planes.length === 0 ? (
          <div className="flex flex-col gap-3 p-4 sm:p-6">
            {Array.from({ length: 3 }).map((_, indice) => (
              <Skeleton key={indice} className="h-14 w-full" />
            ))}
          </div>
        ) : error && planes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground sm:p-6">
            No se pudieron cargar los cobros pendientes de la tienda.
          </p>
        ) : visibles.length > 0 ? (
          <ul className="border-t border-border">
            {visibles.map((plan) => (
              <FilaCobro
                key={plan.id}
                plan={plan}
                onCobrar={(cuota) => manejarCobro(plan, cuota)}
              />
            ))}
          </ul>
        ) : (
          <div className="p-4 sm:p-6">
            <EmptyState
              icono={HandCoins}
              titulo="Sin cobros pendientes"
              descripcion="No hay ventas financiadas «Por la tienda» con saldo pendiente."
            />
          </div>
        )}
      </CardContent>

      <div className="border-t border-border p-4 sm:px-6">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/dashboard/financiamientos">
            Ver financiamientos de la tienda
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {cobroAbierto ? (
        <DialogoRegistrarPago
          abierto
          onAbiertoCambio={(abierto) => {
            if (!abierto) setCobroAbierto(null);
          }}
          financiamiento={cobroAbierto.plan}
          cuota={cobroAbierto.cuota}
          onRegistrado={() => {
            setCobroAbierto(null);
          }}
        />
      ) : null}
    </Card>
  );
}

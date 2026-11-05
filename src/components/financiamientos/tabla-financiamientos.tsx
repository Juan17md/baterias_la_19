"use client";

import Link from "next/link";
import { CircleDollarSign, Eye, HandCoins } from "lucide-react";
import { BadgeEstadoFinanciamiento } from "@/components/financiamientos/badge-estado-financiamiento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calcularProximaCuota } from "@/lib/dominio/financiamientos";
import { formatearFechaCorta, formatearNumero } from "@/lib/utils";
import type { CuotaFinanciamiento, Financiamiento } from "@/types";

type Props = {
  financiamientos: Financiamiento[];
  /** Indica si hay una página siguiente disponible. */
  hayMas: boolean;
  cargandoMas: boolean;
  onCargarMas: () => void;
  /** Abre el diálogo de cobro con la cuota indicada. */
  onCobrar: (
    financiamiento: Financiamiento,
    cuota: CuotaFinanciamiento,
  ) => void;
  /** Abre el diálogo de liquidación de Cashea. */
  onLiquidar: (financiamiento: Financiamiento) => void;
};

function BadgeModalidad({
  modalidad,
}: {
  modalidad: Financiamiento["modalidad"];
}) {
  return (
    <Badge variant={modalidad === "cashea" ? "info" : "primary"}>
      {modalidad === "cashea" ? "Cashea" : "Por la tienda"}
    </Badge>
  );
}

/** Tabla de financiamientos con el saldo, el próximo cobro y el estado. */
export function TablaFinanciamientos({
  financiamientos,
  hayMas,
  cargandoMas,
  onCargarMas,
  onCobrar,
  onLiquidar,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Financiamientos con cliente, venta, modalidad, saldo, próximo cobro y
          estado
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">
              Cliente
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Venta
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Modalidad
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Total
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Inicial
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Saldo
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Próximo cobro
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Estado
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {financiamientos.map((financiamiento) => {
            const proximaCuota =
              financiamiento.modalidad === "tienda"
                ? calcularProximaCuota(financiamiento.cuotas)
                : null;
            const liquidacion = financiamiento.liquidacion;
            return (
              <tr
                key={financiamiento.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span>{financiamiento.cliente.nombre}</span>
                    {financiamiento.cliente.telefono ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {financiamiento.cliente.telefono}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  #{financiamiento.numeroVenta}
                </td>
                <td className="px-4 py-3">
                  <BadgeModalidad modalidad={financiamiento.modalidad} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  $ {formatearNumero(financiamiento.totalVenta)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  $ {formatearNumero(financiamiento.inicial)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                  $ {formatearNumero(financiamiento.saldoPendiente)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {financiamiento.modalidad === "tienda" ? (
                    proximaCuota ? (
                      <span className="flex flex-col">
                        <span>
                          Cuota N.º {proximaCuota.numero} · $
                          {formatearNumero(proximaCuota.monto)}
                        </span>
                        <span className="text-muted-foreground">
                          {proximaCuota.fechaVencimiento
                            ? formatearFechaCorta(
                                proximaCuota.fechaVencimiento.toDate(),
                              )
                            : "—"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Sin cuotas pendientes
                      </span>
                    )
                  ) : liquidacion?.estado === "recibida" ? (
                    <span className="text-muted-foreground">Liquidado</span>
                  ) : (
                    <span className="flex flex-col">
                      <span>Liquidación de Cashea</span>
                      <span className="text-muted-foreground">
                        {liquidacion?.fechaEsperada
                          ? formatearFechaCorta(
                              liquidacion.fechaEsperada.toDate(),
                            )
                          : "—"}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <BadgeEstadoFinanciamiento
                    estado={financiamiento.estadoDerivado}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {financiamiento.modalidad === "tienda" && proximaCuota ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onCobrar(financiamiento, proximaCuota)}
                        aria-label={`Cobrar cuota ${proximaCuota.numero} de ${financiamiento.cliente.nombre}`}
                      >
                        <CircleDollarSign
                          className="size-4"
                          aria-hidden="true"
                        />
                        Cobrar
                      </Button>
                    ) : null}
                    {financiamiento.modalidad === "cashea" &&
                    liquidacion?.estado === "pendiente" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onLiquidar(financiamiento)}
                        aria-label={`Liquidar el saldo de Cashea de ${financiamiento.cliente.nombre}`}
                      >
                        <HandCoins className="size-4" aria-hidden="true" />
                        Liquidar
                      </Button>
                    ) : null}
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/dashboard/financiamientos/${financiamiento.id}`}
                        aria-label={`Ver financiamiento de ${financiamiento.cliente.nombre}`}
                      >
                        <Eye className="size-4" aria-hidden="true" />
                        Ver
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hayMas ? (
        <div className="flex justify-center border-t border-border p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCargarMas}
            disabled={cargandoMas}
          >
            {cargandoMas ? "Cargando…" : "Cargar más"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

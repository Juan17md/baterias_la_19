import { CalendarClock, Info, Wallet } from "lucide-react";
import { BadgeEstadoCuota } from "@/components/financiamientos/badge-estado-cuota";
import { Badge } from "@/components/ui/badge";
import type { PlanFinanciamientoCalculado } from "@/lib/dominio/financiamientos";
import { formatearFechaCorta, formatearNumero } from "@/lib/utils";
import type { ModalidadPago } from "@/types";
import { ETIQUETAS_MODALIDAD_PAGO } from "./etiquetas";

type ModalidadFinanciada = Exclude<ModalidadPago, "contado">;

type Props = {
  modalidad: ModalidadFinanciada;
  plan: PlanFinanciamientoCalculado | null;
  error: string | null;
  /** Días configurados entre cuotas (14 en Cashea). */
  diasEntreCuotas: number;
};

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

/**
 * Vista previa del plan de cuotas dentro del modal de venta. Es solo
 * informativa: el servicio recalcula el calendario al registrar la venta.
 */
export function ResumenFinanciamiento({
  modalidad,
  plan,
  error,
  diasEntreCuotas,
}: Props) {
  if (!plan || error) {
    return (
      <section
        aria-label="Vista previa del financiamiento"
        className="rounded-md border border-dashed border-border px-3 py-3"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="size-4" aria-hidden="true" />
          Vista previa del plan
        </p>
        <p className="pt-1 text-sm text-muted-foreground">
          {error ?? "Completa los datos del financiamiento para ver el plan."}
        </p>
      </section>
    );
  }

  const primeraCuota = plan.cuotas[0]?.fechaVencimiento?.toDate() ?? null;
  const ultimaCuota =
    plan.cuotas[plan.cuotas.length - 1]?.fechaVencimiento?.toDate() ?? null;
  const fechaLiquidacion = plan.liquidacion?.fechaEsperada?.toDate() ?? null;
  const esCashea = modalidad === "cashea";

  return (
    <section
      aria-labelledby="resumen-financiamiento-titulo"
      className="flex flex-col overflow-hidden rounded-md border border-border"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
        <h3
          id="resumen-financiamiento-titulo"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Wallet className="size-4" aria-hidden="true" />
          Vista previa del plan
        </h3>
        <Badge variant={esCashea ? "info" : "primary"}>
          {ETIQUETAS_MODALIDAD_PAGO[modalidad]}
        </Badge>
      </header>

      <dl className="grid gap-x-4 gap-y-3 px-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato
          etiqueta="Monto financiado"
          valor={`$ ${formatearNumero(plan.montoFinanciado)}`}
        />
        <Dato
          etiqueta={esCashea ? "Cuota estimada" : "Monto por cuota"}
          valor={`$ ${formatearNumero(plan.montoCuota)}`}
        />
        <Dato etiqueta="Cuotas" valor={`${plan.cuotas.length}`} />
        <Dato
          etiqueta={esCashea ? "Saldo a liquidar" : "Saldo por cobrar"}
          valor={
            esCashea && plan.liquidacion
              ? `$ ${formatearNumero(plan.liquidacion.montoEsperado)}`
              : `$ ${formatearNumero(plan.montoFinanciado)}`
          }
        />
        <Dato
          etiqueta="Primera cuota"
          valor={
            primeraCuota
              ? formatearFechaCorta(primeraCuota)
              : "Sin fecha válida"
          }
        />
        <Dato
          etiqueta="Última cuota"
          valor={
            ultimaCuota ? formatearFechaCorta(ultimaCuota) : "Sin fecha válida"
          }
        />
        <Dato etiqueta="Plazo entre cuotas" valor={`${diasEntreCuotas} días`} />
        <Dato
          etiqueta={esCashea ? "Liquidación esperada" : "Recargo aplicado"}
          valor={
            esCashea
              ? fechaLiquidacion
                ? formatearFechaCorta(fechaLiquidacion)
                : "—"
              : "$ 0,00"
          }
        />
      </dl>

      <div className="mx-3 mb-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
        <Info
          className="mt-0.5 size-4 shrink-0 text-info-text"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">
          {esCashea && plan.liquidacion ? (
            <>
              Cashea liquida{" "}
              <span className="font-medium text-foreground">
                $ {formatearNumero(plan.liquidacion.montoEsperado)}
              </span>{" "}
              el{" "}
              <span className="font-medium text-foreground">
                {fechaLiquidacion
                  ? formatearFechaCorta(fechaLiquidacion)
                  : "siguiente lunes"}
              </span>
              . Las cuotas son informativas: el cliente las paga a Cashea.
            </>
          ) : (
            <>
              Crédito directo sin recargo ni interés. La tienda cobra cada cuota
              completa a su vencimiento.
            </>
          )}
        </p>
      </div>

      <div className="mx-3 mb-3 max-h-64 overflow-y-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Calendario de cuotas calculado para la venta financiada
          </caption>
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium">
                Cuota
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Vencimiento
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Monto
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {plan.cuotas.map((cuota) => (
              <tr
                key={cuota.numero}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2 font-mono text-xs">
                  {cuota.numero}/{plan.cuotas.length}
                </td>
                <td className="px-3 py-2 text-xs">
                  {cuota.fechaVencimiento
                    ? formatearFechaCorta(cuota.fechaVencimiento.toDate())
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  $ {formatearNumero(cuota.monto)}
                </td>
                <td className="px-3 py-2 text-right">
                  <BadgeEstadoCuota estado={cuota.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-1.5 px-3 pb-3 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        La última cuota ajusta los centavos para que la suma sea exacta.
      </p>
    </section>
  );
}

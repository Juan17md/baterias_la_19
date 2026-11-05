import type { LucideIcon } from "lucide-react";
import { HandCoins, ReceiptText, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatearNumero } from "@/lib/utils";

type Props = {
  vendido: number;
  cobrado: number;
  porCobrar: number;
};

type DatoProps = {
  icono: LucideIcon;
  etiqueta: string;
  valor: number;
  tono: string;
};

function Dato({ icono: Icono, etiqueta, valor, tono }: DatoProps) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icono className="size-3.5" aria-hidden="true" />
        {etiqueta}
      </p>
      <p className={cn("mt-1 font-mono text-xl font-semibold", tono)}>
        $ {formatearNumero(valor)}
      </p>
    </div>
  );
}

/**
 * Comparación entre lo vendido y lo cobrado en el período, con el saldo
 * pendiente actual de los planes de la tienda.
 */
export function ComparativaCobranza({ vendido, cobrado, porCobrar }: Props) {
  const porcentaje = vendido > 0 ? (cobrado / vendido) * 100 : 0;
  const avance = Math.min(100, Math.max(0, porcentaje));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendido vs. cobrado</CardTitle>
        <CardDescription>
          Lo vendido en el período frente al efectivo cobrado: contado,
          iniciales, cuotas de la tienda y liquidaciones de Cashea.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Dato
            icono={ReceiptText}
            etiqueta="Vendido"
            valor={vendido}
            tono="text-primary-text"
          />
          <Dato
            icono={HandCoins}
            etiqueta="Cobrado"
            valor={cobrado}
            tono="text-success-text"
          />
          <Dato
            icono={Wallet}
            etiqueta="Por cobrar (tienda)"
            valor={porCobrar}
            tono="text-warning-text"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">Avance de cobro</span>
            <span className="font-mono text-muted-foreground">
              {vendido > 0
                ? `${formatearNumero(porcentaje, 1)} %`
                : "Sin ventas"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Avance de cobro del período"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(avance)}
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-success transition-[width]"
              style={{ width: `${avance}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            El cobrado incluye pagos de planes vendidos antes del período; por
            eso el avance puede superar el 100 %.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { CreditCard } from "lucide-react";
import { ETIQUETAS_METODO_PAGO } from "@/components/ventas/etiquetas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatearNumero } from "@/lib/utils";
import type { ResumenMetodoPago } from "@/types";

const COLORES = [
  "bg-primary",
  "bg-primary/80",
  "bg-primary/65",
  "bg-primary/50",
  "bg-primary/35",
  "bg-primary/25",
  "bg-primary/15",
] as const;

type Props = {
  metodos: ResumenMetodoPago[];
};

/** Distribución de ingresos por método de pago (barra + leyenda). */
export function DistribucionPagos({ metodos }: Props) {
  const total = metodos.reduce(
    (acumulado, metodo) => acumulado + metodo.totalUsd,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métodos de pago</CardTitle>
        <CardDescription>
          Participación sobre los ingresos del período.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {metodos.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              {metodos.map((metodo, indice) => (
                <div
                  key={metodo.metodo}
                  className={cn("h-full", COLORES[indice % COLORES.length])}
                  style={{
                    width: `${total > 0 ? (metodo.totalUsd / total) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>

            <ul className="flex flex-col gap-3">
              {metodos.map((metodo, indice) => (
                <li
                  key={metodo.metodo}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      COLORES[indice % COLORES.length],
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {ETIQUETAS_METODO_PAGO[metodo.metodo]}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatearNumero(metodo.porcentaje, 1)}%
                  </span>
                  <span className="w-24 shrink-0 text-right font-mono text-sm">
                    $ {formatearNumero(metodo.totalUsd)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            icono={CreditCard}
            titulo="Sin pagos registrados"
            descripcion="La distribución aparecerá cuando existan ventas completadas en el período."
          />
        )}
      </CardContent>
    </Card>
  );
}

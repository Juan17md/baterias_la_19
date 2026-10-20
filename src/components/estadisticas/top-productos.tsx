import { PackageSearch } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatearNumero } from "@/lib/utils";
import type { ProductoVendido } from "@/types";

type Props = {
  productos: ProductoVendido[];
};

/** Ranking de los cinco productos con más unidades vendidas. */
export function TopProductos({ productos }: Props) {
  const maximo = Math.max(...productos.map((producto) => producto.unidades), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 productos</CardTitle>
        <CardDescription>
          Ordenados por unidades vendidas en el período.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {productos.length > 0 ? (
          <ol className="flex flex-col gap-4">
            {productos.map((producto, indice) => (
              <li key={producto.bateriaId} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-[10px] font-semibold text-muted-foreground"
                      aria-hidden="true"
                    >
                      {String(indice + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {producto.descripcion || producto.codigo}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {producto.codigo}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold">
                      {producto.unidades} u.
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Subtotal $ {formatearNumero(producto.subtotal)}
                    </p>
                  </div>
                </div>
                <div
                  className="ml-7.5 h-1.5 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(producto.unidades / maximo) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            icono={PackageSearch}
            titulo="Sin productos vendidos"
            descripcion="El ranking aparecerá cuando existan ventas completadas en el período."
          />
        )}
      </CardContent>
    </Card>
  );
}

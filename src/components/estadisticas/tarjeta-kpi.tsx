import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TonoKpi = "primary" | "success" | "warning" | "info";

const TONOS: Record<TonoKpi, string> = {
  primary: "bg-primary/10 text-primary dark:bg-primary/15",
  success: "bg-success/10 text-success-text dark:bg-success/15",
  warning: "bg-warning/10 text-warning-text dark:bg-warning/15",
  info: "bg-info/10 text-info dark:bg-info/15",
};

type Props = {
  etiqueta: string;
  valor: string;
  detalle?: React.ReactNode;
  icono: LucideIcon;
  tono?: TonoKpi;
};

/** Tarjeta de KPI con icono, valor principal y detalle secundario. */
export function TarjetaKpi({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  tono = "primary",
}: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">
            {etiqueta}
          </p>
          <p className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
            {valor}
          </p>
          {detalle ? (
            <p className="text-xs text-muted-foreground">{detalle}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            TONOS[tono],
          )}
        >
          <Icono className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}

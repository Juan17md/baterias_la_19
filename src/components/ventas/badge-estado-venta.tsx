import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { EstadoVenta } from "@/types";
import { ETIQUETAS_ESTADO_VENTA } from "./etiquetas";

const VARIANTE: Record<EstadoVenta, NonNullable<BadgeProps["variant"]>> = {
  completada: "success",
  anulada: "neutral",
};

/** Badge del estado de una venta (completada o anulada). */
export function BadgeEstadoVenta({
  estado,
  className,
}: {
  estado: EstadoVenta;
  className?: string;
}) {
  return (
    <Badge variant={VARIANTE[estado]} className={className}>
      {ETIQUETAS_ESTADO_VENTA[estado]}
    </Badge>
  );
}

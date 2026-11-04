import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { EstadoCuota } from "@/types";
import { ETIQUETAS_ESTADO_CUOTA } from "@/components/ventas/etiquetas";

const VARIANTE: Record<EstadoCuota, NonNullable<BadgeProps["variant"]>> = {
  pendiente: "outline",
  pagada: "success",
  vencida: "destructive",
  informativa: "neutral",
};

/** Badge del estado de una cuota del financiamiento. */
export function BadgeEstadoCuota({
  estado,
  className,
}: {
  estado: EstadoCuota;
  className?: string;
}) {
  return (
    <Badge variant={VARIANTE[estado]} className={className}>
      {ETIQUETAS_ESTADO_CUOTA[estado]}
    </Badge>
  );
}

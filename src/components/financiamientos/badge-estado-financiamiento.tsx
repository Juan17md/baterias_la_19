import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { EstadoFinanciamientoVisible } from "@/types";
import { ETIQUETAS_ESTADO_FINANCIAMIENTO } from "@/components/ventas/etiquetas";

const VARIANTE: Record<
  EstadoFinanciamientoVisible,
  NonNullable<BadgeProps["variant"]>
> = {
  activo: "info",
  vencido: "warning",
  pagado: "success",
  liquidado: "success",
};

/** Badge del estado visible de un financiamiento (incluye «vencido»). */
export function BadgeEstadoFinanciamiento({
  estado,
  className,
}: {
  estado: EstadoFinanciamientoVisible;
  className?: string;
}) {
  return (
    <Badge variant={VARIANTE[estado]} className={className}>
      {ETIQUETAS_ESTADO_FINANCIAMIENTO[estado]}
    </Badge>
  );
}

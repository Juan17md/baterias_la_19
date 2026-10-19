import { Badge, type BadgeProps } from "@/components/ui/badge";
import { calcularEstadoStock } from "@/lib/servicios/baterias";
import type { EstadoStock } from "@/types";
import { ETIQUETAS_ESTADO_STOCK } from "./etiquetas";

const VARIANTE: Record<EstadoStock, NonNullable<BadgeProps["variant"]>> = {
  en_stock: "success",
  bajo: "warning",
  agotado: "destructive",
};

type Props = {
  stock: number;
  stockMinimo: number;
  className?: string;
};

/** Badge del estado de stock según 06_Design_System §3.3. */
export function BadgeEstadoStock({ stock, stockMinimo, className }: Props) {
  const estado = calcularEstadoStock(stock, stockMinimo);
  return (
    <Badge variant={VARIANTE[estado]} className={className}>
      {ETIQUETAS_ESTADO_STOCK[estado]}
    </Badge>
  );
}

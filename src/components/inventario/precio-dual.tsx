"use client";

import { useTasa } from "@/hooks/use-tasa";
import { cn, formatearNumero } from "@/lib/utils";

type Props = {
  precioUsd: number;
  className?: string;
};

/**
 * Precio en dólares con su referencia en bolívares a la tasa BCV vigente
 * (formato estándar del 06_Design_System §5 y ADR_003).
 */
export function PrecioDual({ precioUsd, className }: Props) {
  const { tasa } = useTasa();
  const enBs = tasa ? precioUsd * tasa.valor : null;

  return (
    <div
      className={cn("flex flex-col leading-tight", className)}
      title={
        tasa
          ? `Tasa BCV: ${formatearNumero(tasa.valor, 4)} Bs/$`
          : "Tasa BCV no disponible"
      }
    >
      <span className="font-mono text-sm">$ {formatearNumero(precioUsd)}</span>
      <span className="font-mono text-xs text-muted-foreground">
        {enBs === null ? "—" : `Bs ${formatearNumero(enBs)}`}
      </span>
    </div>
  );
}

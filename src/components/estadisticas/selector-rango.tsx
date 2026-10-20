"use client";

import { CalendarDays } from "lucide-react";
import { CamposFecha } from "@/components/historial/campos-fecha";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatearFechaCorta } from "@/lib/utils";

export type PresetRango = "hoy" | "semana" | "mes" | "personalizado";

const OPCIONES: { valor: PresetRango; etiqueta: string }[] = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "semana", etiqueta: "Esta semana" },
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "personalizado", etiqueta: "Personalizado" },
];

type Props = {
  preset: PresetRango;
  desde: Date;
  hasta: Date;
  desdeInput: string;
  hastaInput: string;
  errorRango: string | null;
  onCambioPreset: (preset: PresetRango) => void;
  onCambioDesde: (valor: string) => void;
  onCambioHasta: (valor: string) => void;
  onAplicar: () => void;
};

/** Selector de rango con atajos y fechas personalizadas. */
export function SelectorRango({
  preset,
  desde,
  hasta,
  desdeInput,
  hastaInput,
  errorRango,
  onCambioPreset,
  onCambioDesde,
  onCambioHasta,
  onAplicar,
}: Props) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-background p-1"
          role="group"
          aria-label="Rango de fechas"
        >
          {OPCIONES.map(({ valor, etiqueta }) => {
            const activo = preset === valor;
            return (
              <button
                key={valor}
                type="button"
                aria-pressed={activo}
                onClick={() => onCambioPreset(valor)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  activo
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>

        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatearFechaCorta(desde)} — {formatearFechaCorta(hasta)}
        </p>
      </div>

      {preset === "personalizado" ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <CamposFecha
              idPrefijo="estadisticas"
              desde={desdeInput}
              hasta={hastaInput}
              onCambioDesde={onCambioDesde}
              onCambioHasta={onCambioHasta}
              errorId={errorRango ? "estadisticas-error-rango" : undefined}
              invalido={Boolean(errorRango)}
            />
          </div>
          <Button type="button" onClick={onAplicar}>
            Aplicar
          </Button>
        </div>
      ) : null}

      {errorRango ? (
        <p
          id="estadisticas-error-rango"
          role="alert"
          className="mt-2 text-xs text-destructive-text"
        >
          {errorRango}
        </p>
      ) : null}
    </Card>
  );
}

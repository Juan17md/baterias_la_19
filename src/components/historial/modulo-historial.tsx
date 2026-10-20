"use client";

import { useState } from "react";
import { Boxes, ReceiptText, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { TablaMovimientos } from "./tabla-movimientos";
import { TablaVentas } from "./tabla-ventas";

type Pestana = "ventas" | "movimientos";

const PESTANAS: { valor: Pestana; etiqueta: string; icono: LucideIcon }[] = [
  { valor: "ventas", etiqueta: "Ventas", icono: ReceiptText },
  { valor: "movimientos", etiqueta: "Movimientos", icono: Boxes },
];

/** Historial unificado: ventas con sus comprobantes y movimientos de stock. */
export function ModuloHistorial() {
  const [pestana, setPestana] = useState<Pestana>("ventas");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Historial"
        descripcion="Ventas y movimientos de inventario, con filtros por fecha, vendedor, tipo y usuario."
      />

      <div
        className="inline-flex w-fit gap-1 rounded-lg border border-border bg-card p-1"
        role="group"
        aria-label="Secciones del historial"
      >
        {PESTANAS.map(({ valor, etiqueta, icono: Icono }) => {
          const activa = pestana === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activa}
              onClick={() => setPestana(valor)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none",
                activa
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icono className="size-4" aria-hidden="true" />
              {etiqueta}
            </button>
          );
        })}
      </div>

      {pestana === "ventas" ? <TablaVentas /> : <TablaMovimientos />}
    </div>
  );
}

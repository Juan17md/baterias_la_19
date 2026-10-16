import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

export default function PaginaDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Dashboard"
        descripcion="Resumen del día: ventas, ingresos, ticket promedio, stock crítico y tasa BCV vigente."
      />
      <EmptyState
        icono={LayoutDashboard}
        titulo="Panel principal en construcción"
        descripcion="Aquí verás los KPIs del día, las últimas ventas y las alertas de stock. Se implementará en la Fase 6 del proyecto."
      />
    </div>
  );
}

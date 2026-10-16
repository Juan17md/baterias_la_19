import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Estadísticas" };

export default function PaginaEstadisticas() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Estadísticas"
        descripcion="KPIs y gráficos por rango de fechas: ingresos, unidades vendidas, ticket promedio y métodos de pago."
        breadcrumbs={[
          { etiqueta: "Dashboard", href: "/dashboard" },
          { etiqueta: "Estadísticas" },
        ]}
      />
      <EmptyState
        icono={BarChart3}
        titulo="Módulo en construcción"
        descripcion="Aquí verás los gráficos y KPIs por rango de fechas. Se implementará en la Fase 6 del proyecto."
      />
    </div>
  );
}

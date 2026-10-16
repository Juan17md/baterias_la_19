import type { Metadata } from "next";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Inventario" };

export default function PaginaInventario() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Inventario"
        descripcion="Catálogo de baterías con búsqueda, filtros, control de stock y precios en $ con referencia en Bs."
        breadcrumbs={[
          { etiqueta: "Dashboard", href: "/dashboard" },
          { etiqueta: "Inventario" },
        ]}
      />
      <EmptyState
        icono={Package}
        titulo="Módulo en construcción"
        descripcion="Aquí vivirá la tabla de inventario con búsqueda, filtros y paginación. Se implementará en la Fase 4 del proyecto."
      />
    </div>
  );
}

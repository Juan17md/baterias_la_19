import type { Metadata } from "next";
import { History } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Historial" };

export default function PaginaHistorial() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Historial"
        descripcion="Ventas y movimientos de inventario, con filtros por fecha, tipo y usuario."
      />
      <EmptyState
        icono={History}
        titulo="Módulo en construcción"
        descripcion="Aquí se listarán las ventas y los movimientos, con sus filtros y detalles. Se implementará en la Fase 5 del proyecto."
      />
    </div>
  );
}

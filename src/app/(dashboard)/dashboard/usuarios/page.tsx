import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Usuarios" };

export default function PaginaUsuarios() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Usuarios"
        descripcion="Gestión de usuarios del sistema: altas, roles y activación (solo administradores)."
        breadcrumbs={[
          { etiqueta: "Dashboard", href: "/dashboard" },
          { etiqueta: "Usuarios" },
        ]}
      />
      <EmptyState
        icono={Users}
        titulo="Módulo en construcción"
        descripcion="Aquí se gestionarán los usuarios y sus roles, visible únicamente para administradores. Se implementará en la Fase 3 del proyecto."
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { crearBateria } from "@/lib/servicios/baterias";
import type { DatosNuevaBateria } from "@/lib/validaciones/baterias";
import { FormularioBateria } from "./formulario-bateria";

/** Página de alta: crea la batería y registra la entrada inicial si aplica. */
export function NuevaBateria() {
  const router = useRouter();
  const { perfil } = useAuth();
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  async function manejarGuardar(datos: DatosNuevaBateria) {
    if (!perfil) return;
    setGuardando(true);
    setErrorServidor(null);
    try {
      const id = await crearBateria(datos, {
        uid: perfil.uid,
        nombre: perfil.nombre,
      });
      toast.success("Batería creada correctamente.");
      router.push(`/dashboard/inventario/${id}`);
    } catch (fallo) {
      const mensaje =
        fallo instanceof Error ? fallo.message : "No se pudo crear la batería.";
      setErrorServidor(mensaje);
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Nueva batería"
        descripcion="Registra un producto del catálogo. Los precios van en $ y verás su referencia en Bs con la tasa vigente."
        breadcrumbs={[
          { etiqueta: "Dashboard", href: "/dashboard" },
          { etiqueta: "Inventario", href: "/dashboard/inventario" },
          { etiqueta: "Nueva batería" },
        ]}
      />
      <Card className="p-6">
        <FormularioBateria
          modo="crear"
          textoBoton="Crear batería"
          guardando={guardando}
          onGuardar={(datos) => void manejarGuardar(datos)}
          onCancelar={() => router.push("/dashboard/inventario")}
          errorServidor={errorServidor}
        />
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { FormularioCambioContrasena } from "@/components/auth/formulario-cambio-contrasena";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default function PaginaCambiarContrasena() {
  return (
    <div className="relative flex flex-1 items-center justify-center bg-muted/40 p-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <FormularioCambioContrasena />
    </div>
  );
}

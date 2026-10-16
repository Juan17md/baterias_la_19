import type { Metadata } from "next";
import { ModuloUsuarios } from "@/components/usuarios/modulo-usuarios";

export const metadata: Metadata = { title: "Usuarios" };

export default function PaginaUsuarios() {
  return <ModuloUsuarios />;
}

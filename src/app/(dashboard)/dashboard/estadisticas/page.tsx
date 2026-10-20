import type { Metadata } from "next";
import { ModuloEstadisticas } from "@/components/estadisticas/modulo-estadisticas";

export const metadata: Metadata = { title: "Estadísticas" };

export default function PaginaEstadisticas() {
  return <ModuloEstadisticas />;
}

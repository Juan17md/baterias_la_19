import type { Metadata } from "next";
import { ModuloHistorial } from "@/components/historial/modulo-historial";

export const metadata: Metadata = { title: "Historial" };
export const instant = false;

export default function PaginaHistorial() {
  return <ModuloHistorial />;
}

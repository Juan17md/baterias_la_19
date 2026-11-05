import type { Metadata } from "next";
import { ModuloInventario } from "@/components/inventario/modulo-inventario";

export const metadata: Metadata = { title: "Inventario" };
export const instant = false;

export default function PaginaInventario() {
  return <ModuloInventario />;
}

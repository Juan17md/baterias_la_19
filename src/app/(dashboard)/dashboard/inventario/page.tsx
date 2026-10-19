import type { Metadata } from "next";
import { ModuloInventario } from "@/components/inventario/modulo-inventario";

export const metadata: Metadata = { title: "Inventario" };

export default function PaginaInventario() {
  return <ModuloInventario />;
}

import type { Metadata } from "next";
import { NuevaBateria } from "@/components/inventario/nueva-bateria";

export const metadata: Metadata = { title: "Nueva batería" };

export default function PaginaNuevaBateria() {
  return <NuevaBateria />;
}

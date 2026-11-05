import type { Metadata } from "next";
import { ModuloFinanciamientos } from "@/components/financiamientos/modulo-financiamientos";

export const metadata: Metadata = { title: "Financiamientos" };
export const instant = false;

export default function PaginaFinanciamientos() {
  return <ModuloFinanciamientos />;
}

import type { Metadata } from "next";
import { DetalleFinanciamiento } from "@/components/financiamientos/detalle-financiamiento";

export const metadata: Metadata = { title: "Financiamiento" };
export const instant = false;

export default async function PaginaDetalleFinanciamiento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalleFinanciamiento id={id} />;
}

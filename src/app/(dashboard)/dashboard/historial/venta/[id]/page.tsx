import type { Metadata } from "next";
import { DetalleVenta } from "@/components/historial/detalle-venta";

export const metadata: Metadata = { title: "Comprobante de venta" };

export default async function PaginaDetalleVenta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalleVenta id={id} />;
}

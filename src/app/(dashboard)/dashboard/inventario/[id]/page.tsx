import type { Metadata } from "next";
import { DetalleBateria } from "@/components/inventario/detalle-bateria";

export const metadata: Metadata = { title: "Detalle de batería" };

export default async function PaginaDetalleBateria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalleBateria id={id} />;
}

import type { Metadata } from "next";
import { ModuloFinanciamientos } from "@/components/financiamientos/modulo-financiamientos";
import type {
  EstadoFiltro,
  ModalidadFiltro,
} from "@/components/financiamientos/filtros-financiamientos";

export const metadata: Metadata = { title: "Financiamientos" };
export const instant = false;

const MODALIDADES: ModalidadFiltro[] = ["todas", "cashea", "tienda"];
const ESTADOS: EstadoFiltro[] = [
  "todos",
  "activo",
  "pagado",
  "liquidado",
  "vencido",
];

function leerParametro(valor: string | string[] | undefined): string {
  return Array.isArray(valor) ? (valor[0] ?? "") : (valor ?? "");
}

export default async function PaginaFinanciamientos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const modalidad = leerParametro(parametros.modalidad);
  const estado = leerParametro(parametros.estado);

  return (
    <ModuloFinanciamientos
      key={`${modalidad}-${estado}`}
      modalidadInicial={
        MODALIDADES.includes(modalidad as ModalidadFiltro)
          ? (modalidad as ModalidadFiltro)
          : "todas"
      }
      estadoInicial={
        ESTADOS.includes(estado as EstadoFiltro)
          ? (estado as EstadoFiltro)
          : "todos"
      }
    />
  );
}

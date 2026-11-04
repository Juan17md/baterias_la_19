"use client";

import { Search } from "lucide-react";
import { CamposFecha } from "@/components/historial/campos-fecha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ModalidadFiltro = "todas" | "cashea" | "tienda";
export type EstadoFiltro =
  "todos" | "activo" | "pagado" | "liquidado" | "vencido";

type Props = {
  modalidad: ModalidadFiltro;
  estado: EstadoFiltro;
  busqueda: string;
  desde: string;
  hasta: string;
  rangoInvalido: boolean;
  onCambioModalidad: (valor: ModalidadFiltro) => void;
  onCambioEstado: (valor: EstadoFiltro) => void;
  onCambioBusqueda: (valor: string) => void;
  onCambioDesde: (valor: string) => void;
  onCambioHasta: (valor: string) => void;
  onLimpiar: () => void;
};

/** Filtros del módulo de financiamientos: modalidad, estado, fechas y búsqueda. */
export function FiltrosFinanciamientos({
  modalidad,
  estado,
  busqueda,
  desde,
  hasta,
  rangoInvalido,
  onCambioModalidad,
  onCambioEstado,
  onCambioBusqueda,
  onCambioDesde,
  onCambioHasta,
  onLimpiar,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="financiamientos-busqueda"
            className="text-xs font-medium"
          >
            Buscar por cliente o venta
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="financiamientos-busqueda"
              name="busqueda"
              type="search"
              value={busqueda}
              onChange={(evento) => onCambioBusqueda(evento.target.value)}
              placeholder="Nombre, teléfono o N.º de venta…"
              autoComplete="off"
              className="pl-9"
            />
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onLimpiar}>
          Limpiar filtros
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="financiamientos-modalidad"
            className="text-xs font-medium"
          >
            Modalidad
          </label>
          <Select
            value={modalidad}
            onValueChange={(valor) =>
              onCambioModalidad(valor as ModalidadFiltro)
            }
          >
            <SelectTrigger id="financiamientos-modalidad">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="tienda">Por la tienda</SelectItem>
              <SelectItem value="cashea">Cashea</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="financiamientos-estado"
            className="text-xs font-medium"
          >
            Estado
          </label>
          <Select
            value={estado}
            onValueChange={(valor) => onCambioEstado(valor as EstadoFiltro)}
          >
            <SelectTrigger id="financiamientos-estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
              <SelectItem value="pagado">Pagados</SelectItem>
              <SelectItem value="liquidado">Liquidados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CamposFecha
          idPrefijo="financiamientos"
          desde={desde}
          hasta={hasta}
          onCambioDesde={onCambioDesde}
          onCambioHasta={onCambioHasta}
          invalido={rangoInvalido}
        />
      </div>
    </div>
  );
}

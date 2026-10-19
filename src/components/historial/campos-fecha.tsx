"use client";

import { Input } from "@/components/ui/input";

type Props = {
  idPrefijo: string;
  desde: string;
  hasta: string;
  onCambioDesde: (valor: string) => void;
  onCambioHasta: (valor: string) => void;
};

/**
 * Par de campos de fecha para los filtros del historial. Devuelve un fragmento
 * para encajar directamente en un grid junto al resto de filtros.
 */
export function CamposFecha({
  idPrefijo,
  desde,
  hasta,
  onCambioDesde,
  onCambioHasta,
}: Props) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefijo}-desde`} className="text-xs font-medium">
          Desde
        </label>
        <Input
          id={`${idPrefijo}-desde`}
          type="date"
          value={desde}
          max={hasta || undefined}
          onChange={(evento) => onCambioDesde(evento.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefijo}-hasta`} className="text-xs font-medium">
          Hasta
        </label>
        <Input
          id={`${idPrefijo}-hasta`}
          type="date"
          value={hasta}
          min={desde || undefined}
          onChange={(evento) => onCambioHasta(evento.target.value)}
        />
      </div>
    </>
  );
}

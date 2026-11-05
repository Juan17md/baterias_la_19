"use client";

import { CampoFecha } from "@/components/ui/campo-fecha";

type Props = {
  idPrefijo: string;
  desde: string;
  hasta: string;
  onCambioDesde: (valor: string) => void;
  onCambioHasta: (valor: string) => void;
  /** Id del mensaje de error para asociarlo a ambos campos. */
  errorId?: string;
  /** Marca los campos como inválidos cuando el rango no es válido. */
  invalido?: boolean;
};

/**
 * Par de campos de fecha para los filtros del historial, estadísticas y
 * financiamientos. Devuelve un fragmento para encajar directamente en un grid.
 */
export function CamposFecha({
  idPrefijo,
  desde,
  hasta,
  onCambioDesde,
  onCambioHasta,
  errorId,
  invalido = false,
}: Props) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefijo}-desde`} className="text-xs font-medium">
          Desde
        </label>
        <CampoFecha
          id={`${idPrefijo}-desde`}
          name={`${idPrefijo}-desde`}
          etiqueta="Desde"
          valor={desde}
          max={hasta || undefined}
          onCambio={onCambioDesde}
          errorId={errorId}
          invalido={invalido}
          alineacion="izquierda"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefijo}-hasta`} className="text-xs font-medium">
          Hasta
        </label>
        <CampoFecha
          id={`${idPrefijo}-hasta`}
          name={`${idPrefijo}-hasta`}
          etiqueta="Hasta"
          valor={hasta}
          min={desde || undefined}
          onCambio={onCambioHasta}
          errorId={errorId}
          invalido={invalido}
          alineacion="derecha"
        />
      </div>
    </>
  );
}

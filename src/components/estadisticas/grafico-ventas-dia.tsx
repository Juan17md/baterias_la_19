"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatearNumero, formatearNumeroCompacto } from "@/lib/utils";
import type { PuntoVentasDia } from "@/types";

const ANCHO = 720;
const ALTO = 260;
const MARGEN = { arriba: 20, derecha: 16, abajo: 34, izquierda: 58 };
const ANCHO_UTIL = ANCHO - MARGEN.izquierda - MARGEN.derecha;
const ALTO_UTIL = ALTO - MARGEN.arriba - MARGEN.abajo;

/** Redondea el máximo del eje a 1, 2, 5 o 10 veces una potencia de diez. */
function maximoBonito(valor: number): number {
  if (valor <= 0) return 1;
  const exponente = Math.floor(Math.log10(valor));
  const base = 10 ** exponente;
  const fraccion = valor / base;
  const factor = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10;
  return factor * base;
}

type Props = {
  serie: PuntoVentasDia[];
};

/** Gráfico de ingresos por día con detalle tabular accesible. */
export function GraficoVentasDia({ serie }: Props) {
  const [mostrarTabla, setMostrarTabla] = useState(false);
  const maximo = maximoBonito(
    Math.max(...serie.map((punto) => punto.totalUsd), 0),
  );
  const baseY = MARGEN.arriba + ALTO_UTIL;
  const paso = Math.max(1, Math.ceil(serie.length / 7));
  const total = serie.reduce(
    (acumulado, punto) => acumulado + punto.totalUsd,
    0,
  );
  const hayDatos = total > 0;

  const puntos = serie.map((punto, indice) => {
    const x =
      serie.length === 1
        ? MARGEN.izquierda + ANCHO_UTIL / 2
        : MARGEN.izquierda + (indice / (serie.length - 1)) * ANCHO_UTIL;
    const y = baseY - (punto.totalUsd / maximo) * ALTO_UTIL;
    return { ...punto, x, y };
  });

  const linea = puntos
    .map(
      (punto, indice) =>
        `${indice === 0 ? "M" : "L"} ${punto.x.toFixed(2)} ${punto.y.toFixed(2)}`,
    )
    .join(" ");

  const area =
    puntos.length > 1
      ? `${linea} L ${puntos[puntos.length - 1].x.toFixed(2)} ${baseY} L ${puntos[0].x.toFixed(2)} ${baseY} Z`
      : "";

  const ticks = Array.from({ length: 5 }, (_, indice) => {
    const fraccion = indice / 4;
    return {
      valor: maximo * fraccion,
      y: baseY - fraccion * ALTO_UTIL,
    };
  });

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Ingresos por día</CardTitle>
          <CardDescription>
            Ventas completadas en el período seleccionado.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={mostrarTabla}
          onClick={() => setMostrarTabla((valor) => !valor)}
        >
          {mostrarTabla ? "Ocultar tabla" : "Ver tabla"}
        </Button>
      </CardHeader>

      <CardContent>
        {hayDatos ? (
          <>
            <div className="-mx-1 overflow-x-auto pb-1">
              <svg
                viewBox={`0 0 ${ANCHO} ${ALTO}`}
                className="h-auto w-full min-w-[640px]"
                role="img"
                aria-label={`Ingresos por día del período: ${formatearNumero(total)} dólares en ${serie.length} días.`}
              >
                <defs>
                  <linearGradient
                    id="degradado-ingresos"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity="0.28"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                <g aria-hidden="true">
                  {ticks.map((tick) => (
                    <g key={tick.y}>
                      <line
                        x1={MARGEN.izquierda}
                        x2={ANCHO - MARGEN.derecha}
                        y1={tick.y}
                        y2={tick.y}
                        stroke="var(--border)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={MARGEN.izquierda - 8}
                        y={tick.y + 4}
                        textAnchor="end"
                        fill="var(--muted-foreground)"
                        fontSize={10}
                      >
                        {formatearNumeroCompacto(tick.valor)}
                      </text>
                    </g>
                  ))}

                  {puntos.length > 1 ? (
                    <>
                      <path d={area} fill="url(#degradado-ingresos)" />
                      <path
                        d={linea}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : null}

                  {puntos.map((punto) => (
                    <g key={punto.fecha}>
                      {puntos.length === 1 ? (
                        <rect
                          x={punto.x - 28}
                          y={punto.y}
                          width={56}
                          height={Math.max(baseY - punto.y, 1)}
                          rx={6}
                          fill="var(--primary)"
                          opacity={0.85}
                        />
                      ) : (
                        <circle
                          cx={punto.x}
                          cy={punto.y}
                          r={3.5}
                          fill="var(--primary)"
                          stroke="var(--card)"
                          strokeWidth={1.5}
                        />
                      )}
                      <title>
                        {`${punto.etiqueta}: $ ${formatearNumero(punto.totalUsd)} · ${punto.ventas} ventas · ${punto.unidades} unidades`}
                      </title>
                    </g>
                  ))}

                  {puntos.map((punto, indice) =>
                    indice === 0 ||
                    indice === puntos.length - 1 ||
                    indice % paso === 0 ? (
                      <text
                        key={`etiqueta-${punto.fecha}`}
                        x={punto.x}
                        y={ALTO - 10}
                        textAnchor="middle"
                        fill="var(--muted-foreground)"
                        fontSize={10}
                      >
                        {punto.etiqueta}
                      </text>
                    ) : null,
                  )}
                </g>
              </svg>
            </div>

            {mostrarTabla ? (
              <div className="mt-4 max-h-80 overflow-auto rounded-md border border-border">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">
                    Detalle diario de ventas, unidades e ingresos
                  </caption>
                  <thead className="sticky top-0 bg-muted/90 text-muted-foreground backdrop-blur">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Fecha
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-medium"
                      >
                        Ventas
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-medium"
                      >
                        Unidades
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-medium"
                      >
                        Ingresos $
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-right font-medium"
                      >
                        Ingresos Bs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {serie.map((punto) => (
                      <tr key={punto.fecha}>
                        <th scope="row" className="px-3 py-2 font-normal">
                          {punto.etiqueta}
                        </th>
                        <td className="px-3 py-2 text-right font-mono">
                          {punto.ventas}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {punto.unidades}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatearNumero(punto.totalUsd)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatearNumero(punto.totalBs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            icono={BarChart3}
            titulo="Sin ingresos en el período"
            descripcion="No hay ventas completadas para las fechas seleccionadas."
          />
        )}
      </CardContent>
    </Card>
  );
}

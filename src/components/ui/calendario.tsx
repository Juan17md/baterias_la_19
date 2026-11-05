"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cn,
  fechaAInput,
  inicioDelDia,
  parsearFechaIso,
  sumarDias,
} from "@/lib/utils";

const DIAS_SEMANA = [
  { corto: "Lu", largo: "lunes" },
  { corto: "Ma", largo: "martes" },
  { corto: "Mi", largo: "miércoles" },
  { corto: "Ju", largo: "jueves" },
  { corto: "Vi", largo: "viernes" },
  { corto: "Sá", largo: "sábado" },
  { corto: "Do", largo: "domingo" },
] as const;

const FORMATO_MES = new Intl.DateTimeFormat("es-VE", {
  month: "long",
  year: "numeric",
});

const FORMATO_DIA_COMPLETO = new Intl.DateTimeFormat("es-VE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type Props = {
  /** Identificador base para asociar el calendario con su campo. */
  idBase: string;
  /** Fecha seleccionada en formato `YYYY-MM-DD`; vacío si no hay. */
  valor: string;
  min?: string;
  max?: string;
  /** Nombre del campo, usado en las etiquetas accesibles. */
  etiqueta: string;
  onSeleccionar: (valor: string) => void;
  onLimpiar: () => void;
  onCerrar: () => void;
};

function primerDiaDelMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Acota una fecha al rango permitido y la normaliza al inicio del día. */
function acotar(fecha: Date, minimo: Date | null, maximo: Date | null): Date {
  const copia = inicioDelDia(fecha);
  if (minimo && copia < minimo) return new Date(minimo);
  if (maximo && copia > maximo) return new Date(maximo);
  return copia;
}

function enRango(
  fecha: Date,
  minimo: Date | null,
  maximo: Date | null,
): boolean {
  const tiempo = inicioDelDia(fecha).getTime();
  if (minimo && tiempo < minimo.getTime()) return false;
  if (maximo && tiempo > maximo.getTime()) return false;
  return true;
}

/** Construye 6 semanas completas empezando en lunes. */
function crearDiasCuadricula(mes: Date): Date[] {
  const primerDia = primerDiaDelMes(mes);
  const desplazamiento = (primerDia.getDay() + 6) % 7;
  const inicio = sumarDias(primerDia, -desplazamiento);
  return Array.from({ length: 42 }, (_, indice) => sumarDias(inicio, indice));
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatearDiaAria(dia: Date, hoy: Date): string {
  const texto = FORMATO_DIA_COMPLETO.format(dia);
  return esMismoDia(dia, hoy) ? `Hoy, ${texto}` : texto;
}

/**
 * Calendario mensual accesible con navegación por teclado, límites de fecha y
 * acciones para elegir hoy o limpiar el valor.
 */
export function Calendario({
  idBase,
  valor,
  min,
  max,
  etiqueta,
  onSeleccionar,
  onLimpiar,
  onCerrar,
}: Props) {
  const hoy = inicioDelDia(new Date());
  const minimo = useMemo(() => parsearFechaIso(min ?? ""), [min]);
  const maximo = useMemo(() => parsearFechaIso(max ?? ""), [max]);

  const [mesVisible, setMesVisible] = useState(() => {
    const base = acotar(parsearFechaIso(valor) ?? hoy, minimo, maximo);
    return primerDiaDelMes(base);
  });
  const [diaEnfocado, setDiaEnfocado] = useState(() =>
    acotar(parsearFechaIso(valor) ?? hoy, minimo, maximo),
  );

  const contenedorRef = useRef<HTMLDivElement>(null);
  const enfocarDiaRef = useRef(true);

  useEffect(() => {
    if (!enfocarDiaRef.current) return;
    enfocarDiaRef.current = false;
    const boton = contenedorRef.current?.querySelector<HTMLButtonElement>(
      `[data-fecha="${fechaAInput(diaEnfocado)}"]`,
    );
    boton?.focus();
  }, [diaEnfocado]);

  const dias = useMemo(() => crearDiasCuadricula(mesVisible), [mesVisible]);
  const tituloMes = capitalizar(FORMATO_MES.format(mesVisible));
  const idTitulo = `${idBase}-titulo-mes`;
  const hoyEnRango = enRango(hoy, minimo, maximo);

  function moverEnfocado(destino: Date) {
    const acotado = acotar(destino, minimo, maximo);
    enfocarDiaRef.current = true;
    if (
      acotado.getFullYear() !== mesVisible.getFullYear() ||
      acotado.getMonth() !== mesVisible.getMonth()
    ) {
      setMesVisible(primerDiaDelMes(acotado));
    }
    setDiaEnfocado(acotado);
  }

  function cambiarMes(delta: number, moverFoco: boolean) {
    const nuevoMes = new Date(
      mesVisible.getFullYear(),
      mesVisible.getMonth() + delta,
      1,
    );
    const ultimoDia = new Date(
      nuevoMes.getFullYear(),
      nuevoMes.getMonth() + 1,
      0,
    ).getDate();
    const candidato = acotar(
      new Date(
        nuevoMes.getFullYear(),
        nuevoMes.getMonth(),
        Math.min(diaEnfocado.getDate(), ultimoDia),
      ),
      minimo,
      maximo,
    );

    enfocarDiaRef.current = moverFoco;
    setMesVisible(primerDiaDelMes(candidato));
    setDiaEnfocado(candidato);
  }

  function manejarTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    let destino: Date | null = null;

    switch (evento.key) {
      case "ArrowLeft":
        destino = sumarDias(diaEnfocado, -1);
        break;
      case "ArrowRight":
        destino = sumarDias(diaEnfocado, 1);
        break;
      case "ArrowUp":
        destino = sumarDias(diaEnfocado, -7);
        break;
      case "ArrowDown":
        destino = sumarDias(diaEnfocado, 7);
        break;
      case "Home": {
        const desplazamiento = (diaEnfocado.getDay() + 6) % 7;
        destino = sumarDias(diaEnfocado, -desplazamiento);
        break;
      }
      case "End": {
        const desplazamiento = (diaEnfocado.getDay() + 6) % 7;
        destino = sumarDias(diaEnfocado, 6 - desplazamiento);
        break;
      }
      case "PageUp":
        evento.preventDefault();
        cambiarMes(-1, true);
        return;
      case "PageDown":
        evento.preventDefault();
        cambiarMes(1, true);
        return;
      case "Escape":
        evento.preventDefault();
        evento.stopPropagation();
        onCerrar();
        return;
      default:
        return;
    }

    evento.preventDefault();
    moverEnfocado(destino);
  }

  return (
    <div
      ref={contenedorRef}
      id={idBase}
      role="dialog"
      aria-label={`Calendario de ${etiqueta}`}
      onKeyDown={manejarTeclado}
      className="w-[min(20rem,calc(100vw-2rem))] animate-dialogo-entrada rounded-lg border border-border bg-elevated p-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => cambiarMes(-1, false)}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <p id={idTitulo} aria-live="polite" className="text-sm font-semibold">
          {tituloMes}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => cambiarMes(1, false)}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div
        role="grid"
        aria-labelledby={idTitulo}
        className="mt-2 flex flex-col gap-1"
      >
        <div role="row" className="grid grid-cols-7 gap-1">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia.corto}
              role="columnheader"
              aria-label={dia.largo}
              className="flex h-7 items-center justify-center text-[11px] font-medium text-muted-foreground"
            >
              {dia.corto}
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, indiceSemana) => (
          <div key={indiceSemana} role="row" className="grid grid-cols-7 gap-1">
            {dias.slice(indiceSemana * 7, indiceSemana * 7 + 7).map((dia) => {
              const iso = fechaAInput(dia);
              const seleccionado = valor === iso;
              const esHoy = esMismoDia(dia, hoy);
              const deshabilitado = !enRango(dia, minimo, maximo);
              const enfocado = esMismoDia(dia, diaEnfocado);
              const fueraDeMes =
                dia.getMonth() !== mesVisible.getMonth() ||
                dia.getFullYear() !== mesVisible.getFullYear();

              return (
                <div
                  key={iso}
                  role="gridcell"
                  aria-selected={seleccionado}
                  className="flex"
                >
                  <button
                    type="button"
                    data-fecha={iso}
                    tabIndex={enfocado ? 0 : -1}
                    disabled={deshabilitado}
                    aria-label={formatearDiaAria(dia, hoy)}
                    aria-current={esHoy ? "date" : undefined}
                    onClick={() => onSeleccionar(iso)}
                    className={cn(
                      "flex h-9 w-full items-center justify-center rounded-md text-sm tabular-nums transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-elevated disabled:cursor-not-allowed disabled:opacity-35",
                      seleccionado
                        ? "bg-primary font-semibold text-primary-foreground hover:bg-primary-hover"
                        : "hover:bg-muted",
                      !seleccionado && esHoy && "ring-1 ring-primary/50",
                      !seleccionado && fueraDeMes && "text-muted-foreground/60",
                    )}
                  >
                    {dia.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLimpiar}
          disabled={!valor}
        >
          Limpiar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSeleccionar(fechaAInput(hoy))}
          disabled={!hoyEnRango}
        >
          Hoy
        </Button>
      </div>
    </div>
  );
}

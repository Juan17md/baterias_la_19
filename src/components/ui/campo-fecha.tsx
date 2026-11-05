"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import { CalendarDays } from "lucide-react";
import { Calendario } from "@/components/ui/calendario";
import { Input } from "@/components/ui/input";
import {
  cn,
  formatearFechaEntrada,
  parsearFechaEntrada,
  parsearFechaIso,
} from "@/lib/utils";

type Props = {
  id?: string;
  name?: string;
  /** Fecha en formato `YYYY-MM-DD`; cadena vacía para sin valor. */
  valor: string;
  onCambio: (valor: string) => void;
  min?: string;
  max?: string;
  /** Nombre del campo para las etiquetas accesibles del calendario. */
  etiqueta: string;
  /** Id del mensaje de error para asociarlo al campo. */
  errorId?: string;
  /** Marca el campo como inválido cuando el rango no es válido. */
  invalido?: boolean;
  /** Lado del campo al que se ancla el calendario. */
  alineacion?: "izquierda" | "derecha";
};

/**
 * Campo de fecha con entrada de texto y calendario propio.
 * Mantiene el valor en `YYYY-MM-DD` y acepta `dd/mm/aaaa`, `dd-mm-aaaa`,
 * `dd.mm.aaaa`, `aaaa-mm-dd` y `ddmmaaaa`.
 */
export function CampoFecha({
  id,
  name,
  valor,
  onCambio,
  min,
  max,
  etiqueta,
  errorId,
  invalido = false,
  alineacion = "izquierda",
}: Props) {
  const idGenerado = useId().replace(/:/g, "");
  const idCampo = id ?? `campo-fecha-${idGenerado}`;
  const idCalendario = `${idCampo}-calendario`;
  const raizRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLInputElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const punteroDentroRef = useRef(false);

  const fecha = parsearFechaIso(valor);
  const textoVisible = editando
    ? texto
    : fecha
      ? formatearFechaEntrada(fecha)
      : "";

  useEffect(() => {
    if (!abierto) return;

    function manejarPointerExterno(evento: PointerEvent) {
      if (!raizRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }

    function manejarTeclaExterna(evento: globalThis.KeyboardEvent) {
      if (evento.key !== "Escape") return;
      evento.preventDefault();
      setAbierto(false);
      requestAnimationFrame(() => botonRef.current?.focus());
    }

    document.addEventListener("pointerdown", manejarPointerExterno);
    document.addEventListener("keydown", manejarTeclaExterna);
    return () => {
      document.removeEventListener("pointerdown", manejarPointerExterno);
      document.removeEventListener("keydown", manejarTeclaExterna);
    };
  }, [abierto]);

  function textoNormalizado(): string {
    return fecha ? formatearFechaEntrada(fecha) : "";
  }

  function manejarFoco() {
    setTexto(textoNormalizado());
    setEditando(true);
  }

  function manejarDesenfoque() {
    setEditando(false);
    setTexto(textoNormalizado());
  }

  function manejarSalidaFoco(evento: FocusEvent<HTMLDivElement>) {
    if (!abierto) return;
    const destino = evento.relatedTarget as Node | null;
    if (destino && raizRef.current?.contains(destino)) return;
    if (!destino && punteroDentroRef.current) return;
    setAbierto(false);
  }

  function manejarPunteroDentro() {
    punteroDentroRef.current = true;
    requestAnimationFrame(() => {
      punteroDentroRef.current = false;
    });
  }

  function manejarCambio(evento: ChangeEvent<HTMLInputElement>) {
    const nuevoTexto = evento.target.value;
    setTexto(nuevoTexto);

    if (!nuevoTexto.trim()) {
      if (valor) onCambio("");
      return;
    }

    const nuevaFecha = parsearFechaEntrada(nuevoTexto);
    if (nuevaFecha && nuevaFecha !== valor) onCambio(nuevaFecha);
  }

  function abrirCalendario() {
    setEditando(false);
    setTexto(textoNormalizado());
    setAbierto(true);
  }

  function cerrarCalendario(enfocarBoton = true) {
    setAbierto(false);
    if (enfocarBoton) {
      requestAnimationFrame(() => botonRef.current?.focus());
    }
  }

  function alternarCalendario() {
    if (abierto) {
      cerrarCalendario();
    } else {
      abrirCalendario();
    }
  }

  function seleccionarFecha(nuevaFecha: string) {
    onCambio(nuevaFecha);
    cerrarCalendario();
  }

  function limpiarFecha() {
    onCambio("");
    cerrarCalendario();
  }

  function manejarTecladoEntrada(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape" && abierto) {
      evento.preventDefault();
      cerrarCalendario();
      return;
    }

    if (
      evento.altKey &&
      (evento.key === "ArrowDown" || evento.key === "ArrowUp")
    ) {
      evento.preventDefault();
      abrirCalendario();
      return;
    }

    if (evento.key !== "Enter") return;
    evento.preventDefault();

    if (!texto.trim()) {
      if (valor) onCambio("");
    } else {
      const nuevaFecha = parsearFechaEntrada(texto);
      if (nuevaFecha) {
        if (nuevaFecha !== valor) onCambio(nuevaFecha);
      } else {
        setTexto(textoNormalizado());
      }
    }

    setEditando(false);
  }

  return (
    <div
      ref={raizRef}
      className="relative"
      onBlur={manejarSalidaFoco}
      onPointerDownCapture={manejarPunteroDentro}
    >
      <Input
        ref={entradaRef}
        id={idCampo}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        value={textoVisible}
        onFocus={manejarFoco}
        onBlur={manejarDesenfoque}
        onChange={manejarCambio}
        onKeyDown={manejarTecladoEntrada}
        aria-invalid={invalido || undefined}
        aria-describedby={errorId}
        className="pr-10"
      />
      <button
        ref={botonRef}
        type="button"
        onClick={alternarCalendario}
        aria-label={
          abierto
            ? `Cerrar calendario de ${etiqueta}`
            : `Abrir calendario de ${etiqueta}`
        }
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? idCalendario : undefined}
        className="absolute top-0 right-0 flex size-9 items-center justify-center rounded-r-md text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        <CalendarDays className="size-4" aria-hidden="true" />
      </button>

      {abierto ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.375rem)] z-50",
            alineacion === "derecha" ? "right-0" : "left-0",
          )}
        >
          <Calendario
            idBase={idCalendario}
            valor={valor}
            min={min}
            max={max}
            etiqueta={etiqueta}
            onSeleccionar={seleccionarFecha}
            onLimpiar={limpiarFecha}
            onCerrar={() => cerrarCalendario()}
          />
        </div>
      ) : null}
    </div>
  );
}

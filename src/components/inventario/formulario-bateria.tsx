"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasa } from "@/hooks/use-tasa";
import {
  esquemaDatosBateria,
  esquemaNuevaBateria,
  type DatosBateria,
  type DatosNuevaBateria,
} from "@/lib/validaciones/baterias";
import { formatearNumero } from "@/lib/utils";
import type { Bateria } from "@/types";

type FormularioEstado = {
  codigo: string;
  marca: string;
  modelo: string;
  voltaje: string;
  amperaje: string;
  precioCompra: string;
  precioVenta: string;
  stockInicial: string;
  stockMinimo: string;
  proveedor: string;
  garantiaMeses: string;
};

const ESTADO_INICIAL: FormularioEstado = {
  codigo: "",
  marca: "",
  modelo: "",
  voltaje: "12",
  amperaje: "",
  precioCompra: "",
  precioVenta: "",
  stockInicial: "0",
  stockMinimo: "1",
  proveedor: "",
  garantiaMeses: "0",
};

function desdeBateria(bateria: Bateria): FormularioEstado {
  return {
    codigo: bateria.codigo,
    marca: bateria.marca,
    modelo: bateria.modelo,
    voltaje: String(bateria.voltaje),
    amperaje: String(bateria.amperaje),
    precioCompra: String(bateria.precioCompra),
    precioVenta: String(bateria.precioVenta),
    stockInicial: "0",
    stockMinimo: String(bateria.stockMinimo),
    proveedor: bateria.proveedor ?? "",
    garantiaMeses: String(bateria.garantiaMeses),
  };
}

function numeroDesdeTexto(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

type CampoTextoProps = {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  error?: string;
  marcador?: string;
  ayuda?: string;
  inputMode?: "text" | "decimal" | "numeric";
};

function CampoTexto({
  id,
  etiqueta,
  valor,
  onChange,
  error,
  marcador,
  ayuda,
  inputMode = "text",
}: CampoTextoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {etiqueta}
      </label>
      <Input
        id={id}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={marcador}
        inputMode={inputMode}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type PropsCrear = {
  modo: "crear";
  textoBoton: string;
  guardando: boolean;
  onGuardar: (datos: DatosNuevaBateria) => void;
  onCancelar?: () => void;
  errorServidor?: string | null;
};

type PropsEditar = {
  modo: "editar";
  valoresIniciales: Bateria;
  textoBoton: string;
  guardando: boolean;
  onGuardar: (datos: DatosBateria) => void;
  onCancelar?: () => void;
  errorServidor?: string | null;
};

/**
 * Formulario de batería reutilizado por el alta (`/inventario/nuevo`) y por la
 * edición de la ficha. Valida con Zod y muestra los precios en $ con su
 * referencia viva en Bs usando la tasa vigente.
 */
export function FormularioBateria(props: PropsCrear | PropsEditar) {
  const { tasa } = useTasa();
  const [estado, setEstado] = useState<FormularioEstado>(() =>
    props.modo === "editar"
      ? desdeBateria(props.valoresIniciales)
      : ESTADO_INICIAL,
  );
  const [errores, setErrores] = useState<Record<string, string>>({});

  function actualizarCampo(campo: keyof FormularioEstado, valor: string) {
    setEstado((anterior) => ({ ...anterior, [campo]: valor }));
    setErrores((anteriores) => {
      if (!anteriores[campo]) return anteriores;
      const copia = { ...anteriores };
      delete copia[campo];
      return copia;
    });
  }

  function ayudaBss(textoPrecio: string): string | undefined {
    if (!tasa) return "Tasa BCV no disponible por ahora.";
    const numero = numeroDesdeTexto(textoPrecio);
    if (numero === null) return undefined;
    return `≈ Bs ${formatearNumero(numero * tasa.valor)} (tasa ${formatearNumero(tasa.valor, 4)})`;
  }

  function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (props.guardando) return;

    const resultado =
      props.modo === "crear"
        ? esquemaNuevaBateria.safeParse(estado)
        : esquemaDatosBateria.safeParse(estado);

    if (!resultado.success) {
      const nuevos: Record<string, string> = {};
      for (const problema of resultado.error.issues) {
        const campo = String(problema.path[0] ?? "");
        if (campo && !nuevos[campo]) nuevos[campo] = problema.message;
      }
      setErrores(nuevos);
      return;
    }

    setErrores({});
    if (props.modo === "crear") {
      props.onGuardar(resultado.data as DatosNuevaBateria);
    } else {
      props.onGuardar(resultado.data as DatosBateria);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-6" noValidate>
      {props.errorServidor ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text"
        >
          {props.errorServidor}
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Identificación</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CampoTexto
            id="bateria-codigo"
            etiqueta="Código (SKU)"
            valor={estado.codigo}
            onChange={(valor) => actualizarCampo("codigo", valor)}
            error={errores.codigo}
            marcador="Ej. BL19-0012"
          />
          <CampoTexto
            id="bateria-marca"
            etiqueta="Marca"
            valor={estado.marca}
            onChange={(valor) => actualizarCampo("marca", valor)}
            error={errores.marca}
            marcador="Ej. Duncan"
          />
          <CampoTexto
            id="bateria-modelo"
            etiqueta="Modelo"
            valor={estado.modelo}
            onChange={(valor) => actualizarCampo("modelo", valor)}
            error={errores.modelo}
            marcador="Ej. W60038"
          />
          <CampoTexto
            id="bateria-voltaje"
            etiqueta="Voltaje (V)"
            valor={estado.voltaje}
            onChange={(valor) => actualizarCampo("voltaje", valor)}
            error={errores.voltaje}
            marcador="Ej. 12"
            inputMode="decimal"
          />
          <CampoTexto
            id="bateria-amperaje"
            etiqueta="Amperaje (Ah)"
            valor={estado.amperaje}
            onChange={(valor) => actualizarCampo("amperaje", valor)}
            error={errores.amperaje}
            marcador="Ej. 600"
            inputMode="decimal"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Precios y stock</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CampoTexto
            id="bateria-precio-compra"
            etiqueta="Precio de compra ($)"
            valor={estado.precioCompra}
            onChange={(valor) => actualizarCampo("precioCompra", valor)}
            error={errores.precioCompra}
            marcador="Ej. 45,00"
            inputMode="decimal"
            ayuda={ayudaBss(estado.precioCompra)}
          />
          <CampoTexto
            id="bateria-precio-venta"
            etiqueta="Precio de venta ($)"
            valor={estado.precioVenta}
            onChange={(valor) => actualizarCampo("precioVenta", valor)}
            error={errores.precioVenta}
            marcador="Ej. 65,00"
            inputMode="decimal"
            ayuda={ayudaBss(estado.precioVenta)}
          />
          {props.modo === "crear" ? (
            <CampoTexto
              id="bateria-stock-inicial"
              etiqueta="Stock inicial"
              valor={estado.stockInicial}
              onChange={(valor) => actualizarCampo("stockInicial", valor)}
              error={errores.stockInicial}
              marcador="Ej. 4"
              inputMode="numeric"
              ayuda="Queda registrado como movimiento de entrada."
            />
          ) : null}
          <CampoTexto
            id="bateria-stock-minimo"
            etiqueta="Stock mínimo (alerta)"
            valor={estado.stockMinimo}
            onChange={(valor) => actualizarCampo("stockMinimo", valor)}
            error={errores.stockMinimo}
            marcador="Ej. 2"
            inputMode="numeric"
          />
          <CampoTexto
            id="bateria-garantia"
            etiqueta="Garantía (meses)"
            valor={estado.garantiaMeses}
            onChange={(valor) => actualizarCampo("garantiaMeses", valor)}
            error={errores.garantiaMeses}
            marcador="0 si no aplica"
            inputMode="numeric"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Proveedor</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            id="bateria-proveedor"
            etiqueta="Proveedor habitual (opcional)"
            valor={estado.proveedor}
            onChange={(valor) => actualizarCampo("proveedor", valor)}
            error={errores.proveedor}
            marcador="Ej. Importadora El Voltaje"
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {props.onCancelar ? (
          <Button
            type="button"
            variant="outline"
            onClick={props.onCancelar}
            disabled={props.guardando}
          >
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={props.guardando}>
          {props.guardando ? "Guardando…" : props.textoBoton}
        </Button>
      </div>
    </form>
  );
}

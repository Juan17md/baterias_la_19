"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useTasa } from "@/hooks/use-tasa";
import { listarBaterias } from "@/lib/servicios/baterias";
import { registrarVenta, type ResultadoVenta } from "@/lib/servicios/ventas";
import {
  enfocarPrimerCampoInvalido,
  formatearNumero,
  normalizarTexto,
} from "@/lib/utils";
import { esquemaVenta, METODOS_PAGO } from "@/lib/validaciones/ventas";
import type { Bateria, MetodoPago } from "@/types";
import { ETIQUETAS_METODO_PAGO } from "./etiquetas";

const MAXIMO_RESULTADOS = 6;

type Linea = { bateria: Bateria; cantidad: number };

type Props = {
  abierto: boolean;
  onAbiertoCambio: (abierto: boolean) => void;
  /** Batería preseleccionada cuando la venta se inicia desde su ficha. */
  bateriaInicial?: Bateria | null;
  /** Se invoca tras registrar la venta para refrescar listados o la ficha. */
  onVentaRegistrada?: (venta: ResultadoVenta) => void;
};

/**
 * Modal de venta rápida: búsqueda en el catálogo, carrito con cantidades,
 * totales en $ y Bs, método de pago y datos opcionales del cliente. La venta
 * se confirma en una transacción atómica en `lib/servicios/ventas`.
 */
export function DialogoRegistrarVenta({
  abierto,
  onAbiertoCambio,
  bateriaInicial = null,
  onVentaRegistrada,
}: Props) {
  const { perfil } = useAuth();
  const { tasa } = useTasa();
  const idInicial = bateriaInicial?.id ?? null;

  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [cargandoBaterias, setCargandoBaterias] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [descuento, setDescuento] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo_usd");
  const [incluyeInstalacion, setIncluyeInstalacion] = useState(false);
  const [recibioBateriaUsada, setRecibioBateriaUsada] = useState(false);
  const [notas, setNotas] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoVenta | null>(null);

  // Al abrir: limpia el formulario y carga las baterías con stock disponible.
  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;

    async function cargar() {
      setBusqueda("");
      setLineas([]);
      setClienteNombre("");
      setClienteTelefono("");
      setDescuento("");
      setMetodoPago("efectivo_usd");
      setIncluyeInstalacion(false);
      setRecibioBateriaUsada(false);
      setNotas("");
      setErrores({});
      setErrorServidor(null);
      setResultado(null);
      setCargandoBaterias(true);

      try {
        const lista = await listarBaterias();
        if (cancelado) return;
        const disponibles = lista.filter(
          (bateria) => bateria.activo && bateria.stock > 0,
        );
        setBaterias(disponibles);
        if (idInicial) {
          const encontrada = disponibles.find(
            (bateria) => bateria.id === idInicial,
          );
          if (encontrada) {
            setLineas([{ bateria: encontrada, cantidad: 1 }]);
          }
        }
      } catch {
        if (!cancelado) {
          toast.error("No se pudo cargar el inventario disponible.");
        }
      } finally {
        if (!cancelado) setCargandoBaterias(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [abierto, idInicial]);

  const resultados = useMemo(() => {
    const termino = normalizarTexto(busqueda);
    const filtradas = termino
      ? baterias.filter((bateria) =>
          normalizarTexto(
            `${bateria.codigo} ${bateria.marca} ${bateria.modelo}`,
          ).includes(termino),
        )
      : baterias;
    return filtradas.slice(0, MAXIMO_RESULTADOS);
  }, [baterias, busqueda]);

  const subtotal = lineas.reduce(
    (suma, linea) => suma + linea.bateria.precioVenta * linea.cantidad,
    0,
  );
  const descuentoNumero =
    descuento.trim() === "" ? 0 : Number(descuento.trim().replace(",", "."));
  const descuentoValido =
    Number.isFinite(descuentoNumero) && descuentoNumero >= 0;
  const descuentoExcedido = descuentoValido && descuentoNumero > subtotal;
  const total = descuentoValido ? subtotal - descuentoNumero : subtotal;
  const totalBs = tasa ? total * tasa.valor : null;

  function manejarCambio(abiertoNuevo: boolean) {
    if (!abiertoNuevo && guardando) return;
    if (!abiertoNuevo) {
      setResultado(null);
      setLineas([]);
      setBusqueda("");
      setClienteNombre("");
      setClienteTelefono("");
      setDescuento("");
      setMetodoPago("efectivo_usd");
      setIncluyeInstalacion(false);
      setRecibioBateriaUsada(false);
      setNotas("");
      setErrores({});
      setErrorServidor(null);
    }
    onAbiertoCambio(abiertoNuevo);
  }

  function agregarBateria(bateria: Bateria) {
    const existente = lineas.find((linea) => linea.bateria.id === bateria.id);
    if (existente) {
      if (existente.cantidad >= bateria.stock) {
        toast.info(`Solo hay ${bateria.stock} unidades de ${bateria.codigo}.`);
        return;
      }
      setLineas((actuales) =>
        actuales.map((linea) =>
          linea.bateria.id === bateria.id
            ? { ...linea, cantidad: linea.cantidad + 1 }
            : linea,
        ),
      );
      return;
    }
    setLineas((actuales) => [...actuales, { bateria, cantidad: 1 }]);
  }

  function cambiarCantidad(bateriaId: string, delta: number) {
    setLineas((actuales) =>
      actuales.map((linea) => {
        if (linea.bateria.id !== bateriaId) return linea;
        const cantidad = Math.min(
          Math.max(1, linea.cantidad + delta),
          linea.bateria.stock,
        );
        return { ...linea, cantidad };
      }),
    );
  }

  function quitarBateria(bateriaId: string) {
    setLineas((actuales) =>
      actuales.filter((linea) => linea.bateria.id !== bateriaId),
    );
  }

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando || !perfil) return;

    const formulario = evento.currentTarget;
    const validado = esquemaVenta.safeParse({
      items: lineas.map((linea) => ({
        bateriaId: linea.bateria.id,
        cantidad: linea.cantidad,
      })),
      descuento,
      clienteNombre,
      clienteTelefono,
      metodoPago,
      incluyeInstalacion,
      recibioBateriaUsada,
      notas,
    });
    if (!validado.success) {
      const nuevos: Record<string, string> = {};
      for (const problema of validado.error.issues) {
        const campo = String(problema.path[0] ?? "");
        if (campo && !nuevos[campo]) nuevos[campo] = problema.message;
      }
      setErrores(nuevos);
      enfocarPrimerCampoInvalido(formulario);
      return;
    }
    if (descuentoExcedido) {
      setErrores({
        descuento: "El descuento no puede superar el subtotal.",
      });
      enfocarPrimerCampoInvalido(formulario);
      return;
    }

    setErrores({});
    setErrorServidor(null);
    setGuardando(true);
    try {
      const creada = await registrarVenta(validado.data, {
        uid: perfil.uid,
        nombre: perfil.nombre,
      });
      setResultado(creada);
      toast.success(`Venta N.º ${creada.numero} registrada.`);
      onVentaRegistrada?.(creada);
    } catch (fallo) {
      setErrorServidor(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo registrar la venta.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={manejarCambio}>
      <DialogContent className="max-w-3xl">
        {resultado ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Venta registrada</DialogTitle>
              <DialogDescription>
                Resumen de la venta registrada correctamente.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success-text">
                <CheckCircle2 className="size-6" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">
                  Venta N.º {resultado.numero} registrada
                </h2>
                <p className="text-sm text-muted-foreground">
                  Total:{" "}
                  <span className="font-mono">
                    $ {formatearNumero(resultado.total)}
                  </span>{" "}
                  ·{" "}
                  <span className="font-mono">
                    Bs {formatearNumero(resultado.totalBs)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Tasa aplicada: {formatearNumero(resultado.tasaBCV, 4)} Bs/$ ·
                  El stock y los movimientos se actualizaron.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button asChild variant="outline">
                  <Link
                    href={`/dashboard/historial/venta/${resultado.id}`}
                    onClick={() => manejarCambio(false)}
                  >
                    Ver comprobante
                  </Link>
                </Button>
                <Button onClick={() => manejarCambio(false)}>Cerrar</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Registrar venta</DialogTitle>
              <DialogDescription>
                Descuenta el stock, crea los movimientos de salida y guarda el
                consecutivo en una sola transacción.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={manejarEnvio}
              className="flex flex-col gap-5"
              noValidate
            >
              {errorServidor ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{errorServidor}</span>
                </div>
              ) : null}

              <section className="flex flex-col gap-2">
                <label htmlFor="venta-buscar" className="text-xs font-medium">
                  Buscar batería
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="venta-buscar"
                    name="busqueda"
                    type="search"
                    value={busqueda}
                    onChange={(evento) => setBusqueda(evento.target.value)}
                    placeholder="Código, marca o modelo…"
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>
                <p className="sr-only" role="status">
                  {cargandoBaterias
                    ? "Cargando inventario"
                    : `${resultados.length} resultados disponibles`}
                </p>
                <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                  {cargandoBaterias ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      Cargando inventario…
                    </p>
                  ) : resultados.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      {baterias.length === 0
                        ? "No hay baterías activas con stock disponible."
                        : "Sin resultados para esa búsqueda."}
                    </p>
                  ) : (
                    resultados.map((bateria) => {
                      const enCarrito = lineas.find(
                        (linea) => linea.bateria.id === bateria.id,
                      );
                      const alMaximo = enCarrito
                        ? enCarrito.cantidad >= bateria.stock
                        : false;
                      return (
                        <div
                          key={bateria.id}
                          className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {bateria.marca}{" "}
                              <span className="font-normal text-muted-foreground">
                                {bateria.modelo}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-mono">
                                {bateria.codigo}
                              </span>{" "}
                              · {bateria.voltaje} V · {bateria.amperaje} Ah ·
                              stock{" "}
                              <span className="font-mono">{bateria.stock}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm">
                              $ {formatearNumero(bateria.precioVenta)}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant={enCarrito ? "secondary" : "outline"}
                              onClick={() => agregarBateria(bateria)}
                              disabled={alMaximo}
                            >
                              <Plus className="size-4" aria-hidden="true" />
                              {alMaximo
                                ? "Máximo"
                                : enCarrito
                                  ? "Agregar otra"
                                  : "Agregar"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCart className="size-4" aria-hidden="true" />
                  Baterías en la venta
                </h3>
                {lineas.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                    Agrega al menos una batería para continuar.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <caption className="sr-only">
                        Baterías incluidas en la venta, con precio, cantidad y
                        subtotal
                      </caption>
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                          <th scope="col" className="px-3 py-2 font-medium">
                            Batería
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-right font-medium"
                          >
                            Precio
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-center font-medium"
                          >
                            Cantidad
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-right font-medium"
                          >
                            Subtotal
                          </th>
                          <th scope="col" className="px-3 py-2">
                            <span className="sr-only">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((linea) => (
                          <tr
                            key={linea.bateria.id}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-3 py-2">
                              <p className="text-sm font-medium">
                                {linea.bateria.marca} {linea.bateria.modelo}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {linea.bateria.codigo}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              $ {formatearNumero(linea.bateria.precioVenta)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="size-7 px-0"
                                  onClick={() =>
                                    cambiarCantidad(linea.bateria.id, -1)
                                  }
                                  disabled={linea.cantidad <= 1}
                                  aria-label={`Quitar una unidad de ${linea.bateria.codigo}`}
                                >
                                  <Minus
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                </Button>
                                <span className="w-8 text-center font-mono text-sm">
                                  {linea.cantidad}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="size-7 px-0"
                                  onClick={() =>
                                    cambiarCantidad(linea.bateria.id, 1)
                                  }
                                  disabled={
                                    linea.cantidad >= linea.bateria.stock
                                  }
                                  aria-label={`Agregar una unidad de ${linea.bateria.codigo}`}
                                >
                                  <Plus
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-sm">
                              ${" "}
                              {formatearNumero(
                                linea.bateria.precioVenta * linea.cantidad,
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="size-7 px-0"
                                onClick={() => quitarBateria(linea.bateria.id)}
                                aria-label={`Quitar ${linea.bateria.codigo} de la venta`}
                              >
                                <Trash2
                                  className="size-3.5 text-destructive-text"
                                  aria-hidden="true"
                                />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {errores.items ? (
                  <p
                    id="venta-items-error"
                    role="alert"
                    className="text-xs text-destructive-text"
                  >
                    {errores.items}
                  </p>
                ) : null}
              </section>

              <section className="grid gap-3 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="venta-descuento"
                    className="text-xs font-medium"
                  >
                    Descuento ($, opcional)
                  </label>
                  <Input
                    id="venta-descuento"
                    name="descuento"
                    value={descuento}
                    onChange={(evento) => {
                      setDescuento(evento.target.value);
                      setErrores((anteriores) => ({
                        ...anteriores,
                        descuento: "",
                      }));
                    }}
                    placeholder="Ej. 5,00"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-invalid={
                      errores.descuento || descuentoExcedido ? true : undefined
                    }
                    aria-describedby={
                      errores.descuento || descuentoExcedido
                        ? "venta-descuento-error"
                        : undefined
                    }
                  />
                  {errores.descuento ? (
                    <p
                      id="venta-descuento-error"
                      role="alert"
                      className="text-xs text-destructive-text"
                    >
                      {errores.descuento}
                    </p>
                  ) : descuentoExcedido ? (
                    <p
                      id="venta-descuento-error"
                      role="alert"
                      className="text-xs text-destructive-text"
                    >
                      El descuento no puede superar el subtotal.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col justify-end gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">
                      $ {formatearNumero(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Descuento</span>
                    <span className="font-mono">
                      − ${" "}
                      {formatearNumero(descuentoValido ? descuentoNumero : 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-1 font-semibold">
                    <span>Total</span>
                    <span className="font-mono">
                      $ {formatearNumero(Math.max(total, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>En Bs (tasa vigente)</span>
                    <span className="font-mono">
                      {totalBs === null
                        ? "—"
                        : `Bs ${formatearNumero(totalBs)}`}
                    </span>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="venta-metodo" className="text-xs font-medium">
                    Método de pago
                  </label>
                  <Select
                    value={metodoPago}
                    onValueChange={(valor) =>
                      setMetodoPago(valor as MetodoPago)
                    }
                  >
                    <SelectTrigger id="venta-metodo">
                      <SelectValue placeholder="Selecciona un método" />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map((metodo) => (
                        <SelectItem key={metodo} value={metodo}>
                          {ETIQUETAS_METODO_PAGO[metodo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-center gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="incluyeInstalacion"
                      className="size-4 rounded border-border accent-primary"
                      checked={incluyeInstalacion}
                      onChange={(evento) =>
                        setIncluyeInstalacion(evento.target.checked)
                      }
                    />
                    Incluye instalación
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="recibioBateriaUsada"
                      className="size-4 rounded border-border accent-primary"
                      checked={recibioBateriaUsada}
                      onChange={(evento) =>
                        setRecibioBateriaUsada(evento.target.checked)
                      }
                    />
                    Recibió batería usada
                  </label>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="venta-cliente"
                    className="text-xs font-medium"
                  >
                    Cliente (opcional)
                  </label>
                  <Input
                    id="venta-cliente"
                    name="cliente"
                    value={clienteNombre}
                    onChange={(evento) => {
                      setClienteNombre(evento.target.value);
                      setErrores((anteriores) => ({
                        ...anteriores,
                        clienteNombre: "",
                      }));
                    }}
                    placeholder="Ej. Juan Pérez"
                    autoComplete="off"
                    aria-invalid={errores.clienteNombre ? true : undefined}
                    aria-describedby={
                      errores.clienteNombre ? "venta-cliente-error" : undefined
                    }
                  />
                  {errores.clienteNombre ? (
                    <p
                      id="venta-cliente-error"
                      role="alert"
                      className="text-xs text-destructive-text"
                    >
                      {errores.clienteNombre}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="venta-telefono"
                    className="text-xs font-medium"
                  >
                    Teléfono (opcional)
                  </label>
                  <Input
                    id="venta-telefono"
                    name="telefono"
                    value={clienteTelefono}
                    onChange={(evento) =>
                      setClienteTelefono(evento.target.value)
                    }
                    placeholder="Ej. 0414-1234567"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              </section>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="venta-notas" className="text-xs font-medium">
                  Notas (opcional)
                </label>
                <textarea
                  id="venta-notas"
                  name="notas"
                  value={notas}
                  onChange={(evento) => setNotas(evento.target.value)}
                  rows={2}
                  placeholder="Ej. Instalación a domicilio, observaciones del cliente…"
                  className="flex w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
                  aria-invalid={errores.notas ? true : undefined}
                  aria-describedby={
                    errores.notas ? "venta-notas-error" : undefined
                  }
                />
                {errores.notas ? (
                  <p
                    id="venta-notas-error"
                    role="alert"
                    className="text-xs text-destructive-text"
                  >
                    {errores.notas}
                  </p>
                ) : null}
              </div>

              {!tasa ? (
                <p className="text-xs text-warning-text">
                  No hay una tasa BCV vigente; no se puede registrar la venta.
                </p>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => manejarCambio(false)}
                  disabled={guardando}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    guardando ||
                    lineas.length === 0 ||
                    descuentoExcedido ||
                    !tasa
                  }
                >
                  {guardando ? "Registrando…" : "Registrar venta"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

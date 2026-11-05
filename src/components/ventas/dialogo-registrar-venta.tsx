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
import { User } from "lucide-react";
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
import {
  calcularPlanFinanciamiento,
  CUOTAS_CASHEA,
  DIAS_CASHEA,
  MAXIMO_CUOTAS_TIENDA,
  MAXIMO_DIAS_ENTRE_CUOTAS,
  redondear2,
  type PlanFinanciamientoCalculado,
} from "@/lib/dominio/financiamientos";
import { listarBaterias } from "@/lib/servicios/baterias";
import { registrarVenta, type ResultadoVenta } from "@/lib/servicios/ventas";
import {
  enfocarPrimerCampoInvalido,
  formatearNumero,
  normalizarTexto,
} from "@/lib/utils";
import { esquemaVenta, METODOS_PAGO } from "@/lib/validaciones/ventas";
import type { Bateria, MetodoPago, ModalidadPago } from "@/types";
import { ETIQUETAS_METODO_PAGO, ETIQUETAS_MODALIDAD_PAGO } from "./etiquetas";
import { ResumenFinanciamiento } from "./resumen-financiamiento";

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
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("punto_venta");
  const [modalidadPago, setModalidadPago] = useState<ModalidadPago>("contado");
  const [inicial, setInicial] = useState("");
  const [numeroCuotas, setNumeroCuotas] = useState("3");
  const [diasEntreCuotas, setDiasEntreCuotas] = useState("15");
  const [incluyeInstalacion, setIncluyeInstalacion] = useState(false);
  const [recibioBateriaUsada, setRecibioBateriaUsada] = useState(false);
  const [porcentajeInicial, setPorcentajeInicial] = useState("0");
  const [modoInicial, setModoInicial] = useState<"porcentaje" | "monto">(
    "porcentaje",
  );
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
      setMetodoPago("punto_venta");
      setModalidadPago("contado");
      setInicial("");
      setNumeroCuotas("3");
      setDiasEntreCuotas("15");
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
  const esFinanciada = modalidadPago !== "contado";
  const totalPrevio = Math.max(total, 0);
  const diasPrevios =
    modalidadPago === "cashea" ? DIAS_CASHEA : Number(diasEntreCuotas);

  const montoInicialCalculado = useMemo(() => {
    if (modalidadPago === "contado") return 0;
    if (modalidadPago === "cashea") {
      const limpio = porcentajeInicial.trim().replace(",", ".");
      const valor = limpio === "" ? 0 : Number(limpio);
      if (!Number.isFinite(valor) || valor < 0) return 0;
      if (modoInicial === "porcentaje") {
        return redondear2((totalPrevio * valor) / 100);
      }
      return redondear2(valor);
    }
    const limpio = inicial.trim().replace(",", ".");
    const valor = limpio === "" ? 0 : Number(limpio);
    return Number.isFinite(valor) && valor >= 0 ? redondear2(valor) : 0;
  }, [modalidadPago, porcentajeInicial, modoInicial, totalPrevio, inicial]);

  const vistaPrevia = useMemo<{
    plan: PlanFinanciamientoCalculado | null;
    error: string | null;
  } | null>(() => {
    if (modalidadPago === "contado") return null;
    if (!(totalPrevio > 0)) {
      return {
        plan: null,
        error: descuentoExcedido
          ? "El descuento no puede superar el subtotal."
          : "Agrega al menos una batería para calcular el plan.",
      };
    }

    if (modalidadPago === "cashea" && modoInicial === "porcentaje") {
      const limpio = porcentajeInicial.trim().replace(",", ".");
      const pct = limpio === "" ? 0 : Number(limpio);
      if (!Number.isFinite(pct) || pct < 0) {
        return { plan: null, error: "Indica un porcentaje de inicial válido." };
      }
      if (pct >= 100) {
        return {
          plan: null,
          error: "La inicial debe ser menor al 100% del total.",
        };
      }
    } else {
      const valorRaw = modalidadPago === "cashea" ? porcentajeInicial : inicial;
      const limpio = valorRaw.trim().replace(",", ".");
      const monto = limpio === "" ? 0 : Number(limpio);
      if (!Number.isFinite(monto) || monto < 0) {
        return {
          plan: null,
          error: "Indica una inicial válida (puede ser 0).",
        };
      }
      if (monto >= totalPrevio) {
        return {
          plan: null,
          error: "La inicial debe ser menor que el total de la venta.",
        };
      }
    }

    try {
      const plan = calcularPlanFinanciamiento({
        modalidad: modalidadPago,
        totalVenta: totalPrevio,
        inicial: montoInicialCalculado,
        recargo: 0,
        numeroCuotas: Number(numeroCuotas),
        diasEntreCuotas: diasPrevios,
        fechaVenta: new Date(),
      });
      return { plan, error: null };
    } catch (fallo) {
      return {
        plan: null,
        error:
          fallo instanceof Error
            ? fallo.message
            : "Revisa los datos del plan de cuotas.",
      };
    }
  }, [
    modalidadPago,
    totalPrevio,
    modoInicial,
    porcentajeInicial,
    inicial,
    montoInicialCalculado,
    numeroCuotas,
    diasPrevios,
    descuentoExcedido,
  ]);

  function manejarCambio(abiertoNuevo: boolean) {
    if (!abiertoNuevo && guardando) return;
    if (!abiertoNuevo) {
      setResultado(null);
      setLineas([]);
      setBusqueda("");
      setClienteNombre("");
      setClienteTelefono("");
      setDescuento("");
      setMetodoPago("punto_venta");
      setModalidadPago("contado");
      setInicial("");
      setPorcentajeInicial("0");
      setModoInicial("porcentaje");
      setNumeroCuotas("3");
      setDiasEntreCuotas("15");
      setIncluyeInstalacion(false);
      setRecibioBateriaUsada(false);
      setNotas("");
      setErrores({});
      setErrorServidor(null);
    }
    onAbiertoCambio(abiertoNuevo);
  }

  function limpiarError(campo: string) {
    setErrores((anteriores) => {
      if (!anteriores[campo]) return anteriores;
      return { ...anteriores, [campo]: "" };
    });
  }

  function cambiarModalidad(valor: string) {
    const nueva = valor as ModalidadPago;
    setModalidadPago(nueva);
    setErrores({});
    if (nueva === "cashea") {
      setNumeroCuotas((actual) =>
        (CUOTAS_CASHEA as readonly number[]).includes(Number(actual))
          ? actual
          : "3",
      );
      setDiasEntreCuotas(String(DIAS_CASHEA));
      setModoInicial("porcentaje");
      setPorcentajeInicial("0");
      return;
    }
    if (nueva === "tienda") {
      setInicial("");
      if (Number(diasEntreCuotas) === DIAS_CASHEA) {
        setDiasEntreCuotas("15");
      }
    }
  }

  function cambiarModoInicial(nuevoModo: "porcentaje" | "monto") {
    if (nuevoModo === modoInicial) return;
    setModoInicial(nuevoModo);
    limpiarError("financiamiento.inicial");
    const actualLimpio = porcentajeInicial.trim().replace(",", ".");
    const num = actualLimpio === "" ? 0 : Number(actualLimpio);
    if (Number.isFinite(num) && num > 0 && totalPrevio > 0) {
      if (nuevoModo === "monto") {
        const enDolares = redondear2((totalPrevio * num) / 100);
        setPorcentajeInicial(String(enDolares));
      } else {
        const enPct = redondear2((num / totalPrevio) * 100);
        setPorcentajeInicial(String(enPct));
      }
    }
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

    if (modalidadPago === "cashea" && modoInicial === "porcentaje") {
      const limpio = porcentajeInicial.trim().replace(",", ".");
      const pct = limpio === "" ? 0 : Number(limpio);
      if (!Number.isFinite(pct) || pct < 0) {
        setErrores({
          "financiamiento.inicial": "Indica un porcentaje de inicial válido.",
        });
        enfocarPrimerCampoInvalido(formulario);
        return;
      }
      if (pct >= 100) {
        setErrores({
          "financiamiento.inicial":
            "La inicial debe ser menor al 100% del total.",
        });
        enfocarPrimerCampoInvalido(formulario);
        return;
      }
    } else if (modalidadPago !== "contado") {
      const valorRaw = modalidadPago === "cashea" ? porcentajeInicial : inicial;
      const limpio = valorRaw.trim().replace(",", ".");
      const monto = limpio === "" ? 0 : Number(limpio);
      if (!Number.isFinite(monto) || monto < 0) {
        setErrores({
          "financiamiento.inicial": "Indica una inicial válida (puede ser 0).",
        });
        enfocarPrimerCampoInvalido(formulario);
        return;
      }
      if (monto >= totalPrevio) {
        setErrores({
          "financiamiento.inicial":
            "La inicial debe ser menor que el total de la venta.",
        });
        enfocarPrimerCampoInvalido(formulario);
        return;
      }
    }

    const validado = esquemaVenta.safeParse({
      items: lineas.map((linea) => ({
        bateriaId: linea.bateria.id,
        cantidad: linea.cantidad,
      })),
      descuento,
      clienteNombre,
      clienteTelefono,
      metodoPago,
      modalidadPago,
      financiamiento:
        modalidadPago === "contado"
          ? undefined
          : {
              inicial: String(montoInicialCalculado),
              numeroCuotas,
              diasEntreCuotas:
                modalidadPago === "cashea"
                  ? String(DIAS_CASHEA)
                  : diasEntreCuotas,
              recargo: "0",
            },
      incluyeInstalacion,
      recibioBateriaUsada,
      notas,
    });
    if (!validado.success) {
      const nuevos: Record<string, string> = {};
      for (const problema of validado.error.issues) {
        const ruta = problema.path.map(String);
        const campo =
          ruta[0] === "financiamiento" && ruta.length > 1
            ? `financiamiento.${ruta[1]}`
            : String(ruta[0] ?? "");
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
      <DialogContent className="max-w-7xl">
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
                {resultado.modalidadPago !== "contado" ? (
                  <p className="text-xs text-muted-foreground">
                    Plan de financiamiento creado (
                    {ETIQUETAS_MODALIDAD_PAGO[resultado.modalidadPago]}). El
                    calendario de cuotas está en el comprobante.
                  </p>
                ) : null}
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
                Descuenta el stock, crea los movimientos de salida y, si aplica,
                el plan de cuotas en una sola transacción.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={manejarEnvio}
              className="mx-auto flex w-full max-w-7xl flex-col gap-5"
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

              <div className="grid items-start gap-5 md:grid-cols-2">
                {/* COLUMNA IZQUIERDA: Buscar batería, Baterías en la venta, Datos del cliente, Notas */}
                <div className="flex flex-col gap-5">
                  <section className="flex flex-col gap-2">
                    <label
                      htmlFor="venta-buscar"
                      className="text-xs font-medium"
                    >
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
                                  · {bateria.voltaje} V · {bateria.amperaje} Ah
                                  · stock{" "}
                                  <span className="font-mono">
                                    {bateria.stock}
                                  </span>
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
                            Baterías incluidas en la venta, con precio, cantidad
                            y subtotal
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
                                    onClick={() =>
                                      quitarBateria(linea.bateria.id)
                                    }
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

                  {/* Datos del cliente */}
                  <section className="rounded-md border border-border p-3">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <User className="size-4" aria-hidden="true" /> Datos del
                      cliente
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md border border-border p-3">
                        <label
                          htmlFor="venta-cliente"
                          className="text-xs font-medium"
                        >
                          {esFinanciada
                            ? "Cliente (obligatorio)"
                            : "Cliente (opcional)"}
                        </label>
                        <Input
                          id="venta-cliente"
                          name="cliente"
                          value={clienteNombre}
                          onChange={(evento) => {
                            setClienteNombre(evento.target.value);
                            limpiarError("clienteNombre");
                          }}
                          placeholder="Ej. Juan Pérez"
                          autoComplete="off"
                          required={esFinanciada}
                          aria-required={esFinanciada || undefined}
                          aria-invalid={
                            errores.clienteNombre ? true : undefined
                          }
                          aria-describedby={
                            errores.clienteNombre
                              ? "venta-cliente-error"
                              : undefined
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
                      <div className="rounded-md border border-border p-3">
                        <label
                          htmlFor="venta-telefono"
                          className="text-xs font-medium"
                        >
                          {esFinanciada
                            ? "Teléfono (obligatorio)"
                            : "Teléfono (opcional)"}
                        </label>
                        <Input
                          id="venta-telefono"
                          name="telefono"
                          value={clienteTelefono}
                          onChange={(evento) => {
                            setClienteTelefono(evento.target.value);
                            limpiarError("clienteTelefono");
                          }}
                          placeholder="Ej. 0414-1234567"
                          inputMode="tel"
                          autoComplete="tel"
                          required={esFinanciada}
                          aria-required={esFinanciada || undefined}
                          aria-invalid={
                            errores.clienteTelefono ? true : undefined
                          }
                          aria-describedby={
                            errores.clienteTelefono
                              ? "venta-telefono-error"
                              : undefined
                          }
                        />
                        {errores.clienteTelefono ? (
                          <p
                            id="venta-telefono-error"
                            role="alert"
                            className="text-xs text-destructive-text"
                          >
                            {errores.clienteTelefono}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <div className="rounded-md border border-border p-3">
                    <label
                      htmlFor="venta-notas"
                      className="text-xs font-medium"
                    >
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
                </div>

                {/* COLUMNA DERECHA: Descuento y total, Modalidad de pago, Resumen financiamiento */}
                <div className="flex flex-col gap-5">
                  <section className="grid gap-3 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border p-3">
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
                          errores.descuento || descuentoExcedido
                            ? true
                            : undefined
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
                          {formatearNumero(
                            descuentoValido ? descuentoNumero : 0,
                          )}
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

                  <section className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md border border-border p-3 sm:col-span-1">
                        <label
                          htmlFor="venta-modalidad"
                          className="text-xs font-medium"
                        >
                          Modalidad de pago
                        </label>
                        <Select
                          value={modalidadPago}
                          onValueChange={cambiarModalidad}
                        >
                          <SelectTrigger id="venta-modalidad">
                            <SelectValue placeholder="Selecciona una modalidad" />
                          </SelectTrigger>
                          <SelectContent>
                            {(["contado", "cashea", "tienda"] as const).map(
                              (modalidad) => (
                                <SelectItem key={modalidad} value={modalidad}>
                                  {ETIQUETAS_MODALIDAD_PAGO[modalidad]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {modalidadPago === "contado"
                            ? "Cobro completo al momento de la venta."
                            : modalidadPago === "cashea"
                              ? "La tienda recibe la inicial y Cashea liquida el saldo."
                              : "Crédito directo de la tienda, sin recargo ni interés."}
                        </p>
                      </div>
                      <div className="rounded-md border border-border p-3 sm:col-span-1">
                        <label
                          htmlFor="venta-metodo"
                          className="text-xs font-medium"
                        >
                          {esFinanciada
                            ? "Método de pago de la inicial"
                            : "Método de pago"}
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
                    </div>

                    {esFinanciada ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {modalidadPago !== "cashea" ? (
                            <div className="rounded-md border border-border p-3 sm:col-span-1">
                              <label
                                htmlFor="venta-inicial"
                                className="text-xs font-medium"
                              >
                                Inicial ($)
                              </label>
                              <Input
                                id="venta-inicial"
                                name="inicial"
                                value={inicial}
                                onChange={(evento) => {
                                  setInicial(evento.target.value);
                                  limpiarError("financiamiento.inicial");
                                }}
                                placeholder="0,00"
                                inputMode="decimal"
                                autoComplete="off"
                                aria-invalid={
                                  errores["financiamiento.inicial"]
                                    ? true
                                    : undefined
                                }
                                aria-describedby={
                                  errores["financiamiento.inicial"]
                                    ? "venta-inicial-error"
                                    : undefined
                                }
                              />
                              {errores["financiamiento.inicial"] ? (
                                <p
                                  id="venta-inicial-error"
                                  role="alert"
                                  className="text-xs text-destructive-text"
                                >
                                  {errores["financiamiento.inicial"]}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Puede ser 0.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-md border border-border p-3 sm:col-span-1">
                              <div className="flex items-center justify-between">
                                <label
                                  htmlFor="venta-inicial"
                                  className="text-xs font-medium"
                                >
                                  {modoInicial === "porcentaje"
                                    ? "Inicial (%)"
                                    : "Inicial ($)"}
                                </label>
                                <div className="flex overflow-hidden rounded-md border border-border">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cambiarModoInicial("porcentaje")
                                    }
                                    className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                                      modoInicial === "porcentaje"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                  >
                                    %
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cambiarModoInicial("monto")}
                                    className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                                      modoInicial === "monto"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                  >
                                    $
                                  </button>
                                </div>
                              </div>
                              <Input
                                id="venta-inicial"
                                name="inicial"
                                value={porcentajeInicial}
                                onChange={(evento) => {
                                  setPorcentajeInicial(evento.target.value);
                                  limpiarError("financiamiento.inicial");
                                }}
                                placeholder={
                                  modoInicial === "porcentaje"
                                    ? "Ej. 40"
                                    : "0,00"
                                }
                                inputMode="decimal"
                                autoComplete="off"
                                aria-invalid={
                                  errores["financiamiento.inicial"]
                                    ? true
                                    : undefined
                                }
                                aria-describedby={
                                  errores["financiamiento.inicial"]
                                    ? "venta-inicial-error"
                                    : undefined
                                }
                              />
                              {errores["financiamiento.inicial"] ? (
                                <p
                                  id="venta-inicial-error"
                                  role="alert"
                                  className="text-xs text-destructive-text"
                                >
                                  {errores["financiamiento.inicial"]}
                                </p>
                              ) : modoInicial === "porcentaje" &&
                                totalPrevio > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Equivale a{" "}
                                  <span className="font-mono font-medium text-foreground">
                                    $ {formatearNumero(montoInicialCalculado)}
                                  </span>
                                  {totalBs !== null && tasa ? (
                                    <>
                                      {" · "}
                                      <span className="font-mono">
                                        Bs{" "}
                                        {formatearNumero(
                                          montoInicialCalculado * tasa.valor,
                                        )}
                                      </span>
                                    </>
                                  ) : null}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  {modoInicial === "porcentaje"
                                    ? "Indica el porcentaje requerido por Cashea."
                                    : "Indica el monto recibido en la tienda."}
                                </p>
                              )}
                            </div>
                          )}

                          {modalidadPago === "cashea" ? (
                            <div className="rounded-md border border-border p-3 sm:col-span-1">
                              <label
                                htmlFor="venta-cuotas"
                                className="text-xs font-medium"
                              >
                                Cuotas de Cashea
                              </label>
                              <Select
                                value={numeroCuotas}
                                onValueChange={(valor) => {
                                  setNumeroCuotas(valor);
                                  limpiarError("financiamiento.numeroCuotas");
                                }}
                              >
                                <SelectTrigger id="venta-cuotas">
                                  <SelectValue placeholder="Selecciona cuotas" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CUOTAS_CASHEA.map((cuotas) => (
                                    <SelectItem
                                      key={cuotas}
                                      value={String(cuotas)}
                                    >
                                      {cuotas}{" "}
                                      {cuotas === 1 ? "cuota" : "cuotas"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errores["financiamiento.numeroCuotas"] ? (
                                <p
                                  id="venta-cuotas-error"
                                  role="alert"
                                  className="text-xs text-destructive-text"
                                >
                                  {errores["financiamiento.numeroCuotas"]}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="rounded-md border border-border p-3 sm:col-span-1">
                              <label
                                htmlFor="venta-cuotas"
                                className="text-xs font-medium"
                              >
                                Número de cuotas
                              </label>
                              <Input
                                id="venta-cuotas"
                                name="numeroCuotas"
                                type="number"
                                min={1}
                                max={MAXIMO_CUOTAS_TIENDA}
                                step={1}
                                value={numeroCuotas}
                                onChange={(evento) => {
                                  setNumeroCuotas(evento.target.value);
                                  limpiarError("financiamiento.numeroCuotas");
                                }}
                                inputMode="numeric"
                                autoComplete="off"
                                aria-invalid={
                                  errores["financiamiento.numeroCuotas"]
                                    ? true
                                    : undefined
                                }
                                aria-describedby={
                                  errores["financiamiento.numeroCuotas"]
                                    ? "venta-cuotas-error"
                                    : undefined
                                }
                              />
                              {errores["financiamiento.numeroCuotas"] ? (
                                <p
                                  id="venta-cuotas-error"
                                  role="alert"
                                  className="text-xs text-destructive-text"
                                >
                                  {errores["financiamiento.numeroCuotas"]}
                                </p>
                              ) : null}
                            </div>
                          )}

                          {modalidadPago === "cashea" ? (
                            <div className="rounded-md border border-border p-3 sm:col-span-1">
                              <span className="text-xs font-medium">
                                Plazo entre cuotas
                              </span>
                              <p className="flex h-9 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                                14 días (fijo)
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-md border border-border p-3 sm:col-span-1">
                              <label
                                htmlFor="venta-dias"
                                className="text-xs font-medium"
                              >
                                Días entre cuotas
                              </label>
                              <Input
                                id="venta-dias"
                                name="diasEntreCuotas"
                                type="number"
                                min={1}
                                max={MAXIMO_DIAS_ENTRE_CUOTAS}
                                step={1}
                                value={diasEntreCuotas}
                                onChange={(evento) => {
                                  setDiasEntreCuotas(evento.target.value);
                                  limpiarError(
                                    "financiamiento.diasEntreCuotas",
                                  );
                                }}
                                inputMode="numeric"
                                autoComplete="off"
                                aria-invalid={
                                  errores["financiamiento.diasEntreCuotas"]
                                    ? true
                                    : undefined
                                }
                                aria-describedby={
                                  errores["financiamiento.diasEntreCuotas"]
                                    ? "venta-dias-error"
                                    : undefined
                                }
                              />
                              {errores["financiamiento.diasEntreCuotas"] ? (
                                <p
                                  id="venta-dias-error"
                                  role="alert"
                                  className="text-xs text-destructive-text"
                                >
                                  {errores["financiamiento.diasEntreCuotas"]}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Entre 1 y {MAXIMO_DIAS_ENTRE_CUOTAS} días.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {errores.financiamiento ? (
                          <p
                            role="alert"
                            className="text-xs text-destructive-text"
                          >
                            {errores.financiamiento}
                          </p>
                        ) : null}
                      </>
                    ) : null}

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
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

                  {vistaPrevia ? (
                    <ResumenFinanciamiento
                      modalidad={
                        modalidadPago === "cashea" ? "cashea" : "tienda"
                      }
                      plan={vistaPrevia.plan}
                      error={vistaPrevia.error}
                      diasEntreCuotas={
                        modalidadPago === "cashea"
                          ? DIAS_CASHEA
                          : Number(diasEntreCuotas) || 0
                      }
                    />
                  ) : null}
                </div>
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
                    !tasa ||
                    (esFinanciada && !vistaPrevia?.plan)
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

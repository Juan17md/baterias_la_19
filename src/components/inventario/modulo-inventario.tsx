"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CircleDollarSign,
  Package,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  SearchX,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { TarjetaKpi } from "@/components/estadisticas/tarjeta-kpi";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasa } from "@/hooks/use-tasa";
import {
  calcularEstadoStock,
  cambiarActivoBateria,
  listarBaterias,
} from "@/lib/servicios/baterias";
import { cn, formatearNumero } from "@/lib/utils";
import type { Bateria, EstadoStock } from "@/types";
import { BadgeEstadoStock } from "./badge-estado-stock";
import { PrecioDual } from "./precio-dual";

const BATERIAS_POR_PAGINA = 12;

type OrdenInventario = "codigo" | "marca" | "precio" | "stock";
type FiltroEstadoProducto = "activos" | "desactivados" | "todos";
type FiltroEstadoStock = "todos" | EstadoStock;

const ETIQUETAS_ORDEN: Record<OrdenInventario, string> = {
  codigo: "Código",
  marca: "Marca",
  precio: "Precio",
  stock: "Stock",
};

const ETIQUETAS_ESTADO_PRODUCTO: Record<FiltroEstadoProducto, string> = {
  activos: "Activos",
  desactivados: "Desactivados",
  todos: "Todos",
};

const ETIQUETAS_ESTADO_STOCK_FILTRO: Record<FiltroEstadoStock, string> = {
  todos: "Todos",
  en_stock: "En stock",
  bajo: "Stock bajo",
  agotado: "Agotado",
};

/** Normaliza texto para búsquedas sin distinguir mayúsculas ni tildes. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type ResumenInventario = {
  unidades: number;
  totalInvertido: number;
  gananciaTotal: number;
  montoGeneral: number;
  margen: number;
};

/**
 * Valorización del stock actual (04_Arquitectura §5.10): costo, margen
 * potencial y valor de venta de todas las unidades disponibles. Incluye los
 * productos desactivados porque su stock sigue representando capital.
 */
function calcularResumenInventario(baterias: Bateria[]): ResumenInventario {
  const resumen = baterias.reduce(
    (acumulado, bateria) => {
      if (bateria.stock <= 0) return acumulado;
      acumulado.unidades += bateria.stock;
      acumulado.totalInvertido += bateria.precioCompra * bateria.stock;
      acumulado.montoGeneral += bateria.precioVenta * bateria.stock;
      return acumulado;
    },
    { unidades: 0, totalInvertido: 0, montoGeneral: 0 },
  );

  const totalInvertido = Math.round(resumen.totalInvertido * 100) / 100;
  const montoGeneral = Math.round(resumen.montoGeneral * 100) / 100;
  const gananciaTotal = Math.round((montoGeneral - totalInvertido) * 100) / 100;
  const margen =
    montoGeneral > 0
      ? Math.round((gananciaTotal / montoGeneral) * 1000) / 10
      : 0;

  return {
    unidades: resumen.unidades,
    totalInvertido,
    gananciaTotal,
    montoGeneral,
    margen,
  };
}

/** Módulo principal del inventario: tabla con búsqueda, filtros y paginación. */
export function ModuloInventario() {
  const { tasa } = useTasa();
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const [busqueda, setBusqueda] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("todas");
  const [filtroStock, setFiltroStock] = useState<FiltroEstadoStock>("todos");
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstadoProducto>("activos");
  const [orden, setOrden] = useState<OrdenInventario>("codigo");
  const [ascendente, setAscendente] = useState(true);
  const [pagina, setPagina] = useState(1);

  const [bateriaAProcesar, setBateriaAProcesar] = useState<Bateria | null>(
    null,
  );
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarBaterias() {
      try {
        const lista = await listarBaterias();
        if (cancelado) return;
        setBaterias(lista);
        setErrorCarga(false);
      } catch {
        if (!cancelado) setErrorCarga(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarBaterias();
    return () => {
      cancelado = true;
    };
  }, [recarga]);

  const marcas = [...new Set(baterias.map((bateria) => bateria.marca))].sort(
    (a, b) => a.localeCompare(b, "es"),
  );

  const resumen = calcularResumenInventario(baterias);
  const bsInvertido =
    tasa === null ? "—" : formatearNumero(resumen.totalInvertido * tasa.valor);
  const bsGanancia =
    tasa === null ? "—" : formatearNumero(resumen.gananciaTotal * tasa.valor);
  const bsMontoGeneral =
    tasa === null ? "—" : formatearNumero(resumen.montoGeneral * tasa.valor);
  const etiquetaUnidades =
    resumen.unidades === 1 ? "1 unidad" : `${resumen.unidades} unidades`;

  const termino = normalizar(busqueda.trim());
  const filtradas = baterias.filter((bateria) => {
    if (filtroEstado === "activos" && !bateria.activo) return false;
    if (filtroEstado === "desactivados" && bateria.activo) return false;
    if (filtroMarca !== "todas" && bateria.marca !== filtroMarca) return false;
    if (
      filtroStock !== "todos" &&
      calcularEstadoStock(bateria.stock, bateria.stockMinimo) !== filtroStock
    ) {
      return false;
    }
    if (termino) {
      const texto = normalizar(
        `${bateria.codigo} ${bateria.marca} ${bateria.modelo}`,
      );
      if (!texto.includes(termino)) return false;
    }
    return true;
  });

  const comparar = (a: Bateria, b: Bateria): number => {
    switch (orden) {
      case "marca":
        return (
          a.marca.localeCompare(b.marca, "es") ||
          a.modelo.localeCompare(b.modelo, "es")
        );
      case "precio":
        return a.precioVenta - b.precioVenta;
      case "stock":
        return a.stock - b.stock;
      default:
        return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
    }
  };

  const ordenadas = [...filtradas].sort((a, b) =>
    ascendente ? comparar(a, b) : comparar(b, a),
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(ordenadas.length / BATERIAS_POR_PAGINA),
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = ordenadas.slice(
    (paginaActual - 1) * BATERIAS_POR_PAGINA,
    paginaActual * BATERIAS_POR_PAGINA,
  );
  const inicio =
    ordenadas.length === 0 ? 0 : (paginaActual - 1) * BATERIAS_POR_PAGINA + 1;
  const fin = (paginaActual - 1) * BATERIAS_POR_PAGINA + visibles.length;

  const hayFiltrosActivos =
    busqueda.trim() !== "" ||
    filtroMarca !== "todas" ||
    filtroStock !== "todos" ||
    filtroEstado !== "activos";

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroMarca("todas");
    setFiltroStock("todos");
    setFiltroEstado("activos");
    setPagina(1);
  }

  async function manejarCambioActivo(bateria: Bateria, activo: boolean) {
    setProcesando(true);
    try {
      await cambiarActivoBateria(bateria.id, activo);
      setBaterias((lista) =>
        lista.map((elemento) =>
          elemento.id === bateria.id ? { ...elemento, activo } : elemento,
        ),
      );
      toast.success(
        activo
          ? `«${bateria.codigo}» quedó reactivada.`
          : `«${bateria.codigo}» quedó desactivada.`,
      );
      setBateriaAProcesar(null);
    } catch {
      toast.error("No se pudo actualizar el producto. Inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Inventario"
        descripcion="Catálogo de baterías: stock, precios en $ con referencia en Bs y estado de reposición."
        acciones={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setCargando(true);
                setRecarga((valor) => valor + 1);
              }}
              disabled={cargando}
            >
              <RefreshCw
                className={cn("size-4", cargando && "animate-spin")}
                aria-hidden="true"
              />
              Actualizar
            </Button>
            <Button asChild>
              <Link href="/dashboard/inventario/nuevo">
                <Plus className="size-4" aria-hidden="true" />
                Agregar batería
              </Link>
            </Button>
          </>
        }
      />

      {!errorCarga ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cargando ? (
            Array.from({ length: 3 }, (_, indice) => (
              <div
                key={indice}
                className="rounded-lg border border-border bg-card p-5"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
              </div>
            ))
          ) : (
            <>
              <TarjetaKpi
                etiqueta="Total invertido"
                valor={`$ ${formatearNumero(resumen.totalInvertido)}`}
                detalle={`Costo de ${etiquetaUnidades} · Bs ${bsInvertido}`}
                icono={Wallet}
                tono="info"
              />
              <TarjetaKpi
                etiqueta="Ganancias totales"
                valor={`$ ${formatearNumero(resumen.gananciaTotal)}`}
                detalle={`Margen potencial (${formatearNumero(resumen.margen, 1)} %) · Bs ${bsGanancia}`}
                icono={TrendingUp}
                tono="success"
              />
              <TarjetaKpi
                etiqueta="Monto general"
                valor={`$ ${formatearNumero(resumen.montoGeneral)}`}
                detalle={`Valor de venta del stock actual · Bs ${bsMontoGeneral}`}
                icono={CircleDollarSign}
                tono="primary"
              />
            </>
          )}
        </div>
      ) : null}

      {cargando ? (
        <Card className="flex flex-col gap-3 p-6">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 6 }).map((_, indice) => (
            <Skeleton key={indice} className="h-10 w-full" />
          ))}
        </Card>
      ) : errorCarga ? (
        <EmptyState
          icono={TriangleAlert}
          titulo="No se pudo cargar el inventario"
          descripcion="Revisa tu conexión e inténtalo de nuevo."
          accion={
            <Button
              variant="outline"
              onClick={() => {
                setCargando(true);
                setRecarga((valor) => valor + 1);
              }}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Reintentar
            </Button>
          }
        />
      ) : (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative min-w-56 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={busqueda}
                  onChange={(evento) => {
                    setBusqueda(evento.target.value);
                    setPagina(1);
                  }}
                  placeholder="Buscar por código, marca o modelo…"
                  className="pl-9"
                  aria-label="Buscar baterías"
                />
              </div>
              <Select
                value={filtroMarca}
                onValueChange={(valor) => {
                  setFiltroMarca(valor);
                  setPagina(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-40"
                  aria-label="Filtrar por marca"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las marcas</SelectItem>
                  {marcas.map((marca) => (
                    <SelectItem key={marca} value={marca}>
                      {marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filtroStock}
                onValueChange={(valor) => {
                  setFiltroStock(valor as FiltroEstadoStock);
                  setPagina(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-40"
                  aria-label="Filtrar por estado del stock"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(
                      ETIQUETAS_ESTADO_STOCK_FILTRO,
                    ) as FiltroEstadoStock[]
                  ).map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {ETIQUETAS_ESTADO_STOCK_FILTRO[estado]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filtroEstado}
                onValueChange={(valor) => {
                  setFiltroEstado(valor as FiltroEstadoProducto);
                  setPagina(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-36"
                  aria-label="Filtrar por estado del producto"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(
                      ETIQUETAS_ESTADO_PRODUCTO,
                    ) as FiltroEstadoProducto[]
                  ).map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {ETIQUETAS_ESTADO_PRODUCTO[estado]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={orden}
                onValueChange={(valor) => {
                  setOrden(valor as OrdenInventario);
                  setPagina(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-40"
                  aria-label="Ordenar por"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ETIQUETAS_ORDEN) as OrdenInventario[]).map(
                    (campo) => (
                      <SelectItem key={campo} value={campo}>
                        Ordenar por {ETIQUETAS_ORDEN[campo].toLowerCase()}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAscendente((valor) => !valor)}
                title={ascendente ? "Orden ascendente" : "Orden descendente"}
                aria-label={
                  ascendente
                    ? "Cambiar a orden descendente"
                    : "Cambiar a orden ascendente"
                }
              >
                {ascendente ? (
                  <ArrowUp className="size-4" aria-hidden="true" />
                ) : (
                  <ArrowDown className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </Card>

          {baterias.length === 0 ? (
            <EmptyState
              icono={Package}
              titulo="Aún no hay baterías"
              descripcion="Registra el primer producto del catálogo para comenzar a controlar el stock."
              accion={
                <Button asChild>
                  <Link href="/dashboard/inventario/nuevo">
                    <Plus className="size-4" aria-hidden="true" />
                    Agregar batería
                  </Link>
                </Button>
              }
            />
          ) : ordenadas.length === 0 ? (
            <EmptyState
              icono={SearchX}
              titulo="Sin resultados"
              descripcion="Ningún producto coincide con la búsqueda o los filtros aplicados."
              accion={
                hayFiltrosActivos ? (
                  <Button variant="outline" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Catálogo de baterías con stock y precios
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-medium">
                        Código
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Batería
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Especificaciones
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Precio
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Stock
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Estado
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-medium"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((bateria) => (
                      <tr
                        key={bateria.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/inventario/${bateria.id}`}
                            className="font-mono text-sm font-medium hover:text-primary hover:underline"
                          >
                            {bateria.codigo}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {bateria.marca}{" "}
                              <span className="font-normal text-muted-foreground">
                                {bateria.modelo}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-xs text-muted-foreground">
                            <span>
                              {bateria.voltaje} V · {bateria.amperaje} Ah
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PrecioDual precioUsd={bateria.precioVenta} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">
                              {bateria.stock}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              mín. {bateria.stockMinimo}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <BadgeEstadoStock
                              stock={bateria.stock}
                              stockMinimo={bateria.stockMinimo}
                            />
                            {!bateria.activo ? (
                              <Badge variant="neutral">Desactivada</Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                href={`/dashboard/inventario/${bateria.id}`}
                                title={`Ver ficha de ${bateria.codigo}`}
                              >
                                Ver
                              </Link>
                            </Button>
                            {bateria.activo ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
                                onClick={() => setBateriaAProcesar(bateria)}
                                title={`Desactivar ${bateria.codigo}`}
                              >
                                <PowerOff
                                  className="size-4"
                                  aria-hidden="true"
                                />
                                Desactivar
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  void manejarCambioActivo(bateria, true)
                                }
                                title={`Reactivar ${bateria.codigo}`}
                              >
                                <Power className="size-4" aria-hidden="true" />
                                Reactivar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Mostrando {inicio}–{fin} de {ordenadas.length}{" "}
                  {ordenadas.length === 1 ? "batería" : "baterías"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaActual <= 1}
                    onClick={() => setPagina(paginaActual - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaActual >= totalPaginas}
                    onClick={() => setPagina(paginaActual + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog
        open={bateriaAProcesar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setBateriaAProcesar(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar producto</DialogTitle>
            <DialogDescription>
              «{bateriaAProcesar?.codigo}» dejará de aparecer en el inventario
              activo. Su historial de movimientos se conserva y puedes
              reactivarla cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBateriaAProcesar(null)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={procesando}
              onClick={() => {
                if (bateriaAProcesar) {
                  void manejarCambioActivo(bateriaAProcesar, false);
                }
              }}
            >
              {procesando ? "Desactivando…" : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

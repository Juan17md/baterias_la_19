"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { ReceiptText, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { BadgeEstadoVenta } from "@/components/ventas/badge-estado-venta";
import { ETIQUETAS_METODO_PAGO } from "@/components/ventas/etiquetas";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsuariosFiltro } from "@/hooks/use-usuarios-filtro";
import { eliminarVenta, listarVentas } from "@/lib/servicios/ventas";
import { fechaDesdeInput, formatearFecha, formatearNumero } from "@/lib/utils";
import type { EstadoVenta, Venta } from "@/types";
import { CamposFecha } from "./campos-fecha";

const VENTAS_POR_PAGINA = 10;

/** Historial de ventas con filtros por estado, vendedor y rango de fechas. */
export function TablaVentas() {
  const { esAdmin, usuarios, perfil } = useUsuariosFiltro();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState<EstadoVenta | "todas">(
    "todas",
  );
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [recarga, setRecarga] = useState(0);

  const [ventaAEliminar, setVentaAEliminar] = useState<Venta | null>(null);
  const [eliminandoVenta, setEliminandoVenta] = useState(false);
  const [errorEliminarVenta, setErrorEliminarVenta] = useState<string | null>(
    null,
  );

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const hayFiltros =
    filtroEstado !== "todas" ||
    filtroVendedor !== "todos" ||
    desde !== "" ||
    hasta !== "";

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (rangoInvalido) {
        setVentas([]);
        setCursor(null);
        setCargando(false);
        return;
      }
      setCargando(true);
      setError(false);
      try {
        const pagina = await listarVentas({
          estado: filtroEstado,
          vendedorUid: filtroVendedor,
          desde: fechaDesdeInput(desde),
          hasta: fechaDesdeInput(hasta, true),
          cantidad: VENTAS_POR_PAGINA,
        });
        if (cancelado) return;
        setVentas(pagina.ventas);
        setCursor(pagina.ultimo);
      } catch {
        if (!cancelado) setError(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [filtroEstado, filtroVendedor, desde, hasta, recarga, rangoInvalido]);

  async function cargarMas() {
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const pagina = await listarVentas({
        estado: filtroEstado,
        vendedorUid: filtroVendedor,
        desde: fechaDesdeInput(desde),
        hasta: fechaDesdeInput(hasta, true),
        cantidad: VENTAS_POR_PAGINA,
        cursor,
      });
      setVentas((actuales) => [...actuales, ...pagina.ventas]);
      setCursor(pagina.ultimo);
    } catch {
      toast.error("No se pudieron cargar más ventas.");
    } finally {
      setCargandoMas(false);
    }
  }

  function limpiarFiltros() {
    setFiltroEstado("todas");
    setFiltroVendedor("todos");
    setDesde("");
    setHasta("");
  }

  function abrirEliminarVenta(venta: Venta) {
    setErrorEliminarVenta(null);
    setVentaAEliminar(venta);
  }

  function manejarCambioEliminarVenta(abierto: boolean) {
    if (!abierto && eliminandoVenta) return;
    if (!abierto) {
      setVentaAEliminar(null);
      setErrorEliminarVenta(null);
    }
  }

  async function confirmarEliminarVenta() {
    if (!ventaAEliminar || eliminandoVenta) return;
    const eraCompletada = ventaAEliminar.estado === "completada";
    setEliminandoVenta(true);
    setErrorEliminarVenta(null);
    try {
      await eliminarVenta(ventaAEliminar.id);
      toast.success(
        eraCompletada
          ? "Venta eliminada y stock repuesto."
          : "Venta eliminada (el stock ya estaba repuesto).",
      );
      setVentaAEliminar(null);
      setRecarga((valor) => valor + 1);
    } catch (fallo) {
      setErrorEliminarVenta(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo eliminar la venta.",
      );
    } finally {
      setEliminandoVenta(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ventas-estado" className="text-xs font-medium">
              Estado
            </label>
            <Select
              value={filtroEstado}
              onValueChange={(valor) =>
                setFiltroEstado(valor as EstadoVenta | "todas")
              }
            >
              <SelectTrigger id="ventas-estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="completada">Completadas</SelectItem>
                <SelectItem value="anulada">Anuladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ventas-vendedor" className="text-xs font-medium">
              Vendedor
            </label>
            <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
              <SelectTrigger id="ventas-vendedor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">
                  {esAdmin ? "Todos los vendedores" : "Todas"}
                </SelectItem>
                {esAdmin ? (
                  usuarios.map((usuario) => (
                    <SelectItem key={usuario.uid} value={usuario.uid}>
                      {usuario.nombre || usuario.email}
                    </SelectItem>
                  ))
                ) : perfil ? (
                  <SelectItem value={perfil.uid}>Solo las mías</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
          <CamposFecha
            idPrefijo="ventas"
            desde={desde}
            hasta={hasta}
            onCambioDesde={setDesde}
            onCambioHasta={setHasta}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            role={rangoInvalido ? "alert" : "status"}
            className="text-xs text-muted-foreground"
          >
            {rangoInvalido
              ? "La fecha «desde» no puede ser posterior a «hasta»."
              : `Mostrando ${ventas.length} venta(s) cargada(s).`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecarga((valor) => valor + 1)}
            disabled={cargando}
          >
            <RefreshCw
              className={cargando ? "size-4 animate-spin" : "size-4"}
              aria-hidden="true"
            />
            Actualizar
          </Button>
        </div>
      </Card>

      {rangoInvalido ? (
        <Card role="alert" className="p-6 text-sm text-muted-foreground">
          Corrige el rango de fechas para consultar las ventas.
        </Card>
      ) : cargando ? (
        <Card className="flex flex-col gap-3 p-6">
          {Array.from({ length: 6 }).map((_, indice) => (
            <Skeleton key={indice} className="h-6 w-full" />
          ))}
        </Card>
      ) : error ? (
        <EmptyState
          icono={TriangleAlert}
          titulo="No se pudo cargar el historial de ventas"
          descripcion="Revisa tu conexión e inténtalo de nuevo."
          accion={
            <Button onClick={() => setRecarga((valor) => valor + 1)}>
              Reintentar
            </Button>
          }
        />
      ) : ventas.length === 0 ? (
        <EmptyState
          icono={ReceiptText}
          titulo="Sin ventas registradas"
          descripcion={
            hayFiltros
              ? "No hay ventas que coincidan con los filtros seleccionados."
              : "Las ventas registradas aparecerán aquí con su comprobante."
          }
          accion={
            hayFiltros ? (
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
                Ventas registradas con fecha, cliente, total, pago, vendedor y
                estado
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">
                    N.º
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">
                    Ítems
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pago
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Vendedor
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => {
                  const unidades = venta.items.reduce(
                    (suma, item) => suma + item.cantidad,
                    0,
                  );
                  return (
                    <tr
                      key={venta.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        #{venta.numero}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {venta.fecha
                          ? formatearFecha(venta.fecha.toDate())
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {venta.cliente ? (
                          <div className="flex flex-col">
                            <span>{venta.cliente.nombre}</span>
                            {venta.cliente.telefono ? (
                              <span className="text-xs text-muted-foreground">
                                {venta.cliente.telefono}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Ocasional
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {venta.items.length} · {unidades} u.
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end leading-tight">
                          <span className="font-mono">
                            $ {formatearNumero(venta.total)}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            Bs {formatearNumero(venta.totalBs)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {ETIQUETAS_METODO_PAGO[venta.metodoPago]}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {venta.vendedor.nombre || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <BadgeEstadoVenta estado={venta.estado} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link
                              href={`/dashboard/historial/venta/${venta.id}`}
                              aria-label={`Ver comprobante de la venta ${venta.numero}`}
                            >
                              Ver
                            </Link>
                          </Button>
                          {esAdmin ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-7 px-0"
                              onClick={() => abrirEliminarVenta(venta)}
                              aria-label={`Eliminar venta ${venta.numero}`}
                            >
                              <Trash2
                                className="size-4 text-destructive-text"
                                aria-hidden="true"
                              />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {cursor ? (
            <div className="flex justify-center border-t border-border p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void cargarMas()}
                disabled={cargandoMas}
              >
                {cargandoMas ? "Cargando…" : "Cargar más"}
              </Button>
            </div>
          ) : null}
        </Card>
      )}

      <Dialog
        open={ventaAEliminar !== null}
        onOpenChange={manejarCambioEliminarVenta}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Eliminar venta N.º {ventaAEliminar?.numero ?? ""}
            </DialogTitle>
            <DialogDescription>
              Se eliminará la venta del historial junto con sus movimientos
              asociados. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {ventaAEliminar ? (
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Estado</dt>
                  <dd>
                    <BadgeEstadoVenta estado={ventaAEliminar.estado} />
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Total</dt>
                  <dd className="font-mono text-xs">
                    $ {formatearNumero(ventaAEliminar.total)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Fecha</dt>
                  <dd className="text-xs">
                    {ventaAEliminar.fecha
                      ? formatearFecha(ventaAEliminar.fecha.toDate())
                      : "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Ítems</dt>
                  <dd className="font-mono text-xs">
                    {ventaAEliminar.items.length}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                {ventaAEliminar.estado === "completada"
                  ? "Se repondrá el stock de sus ítems y se borrarán los movimientos asociados."
                  : "El stock ya fue repuesto al anularla; solo se borrarán el comprobante y sus movimientos."}{" "}
                El consecutivo no se reutilizará.
              </p>
              {errorEliminarVenta ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{errorEliminarVenta}</span>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => manejarCambioEliminarVenta(false)}
              disabled={eliminandoVenta}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmarEliminarVenta()}
              disabled={eliminandoVenta}
            >
              {eliminandoVenta ? "Eliminando…" : "Eliminar venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

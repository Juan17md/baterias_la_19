"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { ReceiptText, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { BadgeEstadoVenta } from "@/components/ventas/badge-estado-venta";
import { ETIQUETAS_METODO_PAGO } from "@/components/ventas/etiquetas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { listarVentas } from "@/lib/servicios/ventas";
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
          <p className="text-xs text-muted-foreground">
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
        <Card className="p-6 text-sm text-muted-foreground">
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
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">N.º</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 text-center font-medium">Ítems</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Pago</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">
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
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/dashboard/historial/venta/${venta.id}`}
                            aria-label={`Ver comprobante de la venta ${venta.numero}`}
                          >
                            Ver
                          </Link>
                        </Button>
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
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { Boxes, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ETIQUETAS_TIPO_MOVIMIENTO } from "@/components/inventario/etiquetas";
import { Badge } from "@/components/ui/badge";
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
import { listarMovimientos } from "@/lib/servicios/movimientos";
import { cn, fechaDesdeInput, formatearFecha } from "@/lib/utils";
import type { Movimiento, TipoMovimiento } from "@/types";
import { CamposFecha } from "./campos-fecha";

const MOVIMIENTOS_POR_PAGINA = 12;

const VARIANTE_TIPO: Record<
  TipoMovimiento,
  "success" | "info" | "warning" | "neutral"
> = {
  entrada: "success",
  salida: "info",
  ajuste: "warning",
  devolucion: "neutral",
};

/** Historial global de movimientos con filtros por tipo, usuario y fecha. */
export function TablaMovimientos() {
  const { esAdmin, usuarios, perfil } = useUsuariosFiltro();

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<TipoMovimiento | "todos">(
    "todos",
  );
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [recarga, setRecarga] = useState(0);

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const hayFiltros =
    filtroTipo !== "todos" ||
    filtroUsuario !== "todos" ||
    desde !== "" ||
    hasta !== "";

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (rangoInvalido) {
        setMovimientos([]);
        setCursor(null);
        setCargando(false);
        return;
      }
      setCargando(true);
      setError(false);
      try {
        const pagina = await listarMovimientos({
          tipo: filtroTipo,
          usuarioUid: filtroUsuario,
          desde: fechaDesdeInput(desde),
          hasta: fechaDesdeInput(hasta, true),
          cantidad: MOVIMIENTOS_POR_PAGINA,
        });
        if (cancelado) return;
        setMovimientos(pagina.movimientos);
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
  }, [filtroTipo, filtroUsuario, desde, hasta, recarga, rangoInvalido]);

  async function cargarMas() {
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const pagina = await listarMovimientos({
        tipo: filtroTipo,
        usuarioUid: filtroUsuario,
        desde: fechaDesdeInput(desde),
        hasta: fechaDesdeInput(hasta, true),
        cantidad: MOVIMIENTOS_POR_PAGINA,
        cursor,
      });
      setMovimientos((actuales) => [...actuales, ...pagina.movimientos]);
      setCursor(pagina.ultimo);
    } catch {
      toast.error("No se pudieron cargar más movimientos.");
    } finally {
      setCargandoMas(false);
    }
  }

  function limpiarFiltros() {
    setFiltroTipo("todos");
    setFiltroUsuario("todos");
    setDesde("");
    setHasta("");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="movimientos-tipo" className="text-xs font-medium">
              Tipo
            </label>
            <Select
              value={filtroTipo}
              onValueChange={(valor) =>
                setFiltroTipo(valor as TipoMovimiento | "todos")
              }
            >
              <SelectTrigger id="movimientos-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
                <SelectItem value="devolucion">Devolución</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="movimientos-usuario"
              className="text-xs font-medium"
            >
              Usuario
            </label>
            <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
              <SelectTrigger id="movimientos-usuario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">
                  {esAdmin ? "Todos los usuarios" : "Todos"}
                </SelectItem>
                {esAdmin ? (
                  usuarios.map((usuario) => (
                    <SelectItem key={usuario.uid} value={usuario.uid}>
                      {usuario.nombre || usuario.email}
                    </SelectItem>
                  ))
                ) : perfil ? (
                  <SelectItem value={perfil.uid}>Solo los míos</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
          <CamposFecha
            idPrefijo="movimientos"
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
              : `Mostrando ${movimientos.length} movimiento(s) cargado(s).`}
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
          Corrige el rango de fechas para consultar los movimientos.
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
          titulo="No se pudo cargar el historial de movimientos"
          descripcion="Revisa tu conexión e inténtalo de nuevo."
          accion={
            <Button onClick={() => setRecarga((valor) => valor + 1)}>
              Reintentar
            </Button>
          }
        />
      ) : movimientos.length === 0 ? (
        <EmptyState
          icono={Boxes}
          titulo="Sin movimientos registrados"
          descripcion={
            hayFiltros
              ? "No hay movimientos que coincidan con los filtros seleccionados."
              : "Las entradas, salidas, ajustes y devoluciones aparecerán aquí."
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
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Batería</th>
                  <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((movimiento) => (
                  <tr
                    key={movimiento.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {movimiento.fecha
                        ? formatearFecha(movimiento.fecha.toDate())
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={VARIANTE_TIPO[movimiento.tipo]}>
                        {ETIQUETAS_TIPO_MOVIMIENTO[movimiento.tipo]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/inventario/${movimiento.bateriaId}`}
                          className="font-mono text-xs font-medium hover:text-primary hover:underline"
                        >
                          {movimiento.bateriaResumen.codigo || "—"}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {movimiento.bateriaResumen.marca}{" "}
                          {movimiento.bateriaResumen.modelo}
                        </span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-mono text-sm",
                        movimiento.cantidad > 0
                          ? "text-success-text"
                          : movimiento.cantidad < 0
                            ? "text-destructive-text"
                            : "text-muted-foreground",
                      )}
                    >
                      {movimiento.cantidad > 0 ? "+" : ""}
                      {movimiento.cantidad}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {movimiento.stockAntes} → {movimiento.stockDespues}
                    </td>
                    <td className="max-w-64 px-4 py-3">
                      <p className="truncate text-xs" title={movimiento.motivo}>
                        {movimiento.motivo}
                      </p>
                      {movimiento.ventaId ? (
                        <Link
                          href={`/dashboard/historial/venta/${movimiento.ventaId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Ver venta
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {movimiento.usuario.nombre || "—"}
                    </td>
                  </tr>
                ))}
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

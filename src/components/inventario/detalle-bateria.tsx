"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  PackagePlus,
  PackageX,
  Pencil,
  Power,
  PowerOff,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  actualizarBateria,
  cambiarActivoBateria,
  obtenerBateria,
} from "@/lib/servicios/baterias";
import { listarMovimientosDeBateria } from "@/lib/servicios/movimientos";
import type { DatosBateria } from "@/lib/validaciones/baterias";
import { cn, formatearFecha, formatearNumero } from "@/lib/utils";
import type { Bateria, Movimiento, TipoMovimiento } from "@/types";
import { BadgeEstadoStock } from "./badge-estado-stock";
import { DialogoAjuste } from "./dialogo-ajuste";
import { DialogoEntrada } from "./dialogo-entrada";
import { ETIQUETAS_TIPO_BATERIA, ETIQUETAS_TIPO_MOVIMIENTO } from "./etiquetas";
import { FormularioBateria } from "./formulario-bateria";
import { PrecioDual } from "./precio-dual";

const MOVIMIENTOS_POR_PAGINA = 8;

const VARIANTE_MOVIMIENTO: Record<
  TipoMovimiento,
  "success" | "info" | "warning" | "neutral"
> = {
  entrada: "success",
  salida: "info",
  ajuste: "warning",
  devolucion: "neutral",
};

function FilaDato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/** Ficha completa del producto: datos, precios, movimientos y acciones. */
export function DetalleBateria({ id }: { id: string }) {
  const [bateria, setBateria] = useState<Bateria | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true);
  const [cursorMovimientos, setCursorMovimientos] =
    useState<QueryDocumentSnapshot | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);

  const [editarAbierto, setEditarAbierto] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  const [entradaAbierta, setEntradaAbierta] = useState(false);
  const [ajusteAbierto, setAjusteAbierto] = useState(false);

  const [desactivarAbierto, setDesactivarAbierto] = useState(false);
  const [reactivarAbierto, setReactivarAbierto] = useState(false);
  const [cambiandoActivo, setCambiandoActivo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarBateria() {
      try {
        const encontrada = await obtenerBateria(id);
        if (cancelado) return;
        if (!encontrada) {
          setNoEncontrada(true);
          setBateria(null);
        } else {
          setNoEncontrada(false);
          setBateria(encontrada);
        }
      } catch {
        // La vista de error se deriva de `bateria` y `noEncontrada`.
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarBateria();
    return () => {
      cancelado = true;
    };
  }, [id, recarga]);

  useEffect(() => {
    let cancelado = false;

    async function cargarMovimientos() {
      try {
        const pagina = await listarMovimientosDeBateria(
          id,
          MOVIMIENTOS_POR_PAGINA,
        );
        if (cancelado) return;
        setMovimientos(pagina.movimientos);
        setCursorMovimientos(pagina.ultimo);
      } catch {
        if (!cancelado) toast.error("No se pudieron cargar los movimientos.");
      } finally {
        if (!cancelado) setCargandoMovimientos(false);
      }
    }

    void cargarMovimientos();
    return () => {
      cancelado = true;
    };
  }, [id, recarga]);

  async function cargarMasMovimientos() {
    if (!cursorMovimientos || cargandoMas) return;
    setCargandoMas(true);
    try {
      const siguiente = await listarMovimientosDeBateria(
        id,
        MOVIMIENTOS_POR_PAGINA,
        cursorMovimientos,
      );
      setMovimientos((actuales) => [...actuales, ...siguiente.movimientos]);
      setCursorMovimientos(siguiente.ultimo);
    } catch {
      toast.error("No se pudieron cargar más movimientos.");
    } finally {
      setCargandoMas(false);
    }
  }

  async function manejarEdicion(datos: DatosBateria) {
    setGuardandoEdicion(true);
    setErrorEdicion(null);
    try {
      await actualizarBateria(id, datos);
      toast.success("Cambios guardados correctamente.");
      setEditarAbierto(false);
      setRecarga((valor) => valor + 1);
    } catch (fallo) {
      setErrorEdicion(
        fallo instanceof Error
          ? fallo.message
          : "No se pudieron guardar los cambios.",
      );
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function manejarCambioActivo(activo: boolean) {
    setCambiandoActivo(true);
    try {
      await cambiarActivoBateria(id, activo);
      toast.success(
        activo
          ? "Producto reactivado: vuelve a estar disponible en el inventario."
          : "Producto desactivado: su historial se conserva.",
      );
      setDesactivarAbierto(false);
      setReactivarAbierto(false);
      setRecarga((valor) => valor + 1);
    } catch {
      toast.error("No se pudo actualizar el producto. Inténtalo de nuevo.");
    } finally {
      setCambiandoActivo(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          titulo="Detalle de batería"
          breadcrumbs={[
            { etiqueta: "Dashboard", href: "/dashboard" },
            { etiqueta: "Inventario", href: "/dashboard/inventario" },
            { etiqueta: "Detalle" },
          ]}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, indice) => (
            <Card key={indice} className="flex flex-col gap-3 p-6">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 6 }).map((_, fila) => (
                <Skeleton key={fila} className="h-5 w-full" />
              ))}
            </Card>
          ))}
        </div>
        <Card className="flex flex-col gap-3 p-6">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 4 }).map((_, fila) => (
            <Skeleton key={fila} className="h-5 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (!bateria) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          titulo="Detalle de batería"
          breadcrumbs={[
            { etiqueta: "Dashboard", href: "/dashboard" },
            { etiqueta: "Inventario", href: "/dashboard/inventario" },
            { etiqueta: "Detalle" },
          ]}
        />
        <EmptyState
          icono={noEncontrada ? PackageX : TriangleAlert}
          titulo={
            noEncontrada
              ? "Batería no encontrada"
              : "No se pudo cargar la ficha"
          }
          descripcion={
            noEncontrada
              ? "El producto pudo haber sido eliminado o el enlace es incorrecto."
              : "Revisa tu conexión e inténtalo de nuevo."
          }
          accion={
            noEncontrada ? (
              <Button variant="outline" asChild>
                <Link href="/dashboard/inventario">Volver al inventario</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setCargando(true);
                  setRecarga((valor) => valor + 1);
                }}
              >
                Reintentar
              </Button>
            )
          }
        />
      </div>
    );
  }

  const margen =
    bateria.precioVenta > 0
      ? ((bateria.precioVenta - bateria.precioCompra) / bateria.precioVenta) *
        100
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo={`${bateria.marca} ${bateria.modelo}`}
        descripcion={`Código ${bateria.codigo} · ${ETIQUETAS_TIPO_BATERIA[bateria.tipo]}`}
        breadcrumbs={[
          { etiqueta: "Dashboard", href: "/dashboard" },
          { etiqueta: "Inventario", href: "/dashboard/inventario" },
          { etiqueta: bateria.codigo },
        ]}
        acciones={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setErrorEdicion(null);
                setEditarAbierto(true);
              }}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </Button>
            <Button variant="outline" onClick={() => setAjusteAbierto(true)}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Ajustar
            </Button>
            <Button onClick={() => setEntradaAbierta(true)}>
              <PackagePlus className="size-4" aria-hidden="true" />
              Registrar entrada
            </Button>
            {bateria.activo ? (
              <Button
                variant="destructive"
                onClick={() => setDesactivarAbierto(true)}
              >
                <PowerOff className="size-4" aria-hidden="true" />
                Desactivar
              </Button>
            ) : (
              <Button onClick={() => setReactivarAbierto(true)}>
                <Power className="size-4" aria-hidden="true" />
                Reactivar
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-3 text-sm font-semibold">Información general</h2>
          <div className="flex flex-col">
            <FilaDato etiqueta="Estado del producto">
              <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                <Badge variant={bateria.activo ? "success" : "neutral"}>
                  {bateria.activo ? "Activa" : "Desactivada"}
                </Badge>
                <BadgeEstadoStock
                  stock={bateria.stock}
                  stockMinimo={bateria.stockMinimo}
                />
              </span>
            </FilaDato>
            <FilaDato etiqueta="Tipo">
              {ETIQUETAS_TIPO_BATERIA[bateria.tipo]}
            </FilaDato>
            <FilaDato etiqueta="Voltaje / Amperaje">
              <span className="font-mono">
                {bateria.voltaje} V · {bateria.amperaje} Ah
              </span>
            </FilaDato>
            <FilaDato etiqueta="CCA">{bateria.cca ?? "—"}</FilaDato>
            <FilaDato etiqueta="Polaridad">{bateria.polaridad ?? "—"}</FilaDato>
            <FilaDato etiqueta="Dimensiones">
              {bateria.dimensiones ?? "—"}
            </FilaDato>
            <FilaDato etiqueta="Proveedor">{bateria.proveedor ?? "—"}</FilaDato>
            <FilaDato etiqueta="Garantía">
              {bateria.garantiaMeses > 0
                ? `${bateria.garantiaMeses} meses`
                : "Sin garantía"}
            </FilaDato>
            <FilaDato etiqueta="Creada">
              {bateria.creadoEn
                ? formatearFecha(bateria.creadoEn.toDate())
                : "—"}
            </FilaDato>
            <FilaDato etiqueta="Última actualización">
              {bateria.actualizadoEn
                ? formatearFecha(bateria.actualizadoEn.toDate())
                : "—"}
            </FilaDato>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 text-sm font-semibold">Precios y stock</h2>
          <div className="flex flex-col">
            <FilaDato etiqueta="Precio de compra">
              <PrecioDual
                precioUsd={bateria.precioCompra}
                className="items-end"
              />
            </FilaDato>
            <FilaDato etiqueta="Precio de venta">
              <PrecioDual
                precioUsd={bateria.precioVenta}
                className="items-end"
              />
            </FilaDato>
            <FilaDato etiqueta="Margen estimado">
              {formatearNumero(margen, 1)} %
            </FilaDato>
            <FilaDato etiqueta="Stock actual">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-base">{bateria.stock}</span>
                <BadgeEstadoStock
                  stock={bateria.stock}
                  stockMinimo={bateria.stockMinimo}
                />
              </span>
            </FilaDato>
            <FilaDato etiqueta="Stock mínimo">{bateria.stockMinimo}</FilaDato>
            <FilaDato etiqueta="Valor a costo">
              <PrecioDual
                precioUsd={bateria.stock * bateria.precioCompra}
                className="items-end"
              />
            </FilaDato>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-sm font-semibold">Movimientos recientes</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEntradaAbierta(true)}
          >
            <PackagePlus className="size-4" aria-hidden="true" />
            Registrar entrada
          </Button>
        </div>
        {cargandoMovimientos && movimientos.length === 0 ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }).map((_, indice) => (
              <Skeleton key={indice} className="h-8 w-full" />
            ))}
          </div>
        ) : movimientos.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Sin movimientos registrados todavía. La primera entrada de stock
            aparecerá aquí.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Fecha
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Tipo
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Cantidad
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Stock
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Motivo
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Usuario
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((movimiento) => (
                    <tr
                      key={movimiento.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {movimiento.fecha
                          ? formatearFecha(movimiento.fecha.toDate())
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={VARIANTE_MOVIMIENTO[movimiento.tipo]}>
                          {ETIQUETAS_TIPO_MOVIMIENTO[movimiento.tipo]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-mono",
                            movimiento.cantidad > 0
                              ? "text-success-text"
                              : movimiento.cantidad < 0
                                ? "text-destructive-text"
                                : undefined,
                          )}
                        >
                          {movimiento.cantidad > 0 ? "+" : ""}
                          {movimiento.cantidad}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {movimiento.stockAntes} → {movimiento.stockDespues}
                      </td>
                      <td className="max-w-60 truncate px-4 py-3 text-xs">
                        {movimiento.motivo}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {movimiento.usuario.nombre || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cursorMovimientos ? (
              <div className="flex justify-center border-t border-border p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void cargarMasMovimientos()}
                  disabled={cargandoMas}
                >
                  {cargandoMas ? "Cargando…" : "Cargar más"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Dialog open={editarAbierto} onOpenChange={setEditarAbierto}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar batería</DialogTitle>
            <DialogDescription>
              Actualiza los datos de «{bateria.codigo}». El stock solo cambia
              con entradas, ajustes o ventas.
            </DialogDescription>
          </DialogHeader>
          <FormularioBateria
            modo="editar"
            valoresIniciales={bateria}
            textoBoton="Guardar cambios"
            guardando={guardandoEdicion}
            onGuardar={(datos) => void manejarEdicion(datos)}
            onCancelar={() => setEditarAbierto(false)}
            errorServidor={errorEdicion}
          />
        </DialogContent>
      </Dialog>

      <DialogoEntrada
        bateria={bateria}
        abierto={entradaAbierta}
        onAbiertoCambio={setEntradaAbierta}
        onRegistrada={() => setRecarga((valor) => valor + 1)}
      />

      <DialogoAjuste
        bateria={bateria}
        abierto={ajusteAbierto}
        onAbiertoCambio={setAjusteAbierto}
        onAjustado={() => setRecarga((valor) => valor + 1)}
      />

      <Dialog open={desactivarAbierto} onOpenChange={setDesactivarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar producto</DialogTitle>
            <DialogDescription>
              «{bateria.codigo}» dejará de aparecer en el inventario activo. Su
              historial de movimientos se conserva y puedes reactivarla cuando
              quieras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDesactivarAbierto(false)}
              disabled={cambiandoActivo}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={cambiandoActivo}
              onClick={() => void manejarCambioActivo(false)}
            >
              {cambiandoActivo ? "Desactivando…" : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reactivarAbierto} onOpenChange={setReactivarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivar producto</DialogTitle>
            <DialogDescription>
              «{bateria.codigo}» volverá a estar disponible en el inventario
              activo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReactivarAbierto(false)}
              disabled={cambiandoActivo}
            >
              Cancelar
            </Button>
            <Button
              disabled={cambiandoActivo}
              onClick={() => void manejarCambioActivo(true)}
            >
              {cambiandoActivo ? "Reactivando…" : "Reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

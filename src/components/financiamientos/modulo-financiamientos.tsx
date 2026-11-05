"use client";

import { useEffect, useMemo, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  BadgeCheck,
  CircleDollarSign,
  HandCoins,
  RefreshCw,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { TarjetaKpi } from "@/components/estadisticas/tarjeta-kpi";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listarFinanciamientos,
  listarFinanciamientosCompletos,
  obtenerKpisFinanciamientos,
  type KpisFinanciamientos,
} from "@/lib/servicios/financiamientos";
import { fechaDesdeInput, formatearNumero, normalizarTexto } from "@/lib/utils";
import type { CuotaFinanciamiento, Financiamiento } from "@/types";
import { DialogoRegistrarPago } from "./dialogo-registrar-pago";
import { DialogoLiquidarCashea } from "./dialogo-liquidar-cashea";
import {
  FiltrosFinanciamientos,
  type EstadoFiltro,
  type ModalidadFiltro,
} from "./filtros-financiamientos";
import { TablaFinanciamientos } from "./tabla-financiamientos";

const PLANOS_POR_PAGINA = 12;

type CobroPendiente = {
  financiamiento: Financiamiento;
  cuota: CuotaFinanciamiento;
};

type Props = {
  /** Modalidad preseleccionada desde un enlace del dashboard. */
  modalidadInicial?: ModalidadFiltro;
  /** Estado preseleccionado desde un enlace del dashboard. */
  estadoInicial?: EstadoFiltro;
};

/**
 * Módulo de financiamientos: indicadores de cobranza, filtros, búsqueda y
 * tabla paginada de los planes de Cashea y «Por la tienda».
 */
export function ModuloFinanciamientos({
  modalidadInicial = "todas",
  estadoInicial = "todos",
}: Props) {
  const [planes, setPlanes] = useState<Financiamiento[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const [kpis, setKpis] = useState<KpisFinanciamientos | null>(null);
  const [cargandoKpis, setCargandoKpis] = useState(true);
  const [recarga, setRecarga] = useState(0);

  const [modalidad, setModalidad] = useState<ModalidadFiltro>(modalidadInicial);
  const [estado, setEstado] = useState<EstadoFiltro>(estadoInicial);
  const [busqueda, setBusqueda] = useState("");
  const [termino, setTermino] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [cobro, setCobro] = useState<CobroPendiente | null>(null);
  const [liquidacionCashea, setLiquidacionCashea] =
    useState<Financiamiento | null>(null);

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const hayFiltros =
    modalidad !== "todas" ||
    estado !== "todos" ||
    busqueda.trim() !== "" ||
    desde !== "" ||
    hasta !== "";

  // La búsqueda espera un instante para no consultar en cada tecla.
  useEffect(() => {
    const temporizador = setTimeout(() => setTermino(busqueda.trim()), 300);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  const filtros = useMemo(
    () => ({
      modalidad,
      estado,
      desde: fechaDesdeInput(desde),
      hasta: fechaDesdeInput(hasta, true),
    }),
    [modalidad, estado, desde, hasta],
  );

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (rangoInvalido) {
        setPlanes([]);
        setCursor(null);
        setCargando(false);
        return;
      }
      setCargando(true);
      setError(false);
      try {
        if (termino) {
          // Con búsqueda se cargan todos los planes del filtro para no
          // depender de la página visible.
          const todos = await listarFinanciamientosCompletos(filtros);
          if (cancelado) return;
          setPlanes(
            todos.filter((plan) =>
              normalizarTexto(
                `${plan.cliente.nombre} ${plan.cliente.telefono} ${plan.numeroVenta}`,
              ).includes(normalizarTexto(termino)),
            ),
          );
          setCursor(null);
          return;
        }
        const pagina = await listarFinanciamientos({
          ...filtros,
          cantidad: PLANOS_POR_PAGINA,
        });
        if (cancelado) return;
        setPlanes(pagina.financiamientos);
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
  }, [filtros, termino, recarga, rangoInvalido]);

  useEffect(() => {
    let cancelado = false;

    async function cargarKpis() {
      setCargandoKpis(true);
      try {
        const resumen = await obtenerKpisFinanciamientos();
        if (!cancelado) setKpis(resumen);
      } catch (fallo) {
        console.error("KPI financiamientos:", fallo);
        if (!cancelado) setKpis(null);
      } finally {
        if (!cancelado) setCargandoKpis(false);
      }
    }

    void cargarKpis();
    return () => {
      cancelado = true;
    };
  }, [recarga]);

  async function cargarMas() {
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const pagina = await listarFinanciamientos({
        ...filtros,
        cantidad: PLANOS_POR_PAGINA,
        cursor,
      });
      setPlanes((actuales) => [...actuales, ...pagina.financiamientos]);
      setCursor(pagina.ultimo);
    } catch {
      toast.error("No se pudieron cargar más financiamientos.");
    } finally {
      setCargandoMas(false);
    }
  }

  function limpiarFiltros() {
    setModalidad("todas");
    setEstado("todos");
    setBusqueda("");
    setDesde("");
    setHasta("");
  }

  function abrirCobro(
    financiamiento: Financiamiento,
    cuota: CuotaFinanciamiento,
  ) {
    setCobro({ financiamiento, cuota });
  }

  function abrirLiquidacion(financiamiento: Financiamiento) {
    setLiquidacionCashea(financiamiento);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Financiamientos"
        descripcion="Cobranza de las ventas «Por la tienda» y liquidaciones de Cashea, con el saldo y el estado de cada plan."
        acciones={
          <Button
            type="button"
            variant="outline"
            onClick={() => setRecarga((valor) => valor + 1)}
            disabled={cargando || cargandoKpis}
          >
            <RefreshCw
              className={cargando ? "size-4 animate-spin" : "size-4"}
              aria-hidden="true"
            />
            Actualizar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cargandoKpis && !kpis ? (
          Array.from({ length: 5 }).map((_, indice) => (
            <Skeleton key={indice} className="h-28 w-full" />
          ))
        ) : (
          <>
            <TarjetaKpi
              etiqueta="Por cobrar (tienda)"
              valor={`$ ${formatearNumero(kpis?.porCobrar ?? 0)}`}
              detalle={`${kpis?.planesActivos ?? 0} plan(es) activo(s)`}
              icono={Wallet}
              tono="primary"
            />
            <TarjetaKpi
              etiqueta="Vencido (tienda)"
              valor={`$ ${formatearNumero(kpis?.vencido ?? 0)}`}
              detalle={`${kpis?.planesVencidos ?? 0} plan(es) vencido(s)`}
              icono={TriangleAlert}
              tono="warning"
            />
            <TarjetaKpi
              etiqueta="Cobrado del mes"
              valor={`$ ${formatearNumero(kpis?.cobradoMes ?? 0)}`}
              detalle="Cobros e iniciales de la tienda"
              icono={CircleDollarSign}
              tono="success"
            />
            <TarjetaKpi
              etiqueta="Por liquidar (Cashea)"
              valor={`$ ${formatearNumero(kpis?.porLiquidarCashea ?? 0)}`}
              detalle="Saldo pendiente de Cashea"
              icono={HandCoins}
              tono="info"
            />
            <TarjetaKpi
              etiqueta="Liquidado (Cashea)"
              valor={`$ ${formatearNumero(kpis?.liquidadoCashea ?? 0)}`}
              detalle="Transferencias ya recibidas"
              icono={BadgeCheck}
              tono="success"
            />
          </>
        )}
      </div>

      <Card className="flex flex-col gap-4 p-4">
        <FiltrosFinanciamientos
          modalidad={modalidad}
          estado={estado}
          busqueda={busqueda}
          desde={desde}
          hasta={hasta}
          rangoInvalido={rangoInvalido}
          onCambioModalidad={setModalidad}
          onCambioEstado={setEstado}
          onCambioBusqueda={setBusqueda}
          onCambioDesde={setDesde}
          onCambioHasta={setHasta}
          onLimpiar={limpiarFiltros}
        />
        <p
          role={rangoInvalido ? "alert" : "status"}
          className="text-xs text-muted-foreground"
        >
          {rangoInvalido
            ? "La fecha «desde» no puede ser posterior a «hasta»."
            : `Mostrando ${planes.length} plan(es)${termino ? ` para «${termino}»` : ""}.`}
        </p>
      </Card>

      {rangoInvalido ? (
        <Card role="alert" className="p-6 text-sm text-muted-foreground">
          Corrige el rango de fechas para consultar los financiamientos.
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
          titulo="No se pudieron cargar los financiamientos"
          descripcion="Revisa tu conexión e inténtalo de nuevo."
          accion={
            <Button onClick={() => setRecarga((valor) => valor + 1)}>
              Reintentar
            </Button>
          }
        />
      ) : planes.length === 0 ? (
        <EmptyState
          icono={Wallet}
          titulo="Sin financiamientos"
          descripcion={
            hayFiltros
              ? "No hay planes que coincidan con los filtros seleccionados."
              : "Las ventas financiadas de Cashea o «Por la tienda» aparecerán aquí."
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
        <TablaFinanciamientos
          financiamientos={planes}
          hayMas={cursor !== null}
          cargandoMas={cargandoMas}
          onCargarMas={() => void cargarMas()}
          onCobrar={abrirCobro}
          onLiquidar={abrirLiquidacion}
        />
      )}

      {cobro ? (
        <DialogoRegistrarPago
          abierto
          onAbiertoCambio={(abierto) => {
            if (!abierto) setCobro(null);
          }}
          financiamiento={cobro.financiamiento}
          cuota={cobro.cuota}
          onRegistrado={() => setRecarga((valor) => valor + 1)}
        />
      ) : null}

      {liquidacionCashea ? (
        <DialogoLiquidarCashea
          abierto
          onAbiertoCambio={(abierto) => {
            if (!abierto) setLiquidacionCashea(null);
          }}
          financiamiento={liquidacionCashea}
          onConfirmado={() => setRecarga((valor) => valor + 1)}
        />
      ) : null}
    </div>
  );
}

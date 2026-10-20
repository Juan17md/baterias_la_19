"use client";

import { useEffect, useState } from "react";
import {
  CircleDollarSign,
  Package,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MAXIMO_DIAS_ESTADISTICAS,
  obtenerEstadisticas,
} from "@/lib/servicios/estadisticas";
import {
  cn,
  contarDiasInclusivos,
  fechaAInput,
  fechaDesdeInput,
  formatearNumero,
  inicioDelDia,
  sumarDias,
} from "@/lib/utils";
import type { EstadisticasPeriodo, RangoEstadisticas } from "@/types";
import { DistribucionPagos } from "./distribucion-pagos";
import { GraficoVentasDia } from "./grafico-ventas-dia";
import { SelectorRango, type PresetRango } from "./selector-rango";
import { TarjetaKpi } from "./tarjeta-kpi";
import { TopProductos } from "./top-productos";

function rangoPreset(
  preset: Exclude<PresetRango, "personalizado">,
  hoy = new Date(),
): RangoEstadisticas {
  const inicioHoy = inicioDelDia(hoy);
  if (preset === "hoy") {
    return { desde: new Date(inicioHoy), hasta: inicioHoy };
  }
  if (preset === "semana") {
    // getDay() devuelve 0 para domingo; se desplaza para que la semana inicie lunes.
    const desplazamientoLunes = (inicioHoy.getDay() + 6) % 7;
    const lunes = sumarDias(inicioHoy, -desplazamientoLunes);

    return { desde: lunes, hasta: sumarDias(lunes, 6) };
  }
  return {
    desde: new Date(inicioHoy.getFullYear(), inicioHoy.getMonth(), 1),
    hasta: inicioHoy,
  };
}

function CargandoEstadisticas() {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-label="Cargando estadísticas"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, indice) => (
          <div
            key={indice}
            className="rounded-lg border border-border bg-card p-5"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function AlertaError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-text sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="inline-flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {mensaje}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}

/** Página de estadísticas: rango, KPIs y desgloses del período. */
export function ModuloEstadisticas() {
  const [preset, setPreset] = useState<PresetRango>("semana");
  const [rango, setRango] = useState<RangoEstadisticas>(() =>
    rangoPreset("semana"),
  );
  const [desdeInput, setDesdeInput] = useState(() => fechaAInput(rango.desde));
  const [hastaInput, setHastaInput] = useState(() => fechaAInput(rango.hasta));
  const [errorRango, setErrorRango] = useState<string | null>(null);
  const [datos, setDatos] = useState<EstadisticasPeriodo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const resultado = await obtenerEstadisticas(rango);
        if (!cancelado) setDatos(resultado);
      } catch (fallo) {
        if (!cancelado) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudieron cargar las estadísticas.",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [rango, recarga]);

  function cambiarPreset(nuevo: PresetRango) {
    if (nuevo === "personalizado") {
      setDesdeInput(fechaAInput(rango.desde));
      setHastaInput(fechaAInput(rango.hasta));
      setPreset(nuevo);
      setErrorRango(null);
      return;
    }

    const nuevoRango = rangoPreset(nuevo);
    setPreset(nuevo);
    setRango(nuevoRango);
    setDatos(null);
    setError(null);
    setCargando(true);
    setDesdeInput(fechaAInput(nuevoRango.desde));
    setHastaInput(fechaAInput(nuevoRango.hasta));
    setErrorRango(null);
  }

  function aplicarPersonalizado() {
    const desde = fechaDesdeInput(desdeInput);
    const hasta = fechaDesdeInput(hastaInput);

    if (!desde || !hasta) {
      setErrorRango("Selecciona la fecha inicial y la final.");
      return;
    }
    if (hasta.getTime() < desde.getTime()) {
      setErrorRango("La fecha final no puede ser anterior a la inicial.");
      return;
    }
    if (contarDiasInclusivos(desde, hasta) > MAXIMO_DIAS_ESTADISTICAS) {
      setErrorRango(`El rango máximo es de ${MAXIMO_DIAS_ESTADISTICAS} días.`);
      return;
    }

    setErrorRango(null);
    setPreset("personalizado");
    setRango({ desde, hasta });
    setDatos(null);
    setError(null);
    setCargando(true);
  }

  function recargar() {
    setError(null);
    setCargando(true);
    setRecarga((valor) => valor + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Estadísticas"
        descripcion="KPIs y gráficos por rango de fechas: ingresos, unidades vendidas, ticket promedio, productos y métodos de pago."
        acciones={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={recargar}
            disabled={cargando}
          >
            <RefreshCw
              className={cn("size-4", cargando && "animate-spin")}
              aria-hidden="true"
            />
            Actualizar
          </Button>
        }
      />

      <SelectorRango
        preset={preset}
        desde={rango.desde}
        hasta={rango.hasta}
        desdeInput={desdeInput}
        hastaInput={hastaInput}
        errorRango={errorRango}
        onCambioPreset={cambiarPreset}
        onCambioDesde={setDesdeInput}
        onCambioHasta={setHastaInput}
        onAplicar={aplicarPersonalizado}
      />

      {cargando && !datos ? <CargandoEstadisticas /> : null}

      {error ? <AlertaError mensaje={error} onReintentar={recargar} /> : null}

      {datos ? (
        <div className="flex flex-col gap-4" aria-busy={cargando}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaKpi
              etiqueta="Ingresos"
              valor={`$ ${formatearNumero(datos.kpis.ingresosUsd)}`}
              detalle={`Bs ${formatearNumero(datos.kpis.ingresosBs)}`}
              icono={CircleDollarSign}
              tono="primary"
            />
            <TarjetaKpi
              etiqueta="Ventas"
              valor={String(datos.kpis.ventas)}
              detalle={
                datos.kpis.ventas === 1
                  ? "venta completada"
                  : "ventas completadas"
              }
              icono={ReceiptText}
              tono="info"
            />
            <TarjetaKpi
              etiqueta="Unidades vendidas"
              valor={String(datos.kpis.unidades)}
              detalle={
                datos.kpis.unidades === 1
                  ? "unidad vendida"
                  : "unidades vendidas"
              }
              icono={Package}
              tono="success"
            />
            <TarjetaKpi
              etiqueta="Ticket promedio"
              valor={`$ ${formatearNumero(datos.kpis.ticketPromedio)}`}
              detalle="por venta"
              icono={TrendingUp}
              tono="warning"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Los importes en Bs se calculan con la tasa BCV guardada en cada
            venta.
          </p>

          {datos.kpis.ventas > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <GraficoVentasDia serie={datos.serie} />
              </div>
              <TopProductos productos={datos.productos} />
              <DistribucionPagos metodos={datos.metodosPago} />
            </div>
          ) : (
            <div
              role="status"
              className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
            >
              No hay ventas completadas en el período seleccionado. Prueba con
              otro rango de fechas.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Timestamp as TipoTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import {
  calcularEstadoFinanciamiento,
  calcularPlanFinanciamiento,
  calcularProximaCuota,
  calcularSaldoPendiente,
  derivarEstadoCuota,
  redondear2,
  type EntradaPlanFinanciamiento,
} from "@/lib/dominio/financiamientos";
import {
  esquemaAnulacionPago,
  esquemaLiquidacionCashea,
  esquemaPagoFinanciamiento,
  type DatosLiquidacionCashea,
  type DatosPagoFinanciamiento,
} from "@/lib/validaciones/financiamientos";
import { esMetodoPago } from "@/lib/validaciones/metodos-pago";
import type {
  CuotaFinanciamiento,
  EstadoCuota,
  EstadoFinanciamiento,
  Financiamiento,
  LiquidacionCashea,
  MetodoPago,
  PagoFinanciamiento,
} from "@/types";

const COLECCION = "financiamientos";
const ESTADOS_CUOTA: EstadoCuota[] = [
  "pendiente",
  "pagada",
  "vencida",
  "informativa",
];

function mapearCuota(
  datos: Record<string, unknown>,
  hoy: Date,
): CuotaFinanciamiento {
  const estado = ESTADOS_CUOTA.includes(datos.estado as EstadoCuota)
    ? (datos.estado as EstadoCuota)
    : "pendiente";
  const cuota: CuotaFinanciamiento = {
    numero: Number(datos.numero ?? 0),
    monto: Number(datos.monto ?? 0),
    fechaVencimiento: (datos.fechaVencimiento as TipoTimestamp | null) ?? null,
    estado,
    pagoId: datos.pagoId == null ? null : String(datos.pagoId),
  };
  return { ...cuota, estado: derivarEstadoCuota(cuota, hoy) };
}

function mapearLiquidacion(
  datos: Record<string, unknown> | null | undefined,
): LiquidacionCashea | null {
  if (!datos) return null;
  return {
    montoEsperado: Number(datos.montoEsperado ?? 0),
    fechaEsperada: (datos.fechaEsperada as TipoTimestamp | null) ?? null,
    estado: datos.estado === "recibida" ? "recibida" : "pendiente",
    montoRecibido:
      datos.montoRecibido == null ? null : Number(datos.montoRecibido),
    fechaRecibida: (datos.fechaRecibida as TipoTimestamp | null) ?? null,
    comision: Number(datos.comision ?? 0),
    referencia: datos.referencia == null ? null : String(datos.referencia),
  };
}

export function mapearFinanciamiento(
  id: string,
  datos: Record<string, unknown>,
  hoy: Date = new Date(),
): Financiamiento {
  const modalidad = datos.modalidad === "cashea" ? "cashea" : "tienda";
  const cuotas = Array.isArray(datos.cuotas)
    ? datos.cuotas.map((cuota) =>
        mapearCuota(cuota as Record<string, unknown>, hoy),
      )
    : [];
  const liquidacion = mapearLiquidacion(
    datos.liquidacion as Record<string, unknown> | null | undefined,
  );
  const estadoGuardado = String(datos.estado ?? "activo");
  const estado: EstadoFinanciamiento =
    estadoGuardado === "pagado" || estadoGuardado === "liquidado"
      ? estadoGuardado
      : "activo";
  const estadoDerivado = calcularEstadoFinanciamiento(
    { modalidad, estado, cuotas, liquidacion },
    hoy,
  );
  const saldoPendiente = calcularSaldoPendiente({
    modalidad,
    cuotas,
    liquidacion,
  });
  const cuotasPagadas = cuotas.filter(
    (cuota) => cuota.estado === "pagada",
  ).length;
  const proximaCuota =
    modalidad === "tienda" ? calcularProximaCuota(cuotas) : null;
  const proximaFechaVencimiento =
    modalidad === "tienda"
      ? (proximaCuota?.fechaVencimiento ?? null)
      : liquidacion?.estado === "pendiente"
        ? liquidacion.fechaEsperada
        : null;
  const cliente = (datos.cliente ?? {}) as Record<string, unknown>;
  const metodoPagoInicial = esMetodoPago(datos.metodoPagoInicial)
    ? datos.metodoPagoInicial
    : "efectivo_usd";

  return {
    id,
    ventaId: String(datos.ventaId ?? ""),
    numeroVenta: Number(datos.numeroVenta ?? 0),
    modalidad,
    cliente: {
      nombre: String(cliente.nombre ?? ""),
      telefono: String(cliente.telefono ?? ""),
    },
    totalVenta: Number(datos.totalVenta ?? 0),
    inicial: Number(datos.inicial ?? 0),
    metodoPagoInicial,
    recargo: Number(datos.recargo ?? 0),
    montoFinanciado: Number(datos.montoFinanciado ?? 0),
    numeroCuotas: Number(datos.numeroCuotas ?? cuotas.length),
    montoCuota: Number(datos.montoCuota ?? cuotas[0]?.monto ?? 0),
    diasEntreCuotas: Number(datos.diasEntreCuotas ?? 0),
    fechaVenta: (datos.fechaVenta as TipoTimestamp | null) ?? null,
    fechaPrimeraCuota:
      (datos.fechaPrimeraCuota as TipoTimestamp | null) ??
      cuotas[0]?.fechaVencimiento ??
      null,
    fechaUltimaCuota:
      (datos.fechaUltimaCuota as TipoTimestamp | null) ??
      cuotas[cuotas.length - 1]?.fechaVencimiento ??
      null,
    tasaBCVVenta: Number(datos.tasaBCVVenta ?? 0),
    cuotas,
    cuotasPagadas,
    saldoPendiente,
    proximaCuotaNumero: proximaCuota?.numero ?? null,
    proximaFechaVencimiento,
    estado,
    estadoDerivado,
    liquidacion,
    notas: datos.notas == null ? null : String(datos.notas),
    creadoEn: (datos.creadoEn as TipoTimestamp | null) ?? null,
    actualizadoEn: (datos.actualizadoEn as TipoTimestamp | null) ?? null,
  };
}

export function mapearPago(
  id: string,
  datos: Record<string, unknown>,
): PagoFinanciamiento {
  const anulacion = datos.anulacion as
    Record<string, unknown> | null | undefined;
  return {
    id,
    fecha: (datos.fecha as TipoTimestamp | null) ?? null,
    monto: Number(datos.monto ?? 0),
    metodoPago: esMetodoPago(datos.metodoPago)
      ? (datos.metodoPago as MetodoPago)
      : "efectivo_usd",
    referencia: datos.referencia == null ? null : String(datos.referencia),
    nota: datos.nota == null ? null : String(datos.nota),
    cuotaNumero: Number(datos.cuotaNumero ?? 0),
    tasaBCV: Number(datos.tasaBCV ?? 0),
    montoBs: Number(datos.montoBs ?? 0),
    anulacion: anulacion
      ? {
          motivo: String(anulacion.motivo ?? ""),
          fecha: (anulacion.fecha as TipoTimestamp | null) ?? null,
        }
      : null,
    creadoEn: (datos.creadoEn as TipoTimestamp | null) ?? null,
  };
}

export type EntradaDocumentoFinanciamiento = EntradaPlanFinanciamiento & {
  ventaId: string;
  numeroVenta: number;
  cliente: { nombre: string; telefono: string };
  metodoPagoInicial: MetodoPago;
  tasaBCV: number;
  notas?: string | null;
};

/**
 * Construye el documento de `financiamientos` que se escribe en la misma
 * transacción de la venta. El cálculo siempre se recalcula aquí.
 */
export function construirDocumentoFinanciamiento(
  entrada: EntradaDocumentoFinanciamiento,
): Record<string, unknown> {
  const plan = calcularPlanFinanciamiento({
    modalidad: entrada.modalidad,
    totalVenta: entrada.totalVenta,
    inicial: entrada.inicial,
    recargo: entrada.recargo ?? 0,
    numeroCuotas: entrada.numeroCuotas,
    diasEntreCuotas: entrada.diasEntreCuotas,
    fechaVenta: entrada.fechaVenta,
  });
  const proximaFechaVencimiento =
    entrada.modalidad === "tienda"
      ? plan.fechaPrimeraCuota
      : (plan.liquidacion?.fechaEsperada ?? null);

  return {
    ventaId: entrada.ventaId,
    numeroVenta: entrada.numeroVenta,
    modalidad: entrada.modalidad,
    cliente: entrada.cliente,
    totalVenta: entrada.totalVenta,
    inicial: entrada.inicial,
    metodoPagoInicial: entrada.metodoPagoInicial,
    recargo: entrada.recargo ?? 0,
    montoFinanciado: plan.montoFinanciado,
    numeroCuotas: entrada.numeroCuotas,
    montoCuota: plan.montoCuota,
    diasEntreCuotas: entrada.diasEntreCuotas,
    fechaVenta: Timestamp.fromDate(entrada.fechaVenta),
    fechaPrimeraCuota: plan.fechaPrimeraCuota,
    fechaUltimaCuota: plan.fechaUltimaCuota,
    tasaBCVVenta: entrada.tasaBCV,
    cuotas: plan.cuotas,
    cuotasPagadas: 0,
    saldoPendiente:
      entrada.modalidad === "cashea"
        ? (plan.liquidacion?.montoEsperado ?? plan.montoFinanciado)
        : plan.montoFinanciado,
    proximaCuotaNumero: entrada.modalidad === "tienda" ? 1 : null,
    proximaFechaVencimiento,
    estado: "activo",
    liquidacion: plan.liquidacion,
    notas: entrada.notas ?? null,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  };
}

export type FiltrosFinanciamientos = {
  modalidad?: "todas" | "cashea" | "tienda";
  estado?: "todos" | "activo" | "pagado" | "liquidado" | "vencido";
  desde?: Date | null;
  hasta?: Date | null;
  cantidad?: number;
  cursor?: QueryDocumentSnapshot | null;
};

export type PaginaFinanciamientos = {
  financiamientos: Financiamiento[];
  /** Cursor para pedir la página siguiente (`null` si ya no hay más). */
  ultimo: QueryDocumentSnapshot | null;
};

/**
 * Listado paginado de financiamientos. El estado «vencido» se consulta por
 * fecha (`proximaFechaVencimiento`) porque no se persiste.
 */
export async function listarFinanciamientos(
  filtros: FiltrosFinanciamientos = {},
): Promise<PaginaFinanciamientos> {
  const {
    modalidad = "todas",
    estado = "todos",
    desde = null,
    hasta = null,
    cantidad = 12,
    cursor = null,
  } = filtros;

  const condiciones: QueryConstraint[] = [];
  if (modalidad !== "todas") {
    condiciones.push(where("modalidad", "==", modalidad));
  }
  if (estado === "vencido") {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    condiciones.push(where("estado", "==", "activo"));
    condiciones.push(
      where("proximaFechaVencimiento", "<", Timestamp.fromDate(inicioHoy)),
    );
  } else if (estado !== "todos") {
    condiciones.push(where("estado", "==", estado));
  }
  // Las fechas no se combinan con «vencido» para no multiplicar índices.
  if (estado !== "vencido" && desde) {
    condiciones.push(where("fechaVenta", ">=", Timestamp.fromDate(desde)));
  }
  if (estado !== "vencido" && hasta) {
    condiciones.push(where("fechaVenta", "<", Timestamp.fromDate(hasta)));
  }

  const orden =
    estado === "vencido"
      ? orderBy("proximaFechaVencimiento", "asc")
      : orderBy("fechaVenta", "desc");

  const consulta = query(
    collection(db, COLECCION),
    ...condiciones,
    orden,
    ...(cursor ? [startAfter(cursor)] : []),
    limit(cantidad),
  );
  const instantanea = await getDocs(consulta);
  let financiamientos = instantanea.docs.map((documento) =>
    mapearFinanciamiento(documento.id, documento.data()),
  );

  // Filtro en memoria solo para el caso «vencido» + rango de fechas.
  if (estado === "vencido" && (desde || hasta)) {
    financiamientos = financiamientos.filter((financiamiento) => {
      const fecha = financiamiento.fechaVenta?.toDate();
      if (!fecha) return false;
      if (desde && fecha < desde) return false;
      if (hasta && fecha >= hasta) return false;
      return true;
    });
  }

  return {
    financiamientos,
    ultimo:
      instantanea.docs.length === cantidad
        ? (instantanea.docs[instantanea.docs.length - 1] ?? null)
        : null,
  };
}

/** Lee un financiamiento por su ID. */
export async function obtenerFinanciamiento(
  id: string,
): Promise<Financiamiento | null> {
  const instantanea = await getDoc(doc(db, COLECCION, id));
  return instantanea.exists()
    ? mapearFinanciamiento(instantanea.id, instantanea.data())
    : null;
}

/**
 * Carga todos los planes que cumplen los filtros (con un tope de seguridad)
 * para poder buscar por cliente o número de venta sin depender de la página
 * cargada.
 */
export async function listarFinanciamientosCompletos(
  filtros: Omit<FiltrosFinanciamientos, "cantidad" | "cursor">,
  limite = 300,
): Promise<Financiamiento[]> {
  const financiamientos: Financiamiento[] = [];
  let cursor: QueryDocumentSnapshot | null = null;

  while (financiamientos.length < limite) {
    const pagina = await listarFinanciamientos({
      ...filtros,
      cantidad: Math.min(100, limite - financiamientos.length),
      cursor,
    });
    financiamientos.push(...pagina.financiamientos);
    if (!pagina.ultimo) break;
    cursor = pagina.ultimo;
  }

  return financiamientos;
}

/** Resumen de cobranza para las tarjetas del módulo de financiamientos. */
export type KpisFinanciamientos = {
  /** Saldo por cobrar de los planes de la tienda (incluye lo vencido). */
  porCobrar: number;
  /** Saldo vencido de los planes de la tienda. */
  vencido: number;
  /** Cobros del mes (cuotas de la tienda) más las iniciales del mes. */
  cobradoMes: number;
  /** Saldo que Cashea debe liquidar a la tienda. */
  porLiquidarCashea: number;
  /** Total ya liquidado por Cashea. */
  liquidadoCashea: number;
  /** Planes de la tienda activos (incluidos los vencidos). */
  planesActivos: number;
  /** Planes de la tienda con cuotas vencidas. */
  planesVencidos: number;
};

async function consultarDocumentos(
  condiciones: QueryConstraint[],
): Promise<Record<string, unknown>[]> {
  const consulta = query(collection(db, COLECCION), ...condiciones);
  const instantanea = await getDocs(consulta);
  return instantanea.docs.map((documento) => documento.data());
}

function sumarCampo(
  documentos: Record<string, unknown>[],
  campo: string,
): number {
  return redondear2(
    documentos.reduce(
      (suma, documento) => suma + Number(documento[campo] ?? 0),
      0,
    ),
  );
}

/** Suma de los pagos no anulados dentro de un rango de fechas. */
async function cobrarPagosEnRango(desde: Date, hasta: Date): Promise<number> {
  const consulta = query(
    collectionGroup(db, "pagos"),
    where("fecha", ">=", Timestamp.fromDate(desde)),
    where("fecha", "<", Timestamp.fromDate(hasta)),
    // El orden se apoya en el índice automático de un solo campo de `pagos`.
    orderBy("fecha", "desc"),
  );
  const instantanea = await getDocs(consulta);
  return redondear2(
    instantanea.docs.reduce((suma, documento) => {
      const datos = documento.data();
      if (datos.anulacion != null) return suma;
      return suma + Number(datos.monto ?? 0);
    }, 0),
  );
}

/**
 * Calcula los indicadores de cobranza: por cobrar y vencido de «Por la
 * tienda», cobrado del mes, y los saldos de Cashea por liquidar y liquidados.
 */
export async function obtenerKpisFinanciamientos(): Promise<KpisFinanciamientos> {
  const ahora = new Date();
  const inicioHoy = new Date(ahora);
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

  const [
    tiendaActivos,
    tiendaVencidos,
    casheaActivos,
    casheaLiquidados,
    pagosMes,
    tiendaDelMes,
  ] = await Promise.all([
    consultarDocumentos([
      where("modalidad", "==", "tienda"),
      where("estado", "==", "activo"),
    ]),
    consultarDocumentos([
      where("modalidad", "==", "tienda"),
      where("estado", "==", "activo"),
      where("proximaFechaVencimiento", "<", Timestamp.fromDate(inicioHoy)),
    ]),
    consultarDocumentos([
      where("modalidad", "==", "cashea"),
      where("estado", "==", "activo"),
    ]),
    consultarDocumentos([
      where("modalidad", "==", "cashea"),
      where("estado", "==", "liquidado"),
    ]),
    cobrarPagosEnRango(inicioMes, finMes),
    consultarDocumentos([
      where("modalidad", "==", "tienda"),
      where("fechaVenta", ">=", Timestamp.fromDate(inicioMes)),
      where("fechaVenta", "<", Timestamp.fromDate(finMes)),
      // El orden explícito coincide con el índice de «modalidad + fechaVenta».
      orderBy("fechaVenta", "desc"),
    ]),
  ]);

  const liquidadoCashea = redondear2(
    casheaLiquidados.reduce((suma, documento) => {
      const liquidacion = documento.liquidacion as
        Record<string, unknown> | null | undefined;
      return suma + Number(liquidacion?.montoRecibido ?? 0);
    }, 0),
  );

  return {
    porCobrar: sumarCampo(tiendaActivos, "saldoPendiente"),
    vencido: sumarCampo(tiendaVencidos, "saldoPendiente"),
    cobradoMes: redondear2(pagosMes + sumarCampo(tiendaDelMes, "inicial")),
    porLiquidarCashea: sumarCampo(casheaActivos, "saldoPendiente"),
    liquidadoCashea,
    planesActivos: tiendaActivos.length,
    planesVencidos: tiendaVencidos.length,
  };
}

/** Historial de pagos de un financiamiento, del más reciente al más antiguo. */
export async function listarPagos(
  financiamientoId: string,
): Promise<PagoFinanciamiento[]> {
  const consulta = query(
    collection(db, COLECCION, financiamientoId, "pagos"),
    orderBy("fecha", "desc"),
  );
  const instantanea = await getDocs(consulta);
  return instantanea.docs.map((documento) =>
    mapearPago(documento.id, documento.data()),
  );
}

export type ResultadoPago = {
  pagoId: string;
  monto: number;
  saldoPendiente: number;
  estado: EstadoFinanciamiento;
};

/**
 * Cobra una cuota completa de «Por la tienda» en una transacción: crea el
 * pago, marca la cuota y recalcula saldo, próxima cuota y estado.
 */
export async function registrarPago(
  financiamientoId: string,
  datos: DatosPagoFinanciamiento,
): Promise<ResultadoPago> {
  const validado = esquemaPagoFinanciamiento.safeParse(datos);
  if (!validado.success) {
    throw new Error("Los datos del cobro no son válidos.");
  }
  const { cuotaNumero, metodoPago, referencia, nota, fecha } = validado.data;

  return runTransaction(db, async (transaccion) => {
    const financiamientoRef = doc(db, COLECCION, financiamientoId);
    const tasaRef = doc(db, "configuracion", "tasa");
    const [financiamientoSnap, tasaSnap] = await Promise.all([
      transaccion.get(financiamientoRef),
      transaccion.get(tasaRef),
    ]);

    if (!financiamientoSnap.exists()) {
      throw new Error("El financiamiento ya no existe.");
    }
    const datosFinanciamiento = financiamientoSnap.data() as Record<
      string,
      unknown
    >;
    if (datosFinanciamiento.modalidad !== "tienda") {
      throw new Error(
        "Solo los financiamientos de la tienda se cobran desde el sistema.",
      );
    }
    const estadoGuardado = String(datosFinanciamiento.estado ?? "activo");
    if (estadoGuardado === "pagado") {
      throw new Error("Este financiamiento ya está pagado.");
    }
    if (estadoGuardado === "liquidado") {
      throw new Error("Este financiamiento no admite cobros.");
    }

    const tasaBCV = Number(tasaSnap.data()?.valor ?? 0);
    if (!Number.isFinite(tasaBCV) || tasaBCV <= 0) {
      throw new Error(
        "No hay una tasa BCV válida configurada. Corrige la tasa e inténtalo de nuevo.",
      );
    }

    const hoy = new Date();
    const cuotas = Array.isArray(datosFinanciamiento.cuotas)
      ? datosFinanciamiento.cuotas.map((cuota) =>
          mapearCuota(cuota as Record<string, unknown>, hoy),
        )
      : [];
    const indice = cuotas.findIndex((cuota) => cuota.numero === cuotaNumero);
    if (indice < 0) {
      throw new Error("La cuota indicada no existe.");
    }
    const cuota = cuotas[indice];
    if (cuota.estado === "pagada") {
      throw new Error("Esta cuota ya fue pagada.");
    }
    if (cuota.estado === "informativa") {
      throw new Error("Esta cuota la cobra Cashea, no la tienda.");
    }
    const monto = redondear2(cuota.monto);
    if (!(monto > 0)) {
      throw new Error("La cuota no tiene un monto válido.");
    }

    const pagoRef = doc(collection(db, COLECCION, financiamientoId, "pagos"));
    const nuevasCuotas = cuotas.map((cuotaActual, posicion) =>
      posicion === indice
        ? { ...cuotaActual, estado: "pagada" as const, pagoId: pagoRef.id }
        : cuotaActual,
    );
    const siguiente = calcularProximaCuota(nuevasCuotas);
    const saldoPendiente = calcularSaldoPendiente({
      modalidad: "tienda",
      cuotas: nuevasCuotas,
      liquidacion: null,
    });
    const estado: EstadoFinanciamiento = siguiente ? "activo" : "pagado";
    const fechaPago = fecha
      ? Timestamp.fromDate(fecha)
      : Timestamp.fromDate(new Date());

    transaccion.set(pagoRef, {
      fecha: fechaPago,
      monto,
      metodoPago,
      referencia: referencia === "" ? null : referencia,
      nota: nota === "" ? null : nota,
      cuotaNumero,
      tasaBCV,
      montoBs: redondear2(monto * tasaBCV),
      anulacion: null,
      creadoEn: serverTimestamp(),
    });

    transaccion.update(financiamientoRef, {
      cuotas: nuevasCuotas,
      cuotasPagadas: nuevasCuotas.filter((item) => item.estado === "pagada")
        .length,
      saldoPendiente,
      proximaCuotaNumero: siguiente?.numero ?? null,
      proximaFechaVencimiento: siguiente?.fechaVencimiento ?? null,
      estado,
      actualizadoEn: serverTimestamp(),
    });

    return { pagoId: pagoRef.id, monto, saldoPendiente, estado };
  });
}

/**
 * Anula un cobro con motivo obligatorio. El pago no se borra: queda auditado
 * y la cuota vuelve a pendiente o vencida.
 */
export async function anularPago(
  financiamientoId: string,
  pagoId: string,
  motivo: string,
): Promise<void> {
  const validado = esquemaAnulacionPago.safeParse({ motivo });
  if (!validado.success) {
    throw new Error("Indica el motivo de la anulación (mínimo 3 caracteres).");
  }

  await runTransaction(db, async (transaccion) => {
    const financiamientoRef = doc(db, COLECCION, financiamientoId);
    const pagoRef = doc(db, COLECCION, financiamientoId, "pagos", pagoId);
    const [financiamientoSnap, pagoSnap] = await Promise.all([
      transaccion.get(financiamientoRef),
      transaccion.get(pagoRef),
    ]);

    if (!financiamientoSnap.exists()) {
      throw new Error("El financiamiento ya no existe.");
    }
    if (!pagoSnap.exists()) {
      throw new Error("El pago ya no existe.");
    }
    const datosFinanciamiento = financiamientoSnap.data() as Record<
      string,
      unknown
    >;
    if (datosFinanciamiento.modalidad !== "tienda") {
      throw new Error("Solo se anulan cobros de financiamientos de la tienda.");
    }
    const pago = pagoSnap.data() as Record<string, unknown>;
    if (pago.anulacion != null) {
      throw new Error("Este pago ya está anulado.");
    }

    const hoy = new Date();
    const cuotas = Array.isArray(datosFinanciamiento.cuotas)
      ? datosFinanciamiento.cuotas.map((cuota) =>
          mapearCuota(cuota as Record<string, unknown>, hoy),
        )
      : [];
    const indice = cuotas.findIndex((cuota) => cuota.pagoId === pagoId);
    if (indice < 0) {
      throw new Error("No se encontró la cuota asociada al pago.");
    }

    const cuotaRestaurada: CuotaFinanciamiento = {
      ...cuotas[indice],
      estado: "pendiente",
      pagoId: null,
    };
    const nuevasCuotas = cuotas.map((cuota, posicion) =>
      posicion === indice
        ? {
            ...cuotaRestaurada,
            estado: derivarEstadoCuota(cuotaRestaurada, hoy),
          }
        : cuota,
    );
    const siguiente = calcularProximaCuota(nuevasCuotas);
    const saldoPendiente = calcularSaldoPendiente({
      modalidad: "tienda",
      cuotas: nuevasCuotas,
      liquidacion: null,
    });
    const estado: EstadoFinanciamiento = siguiente ? "activo" : "pagado";

    transaccion.update(pagoRef, {
      anulacion: {
        motivo: validado.data.motivo,
        fecha: serverTimestamp(),
      },
    });
    transaccion.update(financiamientoRef, {
      cuotas: nuevasCuotas,
      cuotasPagadas: nuevasCuotas.filter((item) => item.estado === "pagada")
        .length,
      saldoPendiente,
      proximaCuotaNumero: siguiente?.numero ?? null,
      proximaFechaVencimiento: siguiente?.fechaVencimiento ?? null,
      estado,
      actualizadoEn: serverTimestamp(),
    });
  });
}

/**
 * Confirma que Cashea transfirió el saldo semanal. Solo aplica a planes de
 * Cashea y deja la liquidación auditada.
 */
export async function marcarLiquidacionCashea(
  financiamientoId: string,
  datos: DatosLiquidacionCashea,
): Promise<void> {
  const validado = esquemaLiquidacionCashea.safeParse(datos);
  if (!validado.success) {
    throw new Error("Los datos de la liquidación no son válidos.");
  }

  await runTransaction(db, async (transaccion) => {
    const financiamientoRef = doc(db, COLECCION, financiamientoId);
    const financiamientoSnap = await transaccion.get(financiamientoRef);
    if (!financiamientoSnap.exists()) {
      throw new Error("El financiamiento ya no existe.");
    }
    const datosFinanciamiento = financiamientoSnap.data() as Record<
      string,
      unknown
    >;
    if (datosFinanciamiento.modalidad !== "cashea") {
      throw new Error("Este financiamiento no es de Cashea.");
    }
    const liquidacion = datosFinanciamiento.liquidacion as
      Record<string, unknown> | null | undefined;
    if (!liquidacion) {
      throw new Error("El financiamiento no tiene una liquidación pendiente.");
    }
    if (liquidacion.estado === "recibida") {
      throw new Error("La liquidación ya fue confirmada.");
    }

    const fecha = validado.data.fechaRecibida ?? new Date();
    transaccion.update(financiamientoRef, {
      liquidacion: {
        ...liquidacion,
        estado: "recibida",
        montoRecibido: redondear2(validado.data.montoRecibido),
        fechaRecibida: Timestamp.fromDate(fecha),
        referencia:
          validado.data.referencia === "" ? null : validado.data.referencia,
      },
      estado: "liquidado",
      saldoPendiente: 0,
      actualizadoEn: serverTimestamp(),
    });
  });
}

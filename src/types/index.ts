import type { Timestamp } from "firebase/firestore";

/** Roles del sistema: el rol solo cambia el acceso a la gestión de usuarios. */
export type RolUsuario = "admin" | "usuario";

/** Documento `usuarios/{uid}` de Firestore. */
export type Usuario = {
  uid: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  /** `true` cuando la cuenta usa una contraseña temporal y debe cambiarla. */
  debeCambiarContrasena: boolean;
  /** `true` cuando el usuario ya completó la guía inicial del sistema. */
  onboardingCompletado: boolean;
  creadoEn: Timestamp | null;
};

/** Origen de la tasa BCV guardada en `configuracion/tasa`. */
export type FuenteTasa = "dolarapi_oficial" | "manual";

/** Documento `configuracion/tasa` de Firestore. */
export type TasaBCV = {
  valor: number;
  fuente: FuenteTasa;
  fechaActualizacion: Timestamp | null;
  actualizadoPor: { uid: string; nombre: string } | null;
};

/** Estado de stock derivado de `stock` y `stockMinimo` (06_Design_System §3.3). */
export type EstadoStock = "en_stock" | "bajo" | "agotado";

/** Snapshot mínimo de un usuario para auditar operaciones (movimientos, ventas). */
export type ResumenUsuario = { uid: string; nombre: string };

/** Documento `baterias/{id}` de Firestore. */
export type Bateria = {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  voltaje: number;
  amperaje: number;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
  proveedor: string | null;
  garantiaMeses: number;
  activo: boolean;
  imagenUrl: string | null;
  creadoEn: Timestamp | null;
  actualizadoEn: Timestamp | null;
};

/** Naturaleza de un movimiento de inventario. */
export type TipoMovimiento = "entrada" | "salida" | "ajuste" | "devolucion";

/** Documento `movimientos/{id}` de Firestore (inmutable). */
export type Movimiento = {
  id: string;
  fecha: Timestamp | null;
  tipo: TipoMovimiento;
  bateriaId: string;
  bateriaResumen: { codigo: string; marca: string; modelo: string };
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  motivo: string;
  ventaId: string | null;
  usuario: ResumenUsuario;
};

/** Formas de pago aceptadas en el mostrador (05_Base_de_Datos §2.3). */
export type MetodoPago =
  | "efectivo_bs"
  | "efectivo_usd"
  | "pago_movil"
  | "transferencia_bs"
  | "zelle"
  | "binance"
  | "punto_venta";

/** Modalidad con la que se paga una venta. */
export type ModalidadPago = "contado" | "cashea" | "tienda";

/** Estado lógico de una venta (la anulación nunca borra el documento). */
export type EstadoVenta = "completada" | "anulada";

/** Ítem embebido en `ventas/{id}.items` (snapshot al momento de vender). */
export type ItemVenta = {
  bateriaId: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

/** Auditoría de la anulación de una venta. */
export type AnulacionVenta = {
  uid: string;
  nombre: string;
  fecha: Timestamp | null;
  motivo: string;
};

/** Documento `ventas/{id}` de Firestore. */
export type Venta = {
  id: string;
  numero: number;
  fecha: Timestamp | null;
  cliente: { nombre: string; telefono: string } | null;
  items: ItemVenta[];
  subtotal: number;
  descuento: number;
  total: number;
  tasaBCV: number;
  totalBs: number;
  metodoPago: MetodoPago;
  /** `contado` en ventas anteriores a la Fase 9. */
  modalidadPago: ModalidadPago;
  /** ID del plan en `financiamientos`; `null` en ventas de contado. */
  financiamientoId: string | null;
  incluyeInstalacion: boolean;
  recibioBateriaUsada: boolean;
  vendedor: ResumenUsuario;
  notas: string | null;
  estado: EstadoVenta;
  anulacion: AnulacionVenta | null;
};

/** Estado persistido de un financiamiento. */
export type EstadoFinanciamiento = "activo" | "pagado" | "liquidado";

/** Estado visible: añade `vencido`, que se deriva por fecha y no se persiste. */
export type EstadoFinanciamientoVisible = EstadoFinanciamiento | "vencido";

/** Estado de una cuota dentro del calendario del financiamiento. */
export type EstadoCuota = "pendiente" | "pagada" | "vencida" | "informativa";

/** Cuota embebida en `financiamientos/{id}.cuotas`. */
export type CuotaFinanciamiento = {
  numero: number;
  monto: number;
  fechaVencimiento: Timestamp | null;
  estado: EstadoCuota;
  /** Pago asociado cuando la cuota está pagada. */
  pagoId: string | null;
};

/** Liquidación semanal que Cashea transfiere a la tienda. */
export type LiquidacionCashea = {
  montoEsperado: number;
  fechaEsperada: Timestamp | null;
  estado: "pendiente" | "recibida";
  montoRecibido: number | null;
  fechaRecibida: Timestamp | null;
  /** Comisión de Cashea; `0` hasta que el negocio la defina. */
  comision: number;
  referencia: string | null;
};

/** Documento `financiamientos/{id}` de Firestore. */
export type Financiamiento = {
  id: string;
  ventaId: string;
  numeroVenta: number;
  modalidad: Exclude<ModalidadPago, "contado">;
  cliente: { nombre: string; telefono: string };
  totalVenta: number;
  inicial: number;
  metodoPagoInicial: MetodoPago;
  /** Recargo de «Por la tienda»; `0` hasta que el negocio lo defina. */
  recargo: number;
  montoFinanciado: number;
  numeroCuotas: number;
  montoCuota: number;
  diasEntreCuotas: number;
  fechaVenta: Timestamp | null;
  fechaPrimeraCuota: Timestamp | null;
  fechaUltimaCuota: Timestamp | null;
  tasaBCVVenta: number;
  cuotas: CuotaFinanciamiento[];
  cuotasPagadas: number;
  saldoPendiente: number;
  proximaCuotaNumero: number | null;
  proximaFechaVencimiento: Timestamp | null;
  estado: EstadoFinanciamiento;
  /** Estado calculado al leer (incluye `vencido`). */
  estadoDerivado: EstadoFinanciamientoVisible;
  liquidacion: LiquidacionCashea | null;
  notas: string | null;
  creadoEn: Timestamp | null;
  actualizadoEn: Timestamp | null;
};

/** Auditoría de la anulación de un pago (el pago no se borra). */
export type AnulacionPago = {
  motivo: string;
  fecha: Timestamp | null;
};

/** Documento `financiamientos/{id}/pagos/{pagoId}` de Firestore. */
export type PagoFinanciamiento = {
  id: string;
  fecha: Timestamp | null;
  monto: number;
  metodoPago: MetodoPago;
  referencia: string | null;
  nota: string | null;
  cuotaNumero: number;
  tasaBCV: number;
  montoBs: number;
  anulacion: AnulacionPago | null;
  creadoEn: Timestamp | null;
};

/** Rango inclusivo de días completos (hora local) para estadísticas. */
export type RangoEstadisticas = {
  desde: Date;
  hasta: Date;
};

/** KPIs agregados de las ventas completadas en un período. */
export type KpisEstadisticas = {
  ingresosUsd: number;
  ingresosBs: number;
  ventas: number;
  unidades: number;
  ticketPromedio: number;
};

/** Punto diario de la serie de ventas e ingresos. */
export type PuntoVentasDia = {
  /** Clave local `YYYY-MM-DD`. */
  fecha: string;
  /** Etiqueta legible, por ejemplo `19 oct`. */
  etiqueta: string;
  totalUsd: number;
  totalBs: number;
  ventas: number;
  unidades: number;
};

/** Producto agregado en el ranking de los más vendidos. */
export type ProductoVendido = {
  bateriaId: string;
  codigo: string;
  descripcion: string;
  unidades: number;
  /** Subtotal de los ítems antes del descuento de la venta. */
  subtotal: number;
};

/** Participación de un método de pago dentro de los ingresos del período. */
export type ResumenMetodoPago = {
  metodo: MetodoPago;
  totalUsd: number;
  ventas: number;
  porcentaje: number;
};

/** Cobranza del período frente a lo vendido. */
export type CobranzaPeriodo = {
  /** Cobrado en el rango: contado, iniciales, cuotas y liquidaciones. */
  cobrado: number;
  /** Saldo pendiente actual de los planes de la tienda. */
  porCobrar: number;
  /** Porcentaje cobrado sobre lo vendido en el rango. */
  porcentajeCobrado: number;
};

/** Resultado completo de la página de estadísticas. */
export type EstadisticasPeriodo = {
  kpis: KpisEstadisticas;
  cobranza: CobranzaPeriodo;
  serie: PuntoVentasDia[];
  productos: ProductoVendido[];
  metodosPago: ResumenMetodoPago[];
};

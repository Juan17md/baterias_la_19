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
  incluyeInstalacion: boolean;
  recibioBateriaUsada: boolean;
  vendedor: ResumenUsuario;
  notas: string | null;
  estado: EstadoVenta;
  anulacion: AnulacionVenta | null;
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

/** Resultado completo de la página de estadísticas. */
export type EstadisticasPeriodo = {
  kpis: KpisEstadisticas;
  serie: PuntoVentasDia[];
  productos: ProductoVendido[];
  metodosPago: ResumenMetodoPago[];
};

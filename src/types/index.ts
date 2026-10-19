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

/** Tecnologías de batería manejadas en el catálogo. */
export type TipoBateria =
  "libre_mantenimiento" | "humeda" | "agm" | "gel" | "efb";

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
  tipo: TipoBateria;
  voltaje: number;
  amperaje: number;
  cca: number | null;
  polaridad: string | null;
  dimensiones: string | null;
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

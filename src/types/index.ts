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

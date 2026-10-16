import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/configuracion";
import type { RolUsuario, Usuario } from "@/types";

function mapearUsuario(uid: string, datos: Record<string, unknown>): Usuario {
  return {
    uid,
    nombre: String(datos.nombre ?? ""),
    email: String(datos.email ?? ""),
    rol: datos.rol === "admin" ? "admin" : "usuario",
    activo: datos.activo === true,
    creadoEn: (datos.creadoEn as Usuario["creadoEn"]) ?? null,
  };
}

/** Lee el perfil (`usuarios/{uid}`) de un usuario. */
export async function obtenerPerfil(uid: string): Promise<Usuario | null> {
  const instantanea = await getDoc(doc(db, "usuarios", uid));
  return instantanea.exists() ? mapearUsuario(uid, instantanea.data()) : null;
}

/** Lista todos los usuarios ordenados por nombre (solo admin). */
export async function listarUsuarios(): Promise<Usuario[]> {
  const consulta = query(collection(db, "usuarios"), orderBy("nombre"));
  const instantanea = await getDocs(consulta);
  return instantanea.docs.map((documento) =>
    mapearUsuario(documento.id, documento.data()),
  );
}

/** Crea el perfil de Firestore de una cuenta recién creada en Authentication. */
export async function crearPerfilUsuario(datos: {
  uid: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}): Promise<void> {
  await setDoc(doc(db, "usuarios", datos.uid), {
    nombre: datos.nombre.trim(),
    email: datos.email.trim().toLowerCase(),
    rol: datos.rol,
    activo: true,
    creadoEn: serverTimestamp(),
  });
}

/** Cambia el rol de un usuario (solo admin). */
export async function actualizarRolUsuario(
  uid: string,
  rol: RolUsuario,
): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { rol });
}

/** Activa o desactiva a un usuario (solo admin). */
export async function cambiarActivoUsuario(
  uid: string,
  activo: boolean,
): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { activo });
}

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { TasaBCV } from "@/types";

const URL_TASA_OFICIAL = "https://ve.dolarapi.com/v1/dolares/oficial";

type RespuestaDolarApi = {
  promedio?: unknown;
  fechaActualizacion?: unknown;
};

/** Tasa obtenida de la API (aún sin guardar). */
export type TasaRemota = {
  valor: number;
  fecha: string | null;
};

/** Consulta la tasa oficial en DolarAPI (ver docs-obsidian/04_Arquitectura, flujo 5.4). */
export async function obtenerTasaDeApi(): Promise<TasaRemota> {
  const respuesta = await fetch(URL_TASA_OFICIAL, { cache: "no-store" });
  if (!respuesta.ok) {
    throw new Error(`La API de tasa respondió con estado ${respuesta.status}`);
  }

  const datos = (await respuesta.json()) as RespuestaDolarApi;
  if (
    typeof datos.promedio !== "number" ||
    !Number.isFinite(datos.promedio) ||
    datos.promedio <= 0
  ) {
    throw new Error("La API de tasa no devolvió un promedio válido");
  }

  return {
    valor: datos.promedio,
    fecha:
      typeof datos.fechaActualizacion === "string"
        ? datos.fechaActualizacion
        : null,
  };
}

/** Lee la tasa guardada en `configuracion/tasa`. */
export async function obtenerTasaGuardada(): Promise<TasaBCV | null> {
  const instantanea = await getDoc(doc(db, "configuracion", "tasa"));
  if (!instantanea.exists()) return null;

  const datos = instantanea.data() as Partial<TasaBCV>;
  if (typeof datos.valor !== "number") return null;

  return {
    valor: datos.valor,
    fuente: datos.fuente === "manual" ? "manual" : "dolarapi_oficial",
    fechaActualizacion: datos.fechaActualizacion ?? null,
    actualizadoPor: datos.actualizadoPor ?? null,
  };
}

/** Guarda la tasa obtenida de la API (actualización automática al abrir el dashboard). */
export async function guardarTasaAutomatica(tasa: TasaRemota): Promise<void> {
  await setDoc(
    doc(db, "configuracion", "tasa"),
    {
      valor: tasa.valor,
      fuente: "dolarapi_oficial",
      fechaActualizacion: tasa.fecha
        ? Timestamp.fromDate(new Date(tasa.fecha))
        : Timestamp.now(),
      actualizadoPor: null,
    },
    { merge: true },
  );
}

/** Corrige la tasa manualmente (solo admin; las reglas lo validan también). */
export async function guardarTasaManual(
  valor: number,
  por: { uid: string; nombre: string },
): Promise<void> {
  await setDoc(
    doc(db, "configuracion", "tasa"),
    {
      valor,
      fuente: "manual",
      fechaActualizacion: serverTimestamp(),
      actualizadoPor: por,
    },
    { merge: true },
  );
}

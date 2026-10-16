#!/usr/bin/env node
/**
 * Semilla del administrador de Baterías La 19.
 *
 * Crea (o reutiliza) la cuenta en Firebase Authentication, su perfil en
 * Firestore (`usuarios/{uid}`, rol admin) y el contador `contadores/ventas`.
 *
 * Contra el proyecto real (requiere el secreto de servicio):
 *   node scripts/semilla-admin.mjs --email admin@tienda.com --nombre "Nombre Apellido" --password "Temp1234"
 *   La credencial se lee de `secrets/firebase-admin.json` o de GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Contra los emuladores (sin credenciales):
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     node scripts/semilla-admin.mjs --email admin@test.local --nombre "Admin" --password "Temp1234"
 */
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nombre: { type: "string" },
    password: { type: "string" },
  },
});

const email = values.email?.trim().toLowerCase();
const nombre = values.nombre?.trim();
const password = values.password;

if (!email || !nombre || !password) {
  console.error(
    "Faltan argumentos: --email, --nombre y --password son obligatorios.",
  );
  process.exit(1);
}

const enEmulador = Boolean(
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.FIRESTORE_EMULATOR_HOST,
);
const proyecto = process.env.FIREBASE_PROJECT_ID ?? "bateriasla19";

if (!getApps().length) {
  if (enEmulador) {
    initializeApp({ projectId: proyecto });
  } else {
    const rutaCredencial =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ??
      "secrets/firebase-admin.json";
    if (!existsSync(rutaCredencial)) {
      console.error(
        `No se encontró la credencial en ${rutaCredencial}. Descárgala o define GOOGLE_APPLICATION_CREDENTIALS.`,
      );
      process.exit(1);
    }
    const credencial = JSON.parse(readFileSync(rutaCredencial, "utf8"));
    initializeApp({ credential: cert(credencial) });
  }
}

const authAdmin = getAuth();
const dbAdmin = getFirestore();

let usuario;
try {
  usuario = await authAdmin.getUserByEmail(email);
  console.log(
    `· La cuenta ${email} ya existía en Authentication (uid ${usuario.uid}).`,
  );
} catch {
  usuario = await authAdmin.createUser({
    email,
    password,
    displayName: nombre,
    emailVerified: false,
  });
  console.log(`· Cuenta creada en Authentication (uid ${usuario.uid}).`);
}

await dbAdmin.collection("usuarios").doc(usuario.uid).set(
  {
    nombre,
    email,
    rol: "admin",
    activo: true,
    creadoEn: FieldValue.serverTimestamp(),
  },
  { merge: true },
);
console.log(
  `· Perfil actualizado en Firestore: usuarios/${usuario.uid} (rol admin, activo).`,
);

const refContador = dbAdmin.collection("contadores").doc("ventas");
const contador = await refContador.get();
if (!contador.exists) {
  await refContador.set({ valor: 0 });
  console.log("· Contador inicial creado: contadores/ventas { valor: 0 }.");
} else {
  console.log("· El contador contadores/ventas ya existía; no se modificó.");
}

console.log(
  enEmulador
    ? "\n✔ Semilla aplicada sobre los EMULADORES."
    : `\n✔ Semilla aplicada sobre el proyecto real ${proyecto}.`,
);
console.log(
  "   Siguiente paso: inicia sesión y cambia la contraseña temporal desde el módulo de Usuarios.",
);
process.exit(0);

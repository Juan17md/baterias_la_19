import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const UID_ADMIN = "admin-prueba";
const UID_USUARIO = "usuario-prueba";
const UID_INACTIVO = "usuario-inactivo";

let entorno: RulesTestEnvironment;

function datosVenta(uidVendedor: string) {
  return {
    numero: 1,
    fecha: serverTimestamp(),
    cliente: null,
    items: [],
    subtotal: 10,
    descuento: 0,
    total: 10,
    tasaBCV: 879.12,
    totalBs: 8791.2,
    metodoPago: "efectivo_usd",
    incluyeInstalacion: false,
    recibioBateriaUsada: false,
    vendedor: { uid: uidVendedor, nombre: "Vendedor" },
    notas: null,
    estado: "completada",
    anulacion: null,
  };
}

function datosTasa() {
  return {
    valor: 900.5,
    fuente: "dolarapi_oficial",
    fechaActualizacion: serverTimestamp(),
    actualizadoPor: null,
  };
}

async function sembrarBase() {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const fs = contexto.firestore();

    await setDoc(doc(fs, "usuarios", UID_ADMIN), {
      nombre: "Admin",
      email: "admin@test.local",
      rol: "admin",
      activo: true,
      debeCambiarContrasena: false,
      creadoEn: serverTimestamp(),
    });
    await setDoc(doc(fs, "usuarios", UID_USUARIO), {
      nombre: "Usuario",
      email: "usuario@test.local",
      rol: "usuario",
      activo: true,
      debeCambiarContrasena: true,
      creadoEn: serverTimestamp(),
    });
    await setDoc(doc(fs, "usuarios", UID_INACTIVO), {
      nombre: "Inactivo",
      email: "inactivo@test.local",
      rol: "usuario",
      activo: false,
      debeCambiarContrasena: true,
      creadoEn: serverTimestamp(),
    });
    await setDoc(doc(fs, "baterias", "bat-1"), {
      codigo: "BL19-0001",
      marca: "Willard",
      modelo: "W-500",
      voltaje: 12,
      amperaje: 60,
      precioCompra: 50,
      precioVenta: 80,
      stock: 5,
      stockMinimo: 2,
      stockBajo: false,
      garantiaMeses: 6,
      activo: true,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
    await setDoc(doc(fs, "configuracion", "tasa"), {
      valor: 879.12,
      fuente: "dolarapi_oficial",
      fechaActualizacion: serverTimestamp(),
      actualizadoPor: null,
    });
    await setDoc(doc(fs, "contadores", "ventas"), { valor: 0 });
    await setDoc(doc(fs, "ventas", "venta-1"), datosVenta(UID_USUARIO));
    await setDoc(doc(fs, "movimientos", "mov-manual"), {
      fecha: serverTimestamp(),
      tipo: "entrada",
      bateriaId: "bat-1",
      bateriaResumen: {
        codigo: "BL19-0001",
        marca: "Willard",
        modelo: "W-500",
      },
      cantidad: 2,
      stockAntes: 3,
      stockDespues: 5,
      motivo: "Compra a proveedor",
      ventaId: null,
      usuario: { uid: UID_USUARIO, nombre: "Usuario" },
    });
    await setDoc(doc(fs, "movimientos", "mov-venta"), {
      fecha: serverTimestamp(),
      tipo: "salida",
      bateriaId: "bat-1",
      bateriaResumen: {
        codigo: "BL19-0001",
        marca: "Willard",
        modelo: "W-500",
      },
      cantidad: -1,
      stockAntes: 6,
      stockDespues: 5,
      motivo: "Venta N.º 1",
      ventaId: "venta-1",
      usuario: { uid: UID_USUARIO, nombre: "Usuario" },
    });
    // Movimiento anterior a la Fase 5, sin el campo `ventaId`.
    await setDoc(doc(fs, "movimientos", "mov-antiguo"), {
      fecha: serverTimestamp(),
      tipo: "ajuste",
      bateriaId: "bat-1",
      bateriaResumen: {
        codigo: "BL19-0001",
        marca: "Willard",
        modelo: "W-500",
      },
      cantidad: -1,
      stockAntes: 6,
      stockDespues: 5,
      motivo: "Ajuste por conteo físico",
      usuario: { uid: UID_USUARIO, nombre: "Usuario" },
    });
  });
}

function comoAnonimo() {
  return entorno.unauthenticatedContext().firestore();
}

function comoAdmin() {
  return entorno.authenticatedContext(UID_ADMIN).firestore();
}

function comoUsuario() {
  return entorno.authenticatedContext(UID_USUARIO).firestore();
}

function comoInactivo() {
  return entorno.authenticatedContext(UID_INACTIVO).firestore();
}

beforeAll(async () => {
  const hostEmulador = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, puerto] = hostEmulador.split(":");

  entorno = await initializeTestEnvironment({
    projectId: "demo-bateriasla19",
    firestore: {
      host,
      port: Number(puerto),
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await entorno.cleanup();
});

beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrarBase();
});

describe("sin sesión", () => {
  it("no puede leer las baterías", async () => {
    await assertFails(getDoc(doc(comoAnonimo(), "baterias", "bat-1")));
  });

  it("no puede crear baterías", async () => {
    await assertFails(
      setDoc(doc(comoAnonimo(), "baterias", "bat-2"), { codigo: "X" }),
    );
  });

  it("no puede leer la tasa guardada", async () => {
    await assertFails(getDoc(doc(comoAnonimo(), "configuracion", "tasa")));
  });

  it("no puede registrar ventas", async () => {
    await assertFails(
      setDoc(doc(comoAnonimo(), "ventas", "venta-2"), datosVenta("x")),
    );
  });
});

describe("usuario activo", () => {
  it("puede leer las baterías", async () => {
    await assertSucceeds(getDoc(doc(comoUsuario(), "baterias", "bat-1")));
  });

  it("puede registrar un movimiento con su propio uid", async () => {
    await assertSucceeds(
      addDoc(collection(comoUsuario(), "movimientos"), {
        fecha: serverTimestamp(),
        tipo: "entrada",
        bateriaId: "bat-1",
        bateriaResumen: {
          codigo: "BL19-0001",
          marca: "Willard",
          modelo: "W-500",
        },
        cantidad: 2,
        stockAntes: 5,
        stockDespues: 7,
        motivo: "Compra a proveedor",
        ventaId: null,
        usuario: { uid: UID_USUARIO, nombre: "Usuario" },
      }),
    );
  });

  it("no puede registrar movimientos a nombre de otro usuario", async () => {
    await assertFails(
      addDoc(collection(comoUsuario(), "movimientos"), {
        fecha: serverTimestamp(),
        tipo: "entrada",
        bateriaId: "bat-1",
        bateriaResumen: {
          codigo: "BL19-0001",
          marca: "Willard",
          modelo: "W-500",
        },
        cantidad: 2,
        stockAntes: 5,
        stockDespues: 7,
        motivo: "Compra a proveedor",
        ventaId: null,
        usuario: { uid: UID_ADMIN, nombre: "Admin" },
      }),
    );
  });

  it("puede crear una venta a su nombre", async () => {
    await assertSucceeds(
      setDoc(
        doc(comoUsuario(), "ventas", "venta-nueva"),
        datosVenta(UID_USUARIO),
      ),
    );
  });

  it("no puede crear una venta a nombre de otro", async () => {
    await assertFails(
      setDoc(
        doc(comoUsuario(), "ventas", "venta-nueva"),
        datosVenta(UID_ADMIN),
      ),
    );
  });

  it("puede leer su propio perfil", async () => {
    await assertSucceeds(getDoc(doc(comoUsuario(), "usuarios", UID_USUARIO)));
  });

  it("no puede leer el perfil de otro usuario", async () => {
    await assertFails(getDoc(doc(comoUsuario(), "usuarios", UID_ADMIN)));
  });

  it("no puede listar la colección de usuarios", async () => {
    await assertFails(
      getDocs(query(collection(comoUsuario(), "usuarios"), orderBy("nombre"))),
    );
  });

  it("puede marcar como completado el cambio obligatorio de su contraseña", async () => {
    await assertSucceeds(
      updateDoc(doc(comoUsuario(), "usuarios", UID_USUARIO), {
        debeCambiarContrasena: false,
      }),
    );
  });

  it("no puede modificar otros campos de su propio perfil", async () => {
    await assertFails(
      updateDoc(doc(comoUsuario(), "usuarios", UID_USUARIO), {
        nombre: "Nombre alterado",
      }),
    );
  });

  it("no puede volver a activar la exigencia de cambio de contraseña", async () => {
    await assertFails(
      updateDoc(doc(comoUsuario(), "usuarios", UID_USUARIO), {
        debeCambiarContrasena: true,
      }),
    );
  });

  it("no puede cambiar la marca de contraseña de otro usuario", async () => {
    await assertFails(
      updateDoc(doc(comoUsuario(), "usuarios", UID_ADMIN), {
        debeCambiarContrasena: false,
      }),
    );
  });

  it("no puede crear usuarios", async () => {
    await assertFails(
      setDoc(doc(comoUsuario(), "usuarios", "nuevo-uid"), {
        nombre: "Intruso",
        email: "intruso@test.local",
        rol: "admin",
        activo: true,
        creadoEn: serverTimestamp(),
      }),
    );
  });

  it("puede guardar la tasa automática de la API", async () => {
    await assertSucceeds(
      setDoc(doc(comoUsuario(), "configuracion", "tasa"), datosTasa(), {
        merge: true,
      }),
    );
  });

  it("no puede guardar una tasa inválida (cero o negativa)", async () => {
    await assertFails(
      setDoc(
        doc(comoUsuario(), "configuracion", "tasa"),
        { ...datosTasa(), valor: 0 },
        { merge: true },
      ),
    );
  });

  it("no puede marcar la tasa como corrección manual", async () => {
    await assertFails(
      setDoc(
        doc(comoUsuario(), "configuracion", "tasa"),
        { ...datosTasa(), fuente: "manual" },
        { merge: true },
      ),
    );
  });

  it("puede incrementar el contador de ventas en 1", async () => {
    await assertSucceeds(
      updateDoc(doc(comoUsuario(), "contadores", "ventas"), { valor: 1 }),
    );
  });

  it("no puede incrementar el contador en más de 1", async () => {
    await assertFails(
      updateDoc(doc(comoUsuario(), "contadores", "ventas"), { valor: 2 }),
    );
  });

  it("no puede crear contadores", async () => {
    await assertFails(
      setDoc(doc(comoUsuario(), "contadores", "movimientos"), { valor: 0 }),
    );
  });

  it("no puede borrar contadores", async () => {
    await assertFails(deleteDoc(doc(comoUsuario(), "contadores", "ventas")));
  });
});

describe("usuario inactivo", () => {
  it("no puede leer las baterías", async () => {
    await assertFails(getDoc(doc(comoInactivo(), "baterias", "bat-1")));
  });

  it("no puede registrar ventas", async () => {
    await assertFails(
      setDoc(
        doc(comoInactivo(), "ventas", "venta-3"),
        datosVenta(UID_INACTIVO),
      ),
    );
  });

  it("puede leer su propio perfil (para conocer su estado)", async () => {
    await assertSucceeds(getDoc(doc(comoInactivo(), "usuarios", UID_INACTIVO)));
  });

  it("no puede marcar el cambio de contraseña como completado", async () => {
    await assertFails(
      updateDoc(doc(comoInactivo(), "usuarios", UID_INACTIVO), {
        debeCambiarContrasena: false,
      }),
    );
  });
});

describe("anulación de ventas", () => {
  it("cualquier usuario activo puede anular con motivo obligatorio", async () => {
    await assertSucceeds(
      updateDoc(doc(comoUsuario(), "ventas", "venta-1"), {
        estado: "anulada",
        anulacion: {
          uid: UID_USUARIO,
          nombre: "Usuario",
          fecha: new Date(),
          motivo: "Cliente devolvió la batería",
        },
      }),
    );
  });

  it("no puede anular sin motivo", async () => {
    await assertFails(
      updateDoc(doc(comoUsuario(), "ventas", "venta-1"), {
        estado: "anulada",
        anulacion: {
          uid: UID_USUARIO,
          nombre: "Usuario",
          fecha: new Date(),
          motivo: "",
        },
      }),
    );
  });

  it("no puede modificar el total al anular", async () => {
    await assertFails(
      updateDoc(doc(comoUsuario(), "ventas", "venta-1"), {
        estado: "anulada",
        total: 9999,
        anulacion: {
          uid: UID_USUARIO,
          nombre: "Usuario",
          fecha: new Date(),
          motivo: "Intento de alterar el total",
        },
      }),
    );
  });

  it("no puede dejar la venta como completada al actualizar", async () => {
    await assertFails(
      updateDoc(doc(comoUsuario(), "ventas", "venta-1"), {
        anulacion: {
          uid: UID_USUARIO,
          nombre: "Usuario",
          fecha: new Date(),
          motivo: "Sin cambiar el estado",
        },
      }),
    );
  });

  it("un usuario inactivo no puede anular ventas", async () => {
    await assertFails(
      updateDoc(doc(comoInactivo(), "ventas", "venta-1"), {
        estado: "anulada",
        anulacion: {
          uid: UID_INACTIVO,
          nombre: "Inactivo",
          fecha: new Date(),
          motivo: "No debería poder",
        },
      }),
    );
  });
});

describe("eliminación de movimientos", () => {
  it("el admin puede eliminar un movimiento manual", async () => {
    await assertSucceeds(
      deleteDoc(doc(comoAdmin(), "movimientos", "mov-manual")),
    );
  });

  it("el admin puede eliminar un movimiento antiguo sin campo ventaId", async () => {
    await assertSucceeds(
      deleteDoc(doc(comoAdmin(), "movimientos", "mov-antiguo")),
    );
  });

  it("el admin puede eliminar un movimiento de venta a nivel de reglas", async () => {
    await assertSucceeds(
      deleteDoc(doc(comoAdmin(), "movimientos", "mov-venta")),
    );
  });

  it("un usuario activo no puede eliminar movimientos", async () => {
    await assertFails(
      deleteDoc(doc(comoUsuario(), "movimientos", "mov-manual")),
    );
  });

  it("un usuario inactivo no puede eliminar movimientos", async () => {
    await assertFails(
      deleteDoc(doc(comoInactivo(), "movimientos", "mov-manual")),
    );
  });

  it("nadie puede modificar un movimiento", async () => {
    await assertFails(
      updateDoc(doc(comoAdmin(), "movimientos", "mov-manual"), {
        cantidad: 99,
      }),
    );
  });
});

describe("eliminación de ventas", () => {
  it("el admin puede eliminar una venta", async () => {
    await assertSucceeds(deleteDoc(doc(comoAdmin(), "ventas", "venta-1")));
  });

  it("un usuario activo no puede eliminar ventas", async () => {
    await assertFails(deleteDoc(doc(comoUsuario(), "ventas", "venta-1")));
  });

  it("un usuario inactivo no puede eliminar ventas", async () => {
    await assertFails(deleteDoc(doc(comoInactivo(), "ventas", "venta-1")));
  });
});

describe("admin", () => {
  it("puede listar los usuarios", async () => {
    await assertSucceeds(
      getDocs(query(collection(comoAdmin(), "usuarios"), orderBy("nombre"))),
    );
  });

  it("puede crear perfiles de usuario", async () => {
    await assertSucceeds(
      setDoc(doc(comoAdmin(), "usuarios", "nuevo-uid"), {
        nombre: "Nuevo",
        email: "nuevo@test.local",
        rol: "usuario",
        activo: true,
        debeCambiarContrasena: true,
        creadoEn: serverTimestamp(),
      }),
    );
  });

  it("puede exigir el cambio de contraseña de un usuario", async () => {
    await assertSucceeds(
      updateDoc(doc(comoAdmin(), "usuarios", UID_ADMIN), {
        debeCambiarContrasena: true,
      }),
    );
  });

  it("puede cambiar el rol de un usuario", async () => {
    await assertSucceeds(
      updateDoc(doc(comoAdmin(), "usuarios", UID_USUARIO), { rol: "admin" }),
    );
  });

  it("puede corregir la tasa manualmente", async () => {
    await assertSucceeds(
      setDoc(
        doc(comoAdmin(), "configuracion", "tasa"),
        {
          valor: 890,
          fuente: "manual",
          fechaActualizacion: serverTimestamp(),
          actualizadoPor: { uid: UID_ADMIN, nombre: "Admin" },
        },
        { merge: true },
      ),
    );
  });

  it("no puede borrar usuarios", async () => {
    await assertFails(deleteDoc(doc(comoAdmin(), "usuarios", UID_USUARIO)));
  });
});

describe("colecciones desconocidas", () => {
  it("deniega la lectura y escritura de cualquier otra colección", async () => {
    await assertFails(getDoc(doc(comoAdmin(), "otra", "doc-1")));
    await assertFails(setDoc(doc(comoAdmin(), "otra", "doc-1"), { dato: 1 }));
  });
});

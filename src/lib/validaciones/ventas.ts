import { z } from "zod";
import {
  esquemaPlanFinanciamiento,
  validarReglasCashea,
} from "@/lib/validaciones/financiamientos";
import { METODOS_PAGO } from "@/lib/validaciones/metodos-pago";

export { METODOS_PAGO };

/** Convierte texto de formularios a número (acepta coma decimal). */
function aNumero(valor: unknown): unknown {
  if (typeof valor === "string") {
    const limpio = valor.trim().replace(",", ".");
    return limpio === "" ? Number.NaN : Number(limpio);
  }
  return valor;
}

/** Modalidades de pago de una venta (se espejan en `ModalidadPago`). */
export const MODALIDADES_PAGO = ["contado", "cashea", "tienda"] as const;

/** Acepta un descuento vacío como 0 (campo opcional del formulario). */
const descuentoOpcional = z.preprocess(
  (valor) =>
    typeof valor === "string" && valor.trim() === "" ? 0 : aNumero(valor),
  z
    .number({ error: "Indica el descuento en $" })
    .min(0, "El descuento no puede ser negativo"),
);

/** Ítem del formulario de venta: la cantidad se valida contra el stock en el servicio. */
export const esquemaItemVenta = z.object({
  bateriaId: z.string().trim().min(1, "Selecciona una batería válida"),
  cantidad: z.preprocess(
    aNumero,
    z
      .int({ error: "Indica la cantidad vendida" })
      .positive("La cantidad debe ser mayor a cero"),
  ),
});

/** Datos que captura el modal de venta (los precios los resuelve el servicio). */
export const esquemaVenta = z
  .object({
    items: z
      .array(esquemaItemVenta)
      .min(1, "Agrega al menos una batería a la venta"),
    descuento: descuentoOpcional,
    clienteNombre: z
      .string()
      .trim()
      .max(80, "Máximo 80 caracteres")
      .optional()
      .default(""),
    clienteTelefono: z
      .string()
      .trim()
      .max(30, "Máximo 30 caracteres")
      .optional()
      .default(""),
    metodoPago: z.enum(METODOS_PAGO, { error: "Selecciona un método de pago" }),
    /** En ventas financiadas, `metodoPago` es el método de la inicial. */
    modalidadPago: z
      .enum(MODALIDADES_PAGO, { error: "Selecciona la modalidad de pago" })
      .optional()
      .default("contado"),
    financiamiento: esquemaPlanFinanciamiento.optional(),
    incluyeInstalacion: z.boolean(),
    recibioBateriaUsada: z.boolean(),
    notas: z
      .string()
      .trim()
      .max(200, "Máximo 200 caracteres")
      .optional()
      .default(""),
  })
  .superRefine((datos, contexto) => {
    if (datos.modalidadPago === "contado") {
      if (datos.financiamiento) {
        contexto.addIssue({
          code: "custom",
          path: ["financiamiento"],
          message: "Una venta de contado no lleva plan de financiamiento",
        });
      }
      if (datos.clienteTelefono && !datos.clienteNombre) {
        contexto.addIssue({
          code: "custom",
          path: ["clienteNombre"],
          message: "Indica el nombre del cliente",
        });
      }
      return;
    }

    if (!datos.financiamiento) {
      contexto.addIssue({
        code: "custom",
        path: ["financiamiento"],
        message: "Completa los datos del financiamiento",
      });
      return;
    }

    if (!datos.clienteNombre) {
      contexto.addIssue({
        code: "custom",
        path: ["clienteNombre"],
        message: "Indica el nombre del cliente para financiar",
      });
    }
    if (!datos.clienteTelefono) {
      contexto.addIssue({
        code: "custom",
        path: ["clienteTelefono"],
        message: "Indica el teléfono del cliente para financiar",
      });
    }

    if (datos.modalidadPago === "cashea") {
      for (const regla of validarReglasCashea(datos.financiamiento)) {
        contexto.addIssue({
          code: "custom",
          path: ["financiamiento", regla.campo],
          message: regla.mensaje,
        });
      }
    }

    if (
      datos.modalidadPago === "tienda" &&
      datos.financiamiento.recargo !== 0
    ) {
      contexto.addIssue({
        code: "custom",
        path: ["financiamiento", "recargo"],
        message: "Las ventas «Por la tienda» no aplican recargos",
      });
    }
  });

export type DatosVenta = z.infer<typeof esquemaVenta>;

/** Anulación de venta: el motivo es obligatorio (se audita en la bitácora). */
export const esquemaAnulacionVenta = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, "Escribe el motivo de la anulación")
    .max(120, "Máximo 120 caracteres"),
});

export type DatosAnulacionVenta = z.infer<typeof esquemaAnulacionVenta>;

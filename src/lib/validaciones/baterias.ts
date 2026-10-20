import { z } from "zod";

/** Convierte texto de formularios a número (acepta coma decimal). */
function aNumero(valor: unknown): unknown {
  if (typeof valor === "string") {
    const limpio = valor.trim().replace(",", ".");
    return limpio === "" ? Number.NaN : Number(limpio);
  }
  return valor;
}

const numeroPositivo = (mensaje: string) =>
  z.preprocess(aNumero, z.number({ error: mensaje }).positive(mensaje));

const enteroNoNegativo = (mensaje: string) =>
  z.preprocess(aNumero, z.int({ error: mensaje }).min(0, mensaje));

const textoOpcional = (maximo: number, mensaje: string) =>
  z.preprocess(
    (valor) =>
      typeof valor === "string" && valor.trim() === "" ? undefined : valor,
    z.string().trim().max(maximo, mensaje).optional(),
  );

/** Datos comunes de una batería (alta y edición). */
export const esquemaDatosBateria = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(2, "El código es obligatorio (mínimo 2 caracteres)")
      .max(30, "Máximo 30 caracteres")
      .transform((valor) => valor.toUpperCase()),
    marca: z
      .string()
      .trim()
      .min(1, "La marca es obligatoria")
      .max(60, "Máximo 60 caracteres"),
    modelo: z
      .string()
      .trim()
      .min(1, "El modelo es obligatorio")
      .max(80, "Máximo 80 caracteres"),
    voltaje: numeroPositivo("Indica el voltaje en voltios (ej. 12)"),
    amperaje: numeroPositivo("Indica el amperaje en Ah (ej. 600)"),
    precioCompra: z.preprocess(
      aNumero,
      z
        .number({ error: "Indica el precio de compra en $" })
        .min(0, "El precio de compra no puede ser negativo"),
    ),
    precioVenta: numeroPositivo("Indica el precio de venta en $"),
    stockMinimo: enteroNoNegativo("Indica el stock mínimo (número entero)"),
    proveedor: textoOpcional(80, "Máximo 80 caracteres"),
    garantiaMeses: enteroNoNegativo(
      "Indica la garantía en meses (0 si no aplica)",
    ),
  })
  .refine(
    // Comparar solo si ambos precios son números válidos; si alguno falla,
    // el mensaje específico del campo ya lo indica.
    (datos) =>
      Number.isFinite(datos.precioCompra) &&
      Number.isFinite(datos.precioVenta) &&
      datos.precioVenta > datos.precioCompra,
    {
      error: "El precio de venta debe ser mayor al precio de compra",
      path: ["precioVenta"],
    },
  );

/** Alta de batería: incluye el stock inicial (se registra como entrada). */
export const esquemaNuevaBateria = esquemaDatosBateria.extend({
  stockInicial: enteroNoNegativo(
    "Indica el stock inicial (0 si aún no hay unidades)",
  ),
});

export type DatosBateria = z.infer<typeof esquemaDatosBateria>;
export type DatosNuevaBateria = z.infer<typeof esquemaNuevaBateria>;

/** Entrada de mercancía (compra a proveedor). */
export const esquemaEntrada = z.object({
  cantidad: z.preprocess(
    aNumero,
    z
      .int({ error: "Indica la cantidad que entra" })
      .positive("La cantidad debe ser mayor a cero"),
  ),
  motivo: z
    .string()
    .trim()
    .min(3, "Escribe el motivo (proveedor o número de factura)")
    .max(120, "Máximo 120 caracteres"),
});

export type DatosEntrada = z.infer<typeof esquemaEntrada>;

/** Ajuste de stock al conteo físico (motivo obligatorio). */
export const esquemaAjuste = z.object({
  nuevoStock: enteroNoNegativo("Indica el stock físico contado"),
  motivo: z
    .string()
    .trim()
    .min(3, "Escribe el motivo del ajuste")
    .max(120, "Máximo 120 caracteres"),
});

export type DatosAjuste = z.infer<typeof esquemaAjuste>;

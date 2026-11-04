import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  calcularEstadoFinanciamiento,
  calcularPlanFinanciamiento,
  calcularProximaCuota,
  calcularSaldoPendiente,
  calcularSiguienteLunes,
  derivarEstadoCuota,
  redondear2,
} from "@/lib/dominio/financiamientos";
import type { CuotaFinanciamiento, LiquidacionCashea } from "@/types";

function fecha(anio: number, mes: number, dia: number, hora = 0): Date {
  return new Date(anio, mes - 1, dia, hora, 0, 0, 0);
}

function cuota(
  numero: number,
  monto: number,
  vencimiento: Date,
  estado: CuotaFinanciamiento["estado"] = "pendiente",
): CuotaFinanciamiento {
  return {
    numero,
    monto,
    fechaVencimiento: Timestamp.fromDate(vencimiento),
    estado,
    pagoId: estado === "pagada" ? `pago-${numero}` : null,
  };
}

function liquidacion(
  fechaEsperada: Date,
  estado: LiquidacionCashea["estado"] = "pendiente",
): LiquidacionCashea {
  return {
    montoEsperado: 80,
    fechaEsperada: Timestamp.fromDate(fechaEsperada),
    estado,
    montoRecibido: estado === "recibida" ? 80 : null,
    fechaRecibida:
      estado === "recibida" ? Timestamp.fromDate(fechaEsperada) : null,
    comision: 0,
    referencia: null,
  };
}

describe("redondear2", () => {
  it("redondea a dos decimales", () => {
    expect(redondear2(10.005)).toBe(10.01);
    expect(redondear2(10.004)).toBe(10);
    expect(redondear2(33.333333)).toBe(33.33);
  });
});

describe("calcularSiguienteLunes", () => {
  it("devuelve el lunes siguiente a las 00:00", () => {
    const resultado = calcularSiguienteLunes(fecha(2026, 1, 2, 15));
    expect(resultado).toEqual(fecha(2026, 1, 5));
  });

  it("si la fecha es lunes, devuelve el lunes de la semana siguiente", () => {
    const resultado = calcularSiguienteLunes(fecha(2026, 1, 5, 9));
    expect(resultado).toEqual(fecha(2026, 1, 12));
  });

  it("si la fecha es domingo, devuelve el lunes siguiente", () => {
    const resultado = calcularSiguienteLunes(fecha(2026, 1, 4, 23));
    expect(resultado).toEqual(fecha(2026, 1, 5));
  });
});

describe("calcularPlanFinanciamiento", () => {
  it("calcula un plan de tienda con cuotas exactas", () => {
    const plan = calcularPlanFinanciamiento({
      modalidad: "tienda",
      totalVenta: 100,
      inicial: 20,
      numeroCuotas: 2,
      diasEntreCuotas: 15,
      fechaVenta: fecha(2026, 1, 1),
    });

    expect(plan.montoFinanciado).toBe(80);
    expect(plan.montoCuota).toBe(40);
    expect(plan.cuotas).toHaveLength(2);
    expect(plan.cuotas.map((item) => item.monto)).toEqual([40, 40]);
    expect(plan.cuotas[0]?.fechaVencimiento?.toDate()).toEqual(
      fecha(2026, 1, 16),
    );
    expect(plan.cuotas[1]?.fechaVencimiento?.toDate()).toEqual(
      fecha(2026, 1, 31),
    );
    expect(plan.cuotas.every((item) => item.estado === "pendiente")).toBe(true);
    expect(plan.liquidacion).toBeNull();
  });

  it("la última cuota absorbe el redondeo", () => {
    const plan = calcularPlanFinanciamiento({
      modalidad: "tienda",
      totalVenta: 100,
      inicial: 0,
      numeroCuotas: 3,
      diasEntreCuotas: 30,
      fechaVenta: fecha(2026, 1, 1),
    });

    expect(plan.cuotas.map((item) => item.monto)).toEqual([
      33.33, 33.33, 33.34,
    ]);
    expect(
      redondear2(plan.cuotas.reduce((suma, item) => suma + item.monto, 0)),
    ).toBe(100);
  });

  it("rechaza recargos en las ventas de la tienda", () => {
    expect(() =>
      calcularPlanFinanciamiento({
        modalidad: "tienda",
        totalVenta: 100,
        inicial: 20,
        recargo: 10,
        numeroCuotas: 3,
        diasEntreCuotas: 30,
        fechaVenta: fecha(2026, 1, 1),
      }),
    ).toThrow(/recargos/i);
  });

  it("calcula Cashea con 14 días y liquidación al siguiente lunes", () => {
    const plan = calcularPlanFinanciamiento({
      modalidad: "cashea",
      totalVenta: 100,
      inicial: 0,
      numeroCuotas: 6,
      diasEntreCuotas: 14,
      fechaVenta: fecha(2026, 1, 2, 18),
    });

    expect(plan.montoFinanciado).toBe(100);
    expect(plan.cuotas).toHaveLength(6);
    expect(plan.cuotas.map((item) => item.monto)).toEqual([
      16.66, 16.66, 16.66, 16.66, 16.66, 16.7,
    ]);
    expect(plan.cuotas.every((item) => item.estado === "informativa")).toBe(
      true,
    );
    expect(plan.cuotas[0]?.fechaVencimiento?.toDate()).toEqual(
      fecha(2026, 1, 16),
    );
    expect(plan.liquidacion?.montoEsperado).toBe(100);
    expect(plan.liquidacion?.fechaEsperada?.toDate()).toEqual(
      fecha(2026, 1, 5),
    );
    expect(plan.liquidacion?.estado).toBe("pendiente");
  });

  it("rechaza una inicial que cubre todo el total", () => {
    expect(() =>
      calcularPlanFinanciamiento({
        modalidad: "tienda",
        totalVenta: 100,
        inicial: 100,
        numeroCuotas: 2,
        diasEntreCuotas: 15,
        fechaVenta: fecha(2026, 1, 1),
      }),
    ).toThrow(/inicial/i);
  });

  it("rechaza cantidades de cuotas no permitidas en Cashea", () => {
    expect(() =>
      calcularPlanFinanciamiento({
        modalidad: "cashea",
        totalVenta: 100,
        inicial: 0,
        numeroCuotas: 4,
        diasEntreCuotas: 14,
        fechaVenta: fecha(2026, 1, 1),
      }),
    ).toThrow(/Cashea/i);
  });

  it("rechaza un plazo distinto a 14 días en Cashea", () => {
    expect(() =>
      calcularPlanFinanciamiento({
        modalidad: "cashea",
        totalVenta: 100,
        inicial: 0,
        numeroCuotas: 3,
        diasEntreCuotas: 30,
        fechaVenta: fecha(2026, 1, 1),
      }),
    ).toThrow(/14 días/i);
  });

  it("rechaza recargos en Cashea", () => {
    expect(() =>
      calcularPlanFinanciamiento({
        modalidad: "cashea",
        totalVenta: 100,
        inicial: 0,
        recargo: 5,
        numeroCuotas: 3,
        diasEntreCuotas: 14,
        fechaVenta: fecha(2026, 1, 1),
      }),
    ).toThrow(/recargo/i);
  });

  it("limita las cuotas de la tienda a 60", () => {
    expect(() =>
      calcularPlanFinanciamiento({
        modalidad: "tienda",
        totalVenta: 100,
        inicial: 0,
        numeroCuotas: 61,
        diasEntreCuotas: 15,
        fechaVenta: fecha(2026, 1, 1),
      }),
    ).toThrow(/máximo/i);
  });
});

describe("calcularEstadoFinanciamiento", () => {
  const hoy = fecha(2026, 2, 1);

  it("devuelve pagado cuando se guardó como pagado", () => {
    expect(
      calcularEstadoFinanciamiento(
        {
          modalidad: "tienda",
          estado: "pagado",
          cuotas: [],
          liquidacion: null,
        },
        hoy,
      ),
    ).toBe("pagado");
  });

  it("devuelve liquidado cuando se guardó como liquidado", () => {
    expect(
      calcularEstadoFinanciamiento(
        {
          modalidad: "cashea",
          estado: "liquidado",
          cuotas: [],
          liquidacion: null,
        },
        hoy,
      ),
    ).toBe("liquidado");
  });

  it("marca vencido si una cuota de tienda está atrasada", () => {
    expect(
      calcularEstadoFinanciamiento(
        {
          modalidad: "tienda",
          estado: "activo",
          cuotas: [cuota(1, 40, fecha(2026, 1, 15))],
          liquidacion: null,
        },
        hoy,
      ),
    ).toBe("vencido");
  });

  it("mantiene activo si la cuota aún no vence", () => {
    expect(
      calcularEstadoFinanciamiento(
        {
          modalidad: "tienda",
          estado: "activo",
          cuotas: [cuota(1, 40, fecha(2026, 2, 15))],
          liquidacion: null,
        },
        hoy,
      ),
    ).toBe("activo");
  });

  it("marca vencido si la liquidación de Cashea no llegó", () => {
    expect(
      calcularEstadoFinanciamiento(
        {
          modalidad: "cashea",
          estado: "activo",
          cuotas: [],
          liquidacion: liquidacion(fecha(2026, 1, 26)),
        },
        hoy,
      ),
    ).toBe("vencido");
  });

  it("marca liquidado si Cashea ya transfirió el saldo", () => {
    expect(
      calcularEstadoFinanciamiento(
        {
          modalidad: "cashea",
          estado: "activo",
          cuotas: [],
          liquidacion: liquidacion(fecha(2026, 1, 26), "recibida"),
        },
        hoy,
      ),
    ).toBe("liquidado");
  });
});

describe("derivarEstadoCuota", () => {
  const hoy = fecha(2026, 2, 1);

  it("respeta las cuotas pagadas e informativas", () => {
    expect(
      derivarEstadoCuota(cuota(1, 40, fecha(2026, 1, 1), "pagada"), hoy),
    ).toBe("pagada");
    expect(
      derivarEstadoCuota(cuota(1, 40, fecha(2026, 1, 1), "informativa"), hoy),
    ).toBe("informativa");
  });

  it("marca vencida una cuota pendiente atrasada", () => {
    expect(derivarEstadoCuota(cuota(1, 40, fecha(2026, 1, 15)), hoy)).toBe(
      "vencida",
    );
  });

  it("mantiene pendiente una cuota futura", () => {
    expect(derivarEstadoCuota(cuota(1, 40, fecha(2026, 3, 1)), hoy)).toBe(
      "pendiente",
    );
  });
});

describe("calcularSaldoPendiente", () => {
  it("suma solo las cuotas no pagadas de la tienda", () => {
    const saldo = calcularSaldoPendiente({
      modalidad: "tienda",
      cuotas: [
        cuota(1, 40, fecha(2026, 1, 15), "pagada"),
        cuota(2, 30, fecha(2026, 2, 15)),
        cuota(3, 30, fecha(2026, 3, 15)),
      ],
      liquidacion: null,
    });
    expect(saldo).toBe(60);
  });

  it("devuelve el monto por liquidar de Cashea", () => {
    expect(
      calcularSaldoPendiente({
        modalidad: "cashea",
        cuotas: [],
        liquidacion: liquidacion(fecha(2026, 1, 26)),
      }),
    ).toBe(80);
  });

  it("devuelve cero cuando Cashea ya liquidó", () => {
    expect(
      calcularSaldoPendiente({
        modalidad: "cashea",
        cuotas: [],
        liquidacion: liquidacion(fecha(2026, 1, 26), "recibida"),
      }),
    ).toBe(0);
  });
});

describe("calcularProximaCuota", () => {
  it("ignora cuotas pagadas e informativas", () => {
    const proxima = calcularProximaCuota([
      cuota(1, 40, fecha(2026, 1, 15), "pagada"),
      cuota(2, 30, fecha(2026, 2, 15)),
      cuota(3, 30, fecha(2026, 3, 15)),
    ]);
    expect(proxima?.numero).toBe(2);
  });

  it("devuelve null si no quedan cuotas por cobrar", () => {
    expect(
      calcularProximaCuota([
        cuota(1, 40, fecha(2026, 1, 15), "pagada"),
        cuota(2, 40, fecha(2026, 2, 15), "informativa"),
      ]),
    ).toBeNull();
  });
});

// Puerto temporal de DISCOUNT_PROVIDERS (common/treasury_core.py, Pagos_Proveedores).
// Iteracion 3 del Plan Maestro reemplaza esto por providers.discount_rule editable
// desde la UI con versionado (valid_from/valid_to). Hasta entonces, constante fija
// igual a la que ya usa produccion en Streamlit.
export const DISCOUNT_PROVIDERS: Record<string, { days: number; rate: number }[]> = {
  "ABRACOL S.A.S": [{ days: 8, rate: 0.04 }],
  "ASSA ABLOY COLOMBIA S.A.S": [{ days: 8, rate: 0.03 }],
  "DELTA GLOBAL S.A.S": [{ days: 10, rate: 0.03 }],
  "INDUMA S.C.A": [
    { days: 10, rate: 0.025 },
    { days: 30, rate: 0.01 },
  ],
  "INDUSTRIAS GOYAINCOL LTDA": [{ days: 30, rate: 0.05 }],
  "INDUSTRIAS GOYAINCOL SAS": [{ days: 30, rate: 0.05 }],
  "ARTECOLA COLOMBIA S.A.S": [{ days: 10, rate: 0.025 }],
  "PINTUCO COLOMBIA S.A.S": [
    { days: 15, rate: 0.03 },
    { days: 30, rate: 0.02 },
  ],
  "SAINT - GOBAIN COLOMBIA S.A.S.": [
    { days: 10, rate: 0.025 },
    { days: 20, rate: 0.015 },
    { days: 30, rate: 0.007 },
  ],
  "RODILLOS MASTDER S.A.S": [{ days: 10, rate: 0.05 }],
  "SEGUREX LATAM S.A.S": [{ days: 8, rate: 0.03 }],
};

function normalizeProviderKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export const DISCOUNT_RULES_NORMALIZED: Record<string, { days: number; rate: number }[]> =
  Object.fromEntries(
    Object.entries(DISCOUNT_PROVIDERS).map(([provider, rules]) => [normalizeProviderKey(provider), rules])
  );

export interface PendingInvoiceForDiscount {
  invoice_key?: string;
  nombre_proveedor_erp: string;
  fecha_emision_erp: string | null;
  valor_total_erp: number;
}

export interface CapturableDiscount {
  invoice_key?: string;
  nombre_proveedor_erp: string;
  rate: number;
  deadline: string;
  valorDescuento: number;
}

// Misma logica que apply_discount_rules en treasury_core.py: entre las reglas de
// descuento cuya fecha limite (emision + dias) no ha pasado, se toma la de mayor
// tasa disponible (no la mas proxima a vencer).
export function calculateCapturableDiscounts(
  pending: PendingInvoiceForDiscount[],
  today: Date = new Date()
): CapturableDiscount[] {
  const results: CapturableDiscount[] = [];

  for (const row of pending) {
    if (!row.fecha_emision_erp || row.valor_total_erp <= 0) continue;
    const rules = DISCOUNT_RULES_NORMALIZED[normalizeProviderKey(row.nombre_proveedor_erp)];
    if (!rules) continue;

    const emision = new Date(row.fecha_emision_erp);
    const validRules = rules
      .map((rule) => {
        const deadline = new Date(emision);
        deadline.setDate(deadline.getDate() + rule.days);
        return { rate: rule.rate, deadline };
      })
      .filter((rule) => rule.deadline >= today);

    if (validRules.length === 0) continue;

    validRules.sort((a, b) => b.rate - a.rate || a.deadline.getTime() - b.deadline.getTime());
    const best = validRules[0];

    results.push({
      invoice_key: row.invoice_key,
      nombre_proveedor_erp: row.nombre_proveedor_erp,
      rate: best.rate,
      deadline: best.deadline.toISOString().slice(0, 10),
      valorDescuento: row.valor_total_erp * best.rate,
    });
  }

  return results;
}

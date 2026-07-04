import "server-only";
import { postgrestFetch } from "@/lib/postgrest";
import type { ProviderInvoiceCalc } from "@/lib/batch-data";

export interface MesaInvoiceRow extends ProviderInvoiceCalc {
  proveedor_id: number;
  nombre_proveedor: string;
  categoria_proveedor: string;
}

interface ActiveInvoiceIdentity {
  invoice_key: string;
  proveedor_id: number;
  nombre_proveedor: string;
  categoria_proveedor: string;
}

export async function getMesaInvoices(fechaPago: string): Promise<MesaInvoiceRow[]> {
  const [identityRes, calcRes] = await Promise.all([
    postgrestFetch(
      "/v_active_invoices?select=invoice_key,proveedor_id,nombre_proveedor,categoria_proveedor",
      {},
      "treasury"
    ),
    postgrestFetch(
      "/rpc/get_provider_invoices_with_calc",
      { method: "POST", body: JSON.stringify({ p_provider_id: null, p_fecha_pago: fechaPago, p_invoice_keys: null }) },
      "treasury"
    ),
  ]);
  if (!identityRes.ok) throw new Error(`PostgREST /v_active_invoices -> HTTP ${identityRes.status}: ${await identityRes.text()}`);
  if (!calcRes.ok) throw new Error(`PostgREST rpc/get_provider_invoices_with_calc -> HTTP ${calcRes.status}: ${await calcRes.text()}`);

  const identities = (await identityRes.json()) as ActiveInvoiceIdentity[];
  const calcRows = (await calcRes.json()) as ProviderInvoiceCalc[];
  const identityByKey = new Map(identities.map((i) => [i.invoice_key, i]));

  const rows: MesaInvoiceRow[] = [];
  for (const c of calcRows) {
    const identity = identityByKey.get(c.invoice_key);
    if (!identity) continue;
    rows.push({ ...c, proveedor_id: identity.proveedor_id, nombre_proveedor: identity.nombre_proveedor, categoria_proveedor: identity.categoria_proveedor });
  }
  return rows;
}

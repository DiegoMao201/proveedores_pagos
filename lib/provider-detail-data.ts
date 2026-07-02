import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface ProviderRow {
  id: number;
  nombre: string;
  nombre_normalizado: string;
  nif: string | null;
  plazo_pago_dias: number | null;
  email_pago: string | null;
  activo: boolean;
}

export interface DiscountRuleRow {
  dias_max: number;
  tasa_descuento: number;
}

async function fetchProviders(path: string): Promise<ProviderRow[]> {
  const res = await postgrestFetch(path, {}, "providers");
  if (!res.ok) throw new Error(`PostgREST ${path} -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function listProviders(): Promise<ProviderRow[]> {
  return fetchProviders("/provider?select=id,nombre,nombre_normalizado,nif,plazo_pago_dias,email_pago,activo&order=nombre.asc");
}

export async function getProviderById(id: number): Promise<ProviderRow | null> {
  const rows = await fetchProviders(`/provider?id=eq.${id}&select=id,nombre,nombre_normalizado,nif,plazo_pago_dias,email_pago,activo`);
  return rows[0] ?? null;
}

export async function getDiscountRules(providerId: number): Promise<DiscountRuleRow[]> {
  const res = await postgrestFetch(
    `/discount_rule?provider_id=eq.${providerId}&valid_to=is.null&select=dias_max,tasa_descuento&order=dias_max.asc`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /discount_rule -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export function discountSummaryText(rules: DiscountRuleRow[]): string | null {
  if (rules.length === 0) return null;
  return rules.map((r) => `${(r.tasa_descuento * 100).toFixed(0)}% a ${r.dias_max}d`).join(" · ");
}

export interface ProviderInvoiceSummary {
  facturacion12m: number;
  porPagarTotal: number;
  porPagarCount: number;
}

export async function getProviderInvoiceSummary(nombreNormalizado: string, nombreErpLike: string): Promise<ProviderInvoiceSummary> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const sinceStr = since.toISOString().slice(0, 10);

  const [emailRes, pendingRes] = await Promise.all([
    postgrestFetch(
      `/email_invoice?proveedor_norm=eq.${nombreNormalizado}&fecha_emision_correo=gte.${sinceStr}&select=valor_total_correo`,
      {},
      "treasury"
    ),
    postgrestFetch(
      `/erp_pending?nombre_proveedor_erp=ilike.*${encodeURIComponent(nombreErpLike)}*&select=valor_total_erp`,
      {},
      "treasury"
    ),
  ]);

  const emailRows = emailRes.ok ? ((await emailRes.json()) as { valor_total_correo: number }[]) : [];
  const pendingRows = pendingRes.ok ? ((await pendingRes.json()) as { valor_total_erp: number }[]) : [];

  return {
    facturacion12m: emailRows.reduce((sum, r) => sum + Number(r.valor_total_correo ?? 0), 0),
    porPagarTotal: pendingRows.reduce((sum, r) => sum + Number(r.valor_total_erp ?? 0), 0),
    porPagarCount: pendingRows.length,
  };
}

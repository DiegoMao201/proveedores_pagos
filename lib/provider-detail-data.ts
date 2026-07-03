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

export type CategoriaProveedor = "estrategico" | "operativo" | "locativo" | "esporadico" | "institucional";

export interface ProviderFull {
  id: number;
  codigo_proveedor: string | null;
  nif: string | null;
  nombre: string;
  nombre_normalizado: string;
  activo: boolean;
  categoria_proveedor: CategoriaProveedor | null;
  email_pago: string | null;
  email_cc: string | null;
  email_alertas: string | null;
  contacto_pagos: string | null;
  contacto_tesoreria: string | null;
  contacto_cargo: string | null;
  telefono: string | null;
  condiciones_comerciales: string | null;
  observaciones: string | null;
  plazo_pago_dias: number | null;
  forma_pago: string | null;
  limite_credito: number | null;
  dia_corte_pagos: number | null;
  anomaly_detection: boolean;
  es_autoretenedor: boolean;
  actividad_economica: string | null;
  municipio_ica: string | null;
}

const PROVIDER_FULL_SELECT =
  "id,codigo_proveedor,nif,nombre,nombre_normalizado,activo,categoria_proveedor,email_pago,email_cc,email_alertas," +
  "contacto_pagos,contacto_tesoreria,contacto_cargo,telefono,condiciones_comerciales,observaciones,plazo_pago_dias," +
  "forma_pago,limite_credito,dia_corte_pagos,anomaly_detection,es_autoretenedor,actividad_economica,municipio_ica";

export async function getProviderFull(id: number): Promise<ProviderFull | null> {
  const res = await postgrestFetch(`/provider?id=eq.${id}&select=${PROVIDER_FULL_SELECT}`, {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /provider -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as ProviderFull[];
  return rows[0] ?? null;
}

export interface ProviderHistoryRow {
  history_id: number;
  provider_id: number;
  table_name: string;
  changed_at: string;
  changed_by: string | null;
  operation: "INSERT" | "UPDATE" | "DELETE";
  old_row: Record<string, unknown> | null;
  new_row: Record<string, unknown> | null;
  changed_fields: string[] | null;
}

export async function getProviderHistory(providerId: number, limit = 20, offset = 0): Promise<ProviderHistoryRow[]> {
  const res = await postgrestFetch(
    `/provider_history?provider_id=eq.${providerId}&select=*&order=changed_at.desc&limit=${limit}&offset=${offset}`,
    {},
    "audit"
  );
  if (!res.ok) throw new Error(`PostgREST /provider_history -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
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

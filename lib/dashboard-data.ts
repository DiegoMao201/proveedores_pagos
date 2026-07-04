import "server-only";
import { postgrestFetch } from "@/lib/postgrest";
import type { AgingBucketKey } from "@/components/ui/aging-swatch";
import type { HeatmapDay } from "@/components/dashboard/payment-calendar-heatmap";

export interface DashboardKpis {
  facturas_ingestadas_30d: number;
  cartera_pendiente_count: number;
  cartera_pendiente_total: number;
  cartera_saldada_30d_count: number;
  cartera_saldada_30d_total: number;
}

export interface PendingAgingRow {
  bucket: AgingBucketKey;
  cnt: number;
  total: number;
}

async function fetchTreasury<T>(path: string): Promise<T> {
  const res = await postgrestFetch(path, {}, "treasury");
  if (!res.ok) {
    throw new Error(`PostgREST ${path} -> HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const rows = await fetchTreasury<DashboardKpis[]>("/v_dashboard_kpis");
  return (
    rows[0] ?? {
      facturas_ingestadas_30d: 0,
      cartera_pendiente_count: 0,
      cartera_pendiente_total: 0,
      cartera_saldada_30d_count: 0,
      cartera_saldada_30d_total: 0,
    }
  );
}

export async function getPendingAging(): Promise<Record<AgingBucketKey, number>> {
  const rows = await fetchTreasury<PendingAgingRow[]>("/v_pending_aging");
  const counts: Partial<Record<AgingBucketKey, number>> = {};
  for (const row of rows) {
    counts[row.bucket] = Number(row.cnt);
  }
  return {
    al_dia: counts.al_dia ?? 0,
    "1_14": counts["1_14"] ?? 0,
    "15_30": counts["15_30"] ?? 0,
    "31_60": counts["31_60"] ?? 0,
    mas_60: counts.mas_60 ?? 0,
  };
}

export async function getPaymentCalendar(): Promise<HeatmapDay[]> {
  const rows = await fetchTreasury<{ fecha: string; cnt: number; total: number }[]>(
    "/v_payment_calendar"
  );
  const byDate = new Map(rows.map((r) => [r.fecha, r]));

  const maxTotal = Math.max(1, ...rows.map((r) => Number(r.total)));
  const today = new Date();
  const days: HeatmapDay[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    const entry = byDate.get(key);
    const total = entry ? Number(entry.total) : 0;
    const ratio = total / maxTotal;
    const intensity: HeatmapDay["intensity"] =
      total === 0 ? 0 : ratio > 0.66 ? 4 : ratio > 0.4 ? 3 : ratio > 0.15 ? 2 : 1;

    days.push({
      date: key,
      intensity,
      label: entry
        ? `${date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} — ${entry.cnt} factura(s), $ ${total.toLocaleString("es-CO")}`
        : date.toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
    });
  }

  return days;
}

export interface UrgentInvoiceRow {
  invoice_key: string;
  num_factura: string;
  proveedor_id: number;
  nombre_proveedor: string;
  categoria_proveedor: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  dias_a_vencer: number;
  valor_bruto: number;
  valor_descuento: number;
  valor_retencion_total: number;
  valor_neto: number;
  nivel_urgencia: "vencida" | "critica" | "urgente" | "proxima" | "normal";
  descuento_en_riesgo: boolean;
}

export async function getUrgentInvoices(limit = 20): Promise<UrgentInvoiceRow[]> {
  return fetchTreasury<UrgentInvoiceRow[]>(`/v_urgent_invoices?select=*&limit=${limit}`);
}

export interface TopProviderRow {
  proveedor_id: number;
  nombre_proveedor: string;
  categoria_proveedor: string;
  num_facturas: number;
  num_ncs: number;
  bruto_facturas: number | null;
  bruto_ncs: number | null;
  neto_total: number;
  dias_a_vencer_mas_urgente: number | null;
}

export async function getTopProvidersByVolume(limit = 5): Promise<TopProviderRow[]> {
  return fetchTreasury<TopProviderRow[]>(`/v_top_providers_by_volume?select=*&limit=${limit}`);
}

export interface PendingDiscountRow {
  invoice_key: string;
  num_factura: string;
  nombre_proveedor: string;
  categoria_proveedor: string;
  proveedor_id: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  dias_a_vencer: number | null;
  valor_bruto: number;
  valor_descuento: number;
  valor_neto: number;
  descuento_pct: number;
  estado_descuento: "ya_perdido" | "critico" | "urgente" | "vigente";
}

export async function getPendingDiscounts(limit = 10): Promise<PendingDiscountRow[]> {
  return fetchTreasury<PendingDiscountRow[]>(`/v_pending_discounts?select=*&limit=${limit}`);
}

export interface RetentionToReviewRow {
  invoice_key: string;
  num_factura: string;
  nombre_proveedor: string;
  proveedor_id: number;
  fecha_emision: string;
  valor_bruto: number;
  valor_retencion_fuente: number;
  valor_retencion_ica: number;
  valor_retencion_iva: number;
  valor_retencion_otros: number;
  retencion_total: number;
  retencion_pct: number;
  es_autoretenedor: boolean;
  flag_revision: "autoretenedor_con_fuente" | "retencion_alta" | "triple_retencion" | "normal";
}

export async function getRetentionsToReview(): Promise<RetentionToReviewRow[]> {
  return fetchTreasury<RetentionToReviewRow[]>("/v_retentions_to_review?select=*&flag_revision=neq.normal");
}

export interface SystemHealthRow {
  componente: "imap" | "dropbox" | "worker";
  nombre_display: string;
  ultima_actividad: string | null;
  minutos_desde_ultima: number | null;
  estado: "verde" | "amarillo" | "rojo";
}

export async function getSystemHealth(): Promise<SystemHealthRow[]> {
  return fetchTreasury<SystemHealthRow[]>("/v_system_health?select=*");
}

export async function getPaymentRunway(): Promise<{ d7: number; d15: number; d30: number }> {
  const rows = await fetchTreasury<{ fecha: string; total: number }[]>("/v_payment_calendar");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sumUntil = (days: number) => {
    const limit = new Date(today);
    limit.setDate(limit.getDate() + days);
    return rows
      .filter((r) => {
        const d = new Date(r.fecha);
        return d >= today && d <= limit;
      })
      .reduce((sum, r) => sum + Number(r.total), 0);
  };

  return { d7: sumUntil(7), d15: sumUntil(15), d30: sumUntil(30) };
}


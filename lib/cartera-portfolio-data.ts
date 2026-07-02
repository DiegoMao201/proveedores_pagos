import "server-only";
import { postgrestFetch } from "@/lib/postgrest";
import type { AgingBucketKey } from "@/components/ui/aging-swatch";

export interface PendingPortfolioRow {
  id: number;
  nombre_proveedor_erp: string;
  nombre_display: string;
  num_factura: string;
  fecha_emision_erp: string | null;
  fecha_vencimiento_erp: string | null;
  valor_total_erp: number;
  dias_vencido: number | null;
  estado_aging: "VENCIDA" | "VENCE_PRONTO" | "POR_VENCER" | "ESTABLE";
  aging_bucket: AgingBucketKey;
  invoice_key: string;
  synced_at: string;
}

export interface PendingKpis {
  total_pendiente: number;
  facturas_total: number;
  vencidas_valor: number;
  vencidas_count: number;
  semana_valor: number;
  semana_count: number;
}

export interface ProviderConcentrationRow {
  nombre_display: string;
  total_pendiente: number;
  facturas: number;
  pct_portafolio: number;
}

export interface CashflowWeekRow {
  semana_inicio: string;
  semana_fin: string;
  total: number;
  facturas: number;
}

async function fetchTreasury<T>(path: string): Promise<T> {
  const res = await postgrestFetch(path, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST ${path} -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getPendingKpis(): Promise<PendingKpis> {
  const rows = await fetchTreasury<PendingKpis[]>("/v_pending_kpis");
  return (
    rows[0] ?? {
      total_pendiente: 0,
      facturas_total: 0,
      vencidas_valor: 0,
      vencidas_count: 0,
      semana_valor: 0,
      semana_count: 0,
    }
  );
}

export async function getProviderConcentration(limit = 10): Promise<ProviderConcentrationRow[]> {
  return fetchTreasury(`/v_provider_concentration?limit=${limit}`);
}

export async function getProviderConcentrationCount(): Promise<number> {
  const res = await postgrestFetch("/v_provider_concentration?select=nombre_display", { headers: { Prefer: "count=exact", Range: "0-0", "Range-Unit": "items" } }, "treasury");
  const contentRange = res.headers.get("Content-Range");
  return contentRange ? Number(contentRange.split("/")[1]) : 0;
}

export async function getCashflowWeekly(): Promise<CashflowWeekRow[]> {
  return fetchTreasury("/v_cashflow_weekly");
}

export async function getPendingPortfolio(limit = 100): Promise<PendingPortfolioRow[]> {
  return fetchTreasury(`/v_pending_portfolio?order=dias_vencido.desc.nullslast&limit=${limit}`);
}

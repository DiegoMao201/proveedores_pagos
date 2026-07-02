import "server-only";
import { postgrestFetch } from "@/lib/postgrest";
import { calculateCapturableDiscounts, type PendingInvoiceForDiscount } from "@/lib/discount-rules";
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

export async function getCapturableDiscountTotal(): Promise<{ total: number; count: number; nearestDeadline: string | null }> {
  const rows = await fetchTreasury<PendingInvoiceForDiscount[]>(
    "/erp_pending?select=nombre_proveedor_erp,fecha_emision_erp,valor_total_erp"
  );
  const capturable = calculateCapturableDiscounts(rows);
  const total = capturable.reduce((sum, c) => sum + c.valorDescuento, 0);
  const nearestDeadline = capturable.length
    ? capturable.reduce((min, c) => (c.deadline < min ? c.deadline : min), capturable[0].deadline)
    : null;

  return { total, count: capturable.length, nearestDeadline };
}

import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface DiscountCapturableRow {
  invoice_key: string;
  nombre_proveedor_erp: string;
  nombre_display: string;
  num_factura: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  es_nota_credito: boolean;
  valor_base: number;
  ahorro_potencial: number;
  peldano_aplicable: string;
  dias_restantes: number;
}

async function fetchDiscountCapturable(): Promise<DiscountCapturableRow[]> {
  const res = await postgrestFetch("/v_discount_capturable?select=*", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_discount_capturable -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getCapturableDiscountTotal(): Promise<{ total: number; count: number; nearestDeadline: string | null }> {
  const rows = await fetchDiscountCapturable();
  const total = rows.reduce((sum, r) => sum + Number(r.ahorro_potencial), 0);
  const nearestDeadline = rows.length
    ? rows.reduce((min, r) => (r.fecha_vencimiento && (!min || r.fecha_vencimiento < min) ? r.fecha_vencimiento : min), rows[0].fecha_vencimiento)
    : null;
  return { total, count: rows.length, nearestDeadline };
}

export interface DiscountAlertRow {
  invoice_key: string;
  nombre_proveedor_erp: string;
  peldano_aplicable: string;
  ahorro_potencial: number;
  dias_restantes: number;
  fecha_emision: string;
}

export async function getDiscountAlerts(maxDays = 5): Promise<DiscountAlertRow[]> {
  const rows = await fetchDiscountCapturable();
  return rows
    .filter((r) => r.dias_restantes <= maxDays)
    .sort((a, b) => a.dias_restantes - b.dias_restantes)
    .map((r) => ({
      invoice_key: r.invoice_key,
      nombre_proveedor_erp: r.nombre_display,
      peldano_aplicable: r.peldano_aplicable,
      ahorro_potencial: r.ahorro_potencial,
      dias_restantes: r.dias_restantes,
      fecha_emision: r.fecha_emision,
    }));
}

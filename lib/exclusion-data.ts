import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface ExcludedInvoiceRow {
  exclusion_id: string;
  invoice_key: string;
  motivo: string | null;
  excluida_por: string | null;
  excluida_por_nombre: string | null;
  excluida_at: string;
  num_factura: string | null;
  proveedor_norm: string;
  nombre_proveedor: string | null;
  valor: number | null;
  fecha_emision: string | null;
  fuente: "ambos" | "solo_correo" | "solo_erp" | "ninguno";
}

export async function getExcludedInvoices(): Promise<ExcludedInvoiceRow[]> {
  const res = await postgrestFetch("/v_excluded_invoices?select=*", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_excluded_invoices -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

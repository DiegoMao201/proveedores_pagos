import "server-only";
import { postgrestFetch } from "@/lib/postgrest";
import type { AgingBucketKey } from "@/components/ui/aging-swatch";

export interface ErpPending {
  id: number;
  nombre_proveedor_erp: string;
  serie: string | null;
  num_entrada: string | null;
  num_factura: string;
  doc_erp: string | null;
  fecha_emision_erp: string | null;
  fecha_vencimiento_erp: string | null;
  valor_total_erp: number;
  synced_at: string;
  invoice_key: string;
  aging: AgingBucketKey;
}

export interface ErpPaid {
  id: number;
  nombre_proveedor_erp: string;
  serie: string | null;
  num_entrada: string | null;
  num_factura: string;
  estado_documento: string | null;
  fecha_emision_erp: string | null;
  fecha_vencimiento_erp: string | null;
  valor_total_erp: number;
  synced_at: string;
  invoice_key: string;
}

export interface CarteraFilters {
  page: number;
  pageSize: number;
  q?: string;
  aging?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

async function fetchTreasuryList<T>(
  path: string,
  select: string,
  order: string,
  filters: CarteraFilters,
  extraQuery?: (params: URLSearchParams) => void
): Promise<{ rows: T[]; total: number }> {
  const offset = (filters.page - 1) * filters.pageSize;
  const params = new URLSearchParams();
  params.set("select", select);
  params.set("order", order);
  if (filters.q) {
    const q = filters.q.replace(/[,()]/g, "");
    params.set("or", `(nombre_proveedor_erp.ilike.*${q}*,num_factura.ilike.*${q}*)`);
  }
  if (filters.fechaDesde) params.set("fecha_vencimiento_erp", `gte.${filters.fechaDesde}`);
  if (filters.fechaHasta) params.append("fecha_vencimiento_erp", `lte.${filters.fechaHasta}`);
  extraQuery?.(params);

  const res = await postgrestFetch(
    `${path}?${params.toString()}`,
    {
      headers: {
        Prefer: "count=exact",
        Range: `${offset}-${offset + filters.pageSize - 1}`,
        "Range-Unit": "items",
      },
    },
    "treasury"
  );

  if (!res.ok) {
    throw new Error(`PostgREST ${path} -> HTTP ${res.status}: ${await res.text()}`);
  }

  const rows = (await res.json()) as T[];
  const contentRange = res.headers.get("Content-Range");
  const total = contentRange ? Number(contentRange.split("/")[1]) : rows.length;
  return { rows, total };
}

export async function getPending(filters: CarteraFilters): Promise<{ rows: ErpPending[]; total: number }> {
  return fetchTreasuryList<ErpPending>(
    "/erp_pending",
    "*,aging",
    "fecha_vencimiento_erp.asc",
    filters,
    (params) => {
      if (filters.aging) params.set("aging", `eq.${filters.aging}`);
    }
  );
}

export async function getPaid(filters: CarteraFilters): Promise<{ rows: ErpPaid[]; total: number }> {
  return fetchTreasuryList<ErpPaid>("/erp_paid", "*", "fecha_vencimiento_erp.desc", filters);
}

export async function getEmailMatchForInvoiceKey(invoiceKey: string) {
  const res = await postgrestFetch(
    `/email_invoice?invoice_key=eq.${encodeURIComponent(invoiceKey)}&select=*`,
    {},
    "treasury"
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

export async function getPendingByKey(invoiceKey: string): Promise<ErpPending | null> {
  const res = await postgrestFetch(
    `/erp_pending?invoice_key=eq.${encodeURIComponent(invoiceKey)}&select=*,aging`,
    {},
    "treasury"
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as ErpPending[];
  return rows[0] ?? null;
}

export async function getPaidByKey(invoiceKey: string): Promise<ErpPaid | null> {
  const res = await postgrestFetch(
    `/erp_paid?invoice_key=eq.${encodeURIComponent(invoiceKey)}&select=*`,
    {},
    "treasury"
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as ErpPaid[];
  return rows[0] ?? null;
}

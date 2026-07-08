import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface ReconciledRow {
  invoice_key: string;
  nombre_display: string | null;
  num_factura_correo: string;
  tipo_documento_correo: string | null;
  es_nota_credito: boolean;
  valor_total_correo: number;
  fecha_emision_correo: string | null;
  fecha_vencimiento_correo: string | null;
  valor_total_erp: number;
  fecha_vencimiento_erp: string | null;
  estado_erp: "pendiente" | "saldada";
  diferencia_valor: number;
  diferencia_pct: number;
  categoria_proveedor: string | null;
  nombre_provider: string | null;
}

export interface ConciliacionFilters {
  proveedor?: string;
  categoria?: string;
  desde?: string;
  hasta?: string;
}

export interface ReconciliationKpis {
  conciliadas: number;
  conciliadas_sin_diferencia: number;
  correo_sin_erp: number;
  erp_pendiente_sin_correo: number;
  erp_saldada_sin_correo: number;
}

export interface ReconciliationDiffRow {
  categoria: "SIN_DIFERENCIA" | "MENOR" | "MODERADA" | "CRITICA";
  n: number;
}

export interface EmailWithoutErpRow {
  invoice_key: string;
  proveedor_correo: string | null;
  num_factura: string;
  valor_total_correo: number;
  fecha_emision_correo: string | null;
  fecha_recepcion_correo: string | null;
  categoria_proveedor: string | null;
  nombre_provider: string | null;
}

export interface ErpWithoutEmailRow {
  invoice_key: string;
  nombre_proveedor_erp: string;
  num_factura: string;
  fecha_emision_erp: string | null;
  fecha_vencimiento_erp: string | null;
  valor_total_erp: number;
  estado_erp: "pendiente" | "saldada";
  categoria_proveedor: string | null;
  nombre_provider: string | null;
}

export interface HistoricalCutoffs {
  cutoffFacturas: string;
  cutoffNcs: string;
  offsetMesesNcs: number;
}

export async function getHistoricalCutoffs(): Promise<HistoricalCutoffs> {
  const res = await postgrestFetch("/system_config?select=clave,valor", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /system_config -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as { clave: string; valor: string }[];
  const byClave = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
  const offsetMesesNcs = Number(byClave.historical_cutoff_ncs_offset_months ?? 2);
  const cutoffNcsDate = new Date();
  cutoffNcsDate.setMonth(cutoffNcsDate.getMonth() - offsetMesesNcs);
  return {
    cutoffFacturas: byClave.historical_cutoff_facturas ?? "",
    cutoffNcs: cutoffNcsDate.toISOString().slice(0, 10),
    offsetMesesNcs,
  };
}

interface PagedResult<T> {
  rows: T[];
  total: number;
}

async function fetchPaged<T>(
  path: string,
  select: string,
  order: string,
  page: number,
  pageSize: number,
  opts: { proveedorField?: string; fechaField?: string; filters?: ConciliacionFilters } = {}
): Promise<PagedResult<T>> {
  const offset = (page - 1) * pageSize;
  const f = opts.filters;
  const parts = [`select=${select}`, `order=${order}`];
  if (f?.proveedor && opts.proveedorField) {
    // Busca tanto en el nombre crudo (correo/ERP) como en el nombre real del
    // catalogo -- un proveedor puede facturar bajo su razon social legal
    // (ej. Pintuco factura como "Compania Global de Pinturas S.A.S.") que no
    // contiene el nombre comercial por el que Diego lo busca.
    const needle = encodeURIComponent(f.proveedor);
    parts.push(`or=(${opts.proveedorField}.ilike.*${needle}*,nombre_provider.ilike.*${needle}*)`);
  }
  if (f?.categoria && f.categoria !== "todas") parts.push(`categoria_proveedor=eq.${f.categoria}`);
  if (f?.desde && opts.fechaField) parts.push(`${opts.fechaField}=gte.${f.desde}`);
  if (f?.hasta && opts.fechaField) parts.push(`${opts.fechaField}=lte.${f.hasta}`);

  const res = await postgrestFetch(
    `${path}?${parts.join("&")}`,
    {
      headers: {
        Prefer: "count=exact",
        Range: `${offset}-${offset + pageSize - 1}`,
        "Range-Unit": "items",
      },
    },
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST ${path} -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as T[];
  const contentRange = res.headers.get("Content-Range");
  const total = contentRange ? Number(contentRange.split("/")[1]) : rows.length;
  return { rows, total };
}

export async function getReconciled(page: number, pageSize: number, filters?: ConciliacionFilters) {
  return fetchPaged<ReconciledRow>("/v_reconciled", "*", "diferencia_valor.desc", page, pageSize, {
    proveedorField: "nombre_display",
    fechaField: "fecha_emision_correo",
    filters,
  });
}

export async function getReconciledMercancia(page: number, pageSize: number, filters?: ConciliacionFilters) {
  return fetchPaged<ReconciledRow>("/v_reconciliation_mercancia", "*", "diferencia_valor.desc", page, pageSize, {
    proveedorField: "nombre_display",
    fechaField: "fecha_emision_correo",
    filters: filters ? { proveedor: filters.proveedor, desde: filters.desde, hasta: filters.hasta } : undefined,
  });
}

export async function getEmailWithoutErp(page: number, pageSize: number, filters?: ConciliacionFilters) {
  return fetchPaged<EmailWithoutErpRow>(
    "/v_email_without_erp",
    "invoice_key,proveedor_correo,num_factura,valor_total_correo,fecha_emision_correo,fecha_recepcion_correo,categoria_proveedor,nombre_provider",
    "fecha_recepcion_correo.desc",
    page,
    pageSize,
    { proveedorField: "proveedor_correo", fechaField: "fecha_emision_correo", filters }
  );
}

export async function getErpWithoutEmail(page: number, pageSize: number, filters?: ConciliacionFilters) {
  return fetchPaged<ErpWithoutEmailRow>("/v_erp_without_email", "*", "fecha_vencimiento_erp.asc", page, pageSize, {
    proveedorField: "nombre_proveedor_erp",
    fechaField: "fecha_emision_erp",
    filters,
  });
}

export async function getErpWithoutEmailMercancia(page: number, pageSize: number, filters?: ConciliacionFilters) {
  return fetchPaged<ErpWithoutEmailRow>("/v_erp_without_email_mercancia", "*", "fecha_vencimiento_erp.asc", page, pageSize, {
    proveedorField: "nombre_proveedor_erp",
    fechaField: "fecha_emision_erp",
    filters: filters ? { proveedor: filters.proveedor, desde: filters.desde, hasta: filters.hasta } : undefined,
  });
}

export async function getEmailWithoutErpMercancia(page: number, pageSize: number, filters?: ConciliacionFilters) {
  return fetchPaged<EmailWithoutErpRow>(
    "/v_email_without_erp_mercancia",
    "invoice_key,proveedor_correo,num_factura,valor_total_correo,fecha_emision_correo,fecha_recepcion_correo,nombre_provider",
    "fecha_recepcion_correo.desc",
    page,
    pageSize,
    {
      proveedorField: "proveedor_correo",
      fechaField: "fecha_emision_correo",
      filters: filters ? { proveedor: filters.proveedor, desde: filters.desde, hasta: filters.hasta } : undefined,
    }
  );
}

export async function getReconciliationKpis(): Promise<ReconciliationKpis> {
  const res = await postgrestFetch("/v_reconciliation_kpis", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_reconciliation_kpis -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as ReconciliationKpis[];
  return (
    rows[0] ?? {
      conciliadas: 0,
      conciliadas_sin_diferencia: 0,
      correo_sin_erp: 0,
      erp_pendiente_sin_correo: 0,
      erp_saldada_sin_correo: 0,
    }
  );
}

export interface ReconciliationKpisMercancia {
  conciliadas: number;
  conciliadas_sin_diferencia: number;
  correo_sin_erp: number;
  erp_pendiente_sin_correo: number;
}

export async function getReconciliationKpisMercancia(): Promise<ReconciliationKpisMercancia> {
  const res = await postgrestFetch("/v_reconciliation_kpis_mercancia", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_reconciliation_kpis_mercancia -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as ReconciliationKpisMercancia[];
  return (
    rows[0] ?? {
      conciliadas: 0,
      conciliadas_sin_diferencia: 0,
      correo_sin_erp: 0,
      erp_pendiente_sin_correo: 0,
    }
  );
}

export async function getReconciliationDiffs(): Promise<ReconciliationDiffRow[]> {
  const res = await postgrestFetch("/v_reconciliation_diffs", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_reconciliation_diffs -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}


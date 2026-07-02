import "server-only";
import { postgrestFetch } from "@/lib/postgrest";
import { calculateCapturableDiscounts } from "@/lib/discount-rules";

export interface ReconciledRow {
  invoice_key: string;
  nombre_display: string | null;
  num_factura_correo: string;
  valor_total_correo: number;
  fecha_emision_correo: string | null;
  fecha_vencimiento_correo: string | null;
  valor_total_erp: number;
  fecha_vencimiento_erp: string | null;
  estado_erp: "pendiente" | "saldada";
  diferencia_valor: number;
}

export interface EmailWithoutErpRow {
  invoice_key: string;
  proveedor_correo: string | null;
  num_factura: string;
  valor_total_correo: number;
  fecha_emision_correo: string | null;
  fecha_recepcion_correo: string | null;
}

export interface ErpWithoutEmailRow {
  invoice_key: string;
  nombre_proveedor_erp: string;
  num_factura: string;
  fecha_emision_erp: string | null;
  fecha_vencimiento_erp: string | null;
  valor_total_erp: number;
  estado_erp: "pendiente" | "saldada";
}

export interface DiscountAlertRow {
  invoice_key: string;
  nombre_proveedor_erp: string;
  rate: number;
  deadline: string;
  valorDescuento: number;
  daysLeft: number;
}

interface PagedResult<T> {
  rows: T[];
  total: number;
}

async function fetchPaged<T>(path: string, select: string, order: string, page: number, pageSize: number): Promise<PagedResult<T>> {
  const offset = (page - 1) * pageSize;
  const res = await postgrestFetch(
    `${path}?select=${select}&order=${order}`,
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

export async function getReconciled(page: number, pageSize: number) {
  return fetchPaged<ReconciledRow>("/v_reconciled", "*", "diferencia_valor.desc", page, pageSize);
}

export async function getEmailWithoutErp(page: number, pageSize: number) {
  return fetchPaged<EmailWithoutErpRow>(
    "/v_email_without_erp",
    "invoice_key,proveedor_correo,num_factura,valor_total_correo,fecha_emision_correo,fecha_recepcion_correo",
    "fecha_recepcion_correo.desc",
    page,
    pageSize
  );
}

export async function getErpWithoutEmail(page: number, pageSize: number) {
  return fetchPaged<ErpWithoutEmailRow>("/v_erp_without_email", "*", "fecha_vencimiento_erp.asc", page, pageSize);
}

export async function getDiscountAlerts(maxDays = 7): Promise<DiscountAlertRow[]> {
  const res = await postgrestFetch(
    "/erp_pending?select=invoice_key,nombre_proveedor_erp,fecha_emision_erp,valor_total_erp",
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /erp_pending -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as {
    invoice_key: string;
    nombre_proveedor_erp: string;
    fecha_emision_erp: string | null;
    valor_total_erp: number;
  }[];

  const today = new Date();
  const capturable = calculateCapturableDiscounts(rows);

  return capturable
    .map((c) => {
      const deadline = new Date(c.deadline);
      const daysLeft = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        invoice_key: c.invoice_key ?? c.nombre_proveedor_erp,
        nombre_proveedor_erp: c.nombre_proveedor_erp,
        rate: c.rate,
        deadline: c.deadline,
        valorDescuento: c.valorDescuento,
        daysLeft,
      };
    })
    .filter((c) => c.daysLeft <= maxDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

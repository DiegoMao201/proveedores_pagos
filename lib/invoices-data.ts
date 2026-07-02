import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface EmailInvoice {
  invoice_key: string;
  num_factura: string;
  proveedor_correo: string | null;
  proveedor_norm: string | null;
  tipo_documento_correo: string | null;
  documento_relacionado_correo: string | null;
  descripcion_nota_correo: string | null;
  fecha_emision_correo: string | null;
  fecha_vencimiento_correo: string | null;
  valor_total_correo: number;
  valor_base_correo: number;
  valor_iva_correo: number;
  fecha_recepcion_correo: string | null;
  remitente_correo: string | null;
  asunto_correo: string | null;
  nombre_adjunto: string | null;
  message_id: string | null;
  referencias_correo: string | null;
  origen_soporte: string | null;
}

export interface InvoiceFilters {
  page: number;
  pageSize: number;
  q?: string;
  tipo?: string;
  proveedor?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  valorMin?: string;
  valorMax?: string;
}

function buildInvoiceQuery(filters: InvoiceFilters): string {
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "fecha_recepcion_correo.desc");

  if (filters.q) {
    const q = filters.q.replace(/[,()]/g, "");
    params.set(
      "or",
      `(num_factura.ilike.*${q}*,remitente_correo.ilike.*${q}*,asunto_correo.ilike.*${q}*,message_id.ilike.*${q}*,nombre_adjunto.ilike.*${q}*,proveedor_correo.ilike.*${q}*)`
    );
  }
  if (filters.tipo) params.set("tipo_documento_correo", `eq.${filters.tipo}`);
  if (filters.proveedor) params.set("proveedor_correo", `ilike.*${filters.proveedor}*`);
  if (filters.fechaDesde) params.set("fecha_emision_correo", `gte.${filters.fechaDesde}`);
  if (filters.fechaHasta) params.append("fecha_emision_correo", `lte.${filters.fechaHasta}`);
  if (filters.valorMin) params.set("valor_total_correo", `gte.${filters.valorMin}`);
  if (filters.valorMax) params.append("valor_total_correo", `lte.${filters.valorMax}`);

  return params.toString();
}

export async function getInvoices(
  filters: InvoiceFilters
): Promise<{ rows: EmailInvoice[]; total: number }> {
  const offset = (filters.page - 1) * filters.pageSize;
  const query = buildInvoiceQuery(filters);

  const res = await postgrestFetch(
    `/email_invoice?${query}`,
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
    throw new Error(`PostgREST /email_invoice -> HTTP ${res.status}: ${await res.text()}`);
  }

  const rows = (await res.json()) as EmailInvoice[];
  const contentRange = res.headers.get("Content-Range"); // "0-49/3531"
  const total = contentRange ? Number(contentRange.split("/")[1]) : rows.length;

  return { rows, total };
}

export async function getInvoiceByKey(invoiceKey: string): Promise<EmailInvoice | null> {
  const res = await postgrestFetch(
    `/email_invoice?invoice_key=eq.${encodeURIComponent(invoiceKey)}&select=*`,
    {},
    "treasury"
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as EmailInvoice[];
  return rows[0] ?? null;
}

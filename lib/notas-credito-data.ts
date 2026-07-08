import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface NotaCreditoRow {
  invoice_key: string;
  num_factura: string;
  num_factura_erp_interno: string | null;
  num_factura_matched: string | null;
  proveedor_id: number;
  nombre_proveedor: string;
  categoria_proveedor: string;
  fecha_emision: string | null;
  valor_bruto: number;
  fuente_origen: "erp_pending_nc" | "nc_matched" | "nc_solo_correo";
  es_seleccionable: boolean;
  motivo_no_seleccionable: string | null;
}

export async function getNotasCredito(): Promise<NotaCreditoRow[]> {
  const res = await postgrestFetch(
    "/v_active_invoices?tipo_documento=eq.nota_credito" +
      "&select=invoice_key,num_factura,num_factura_erp_interno,num_factura_matched,proveedor_id,nombre_proveedor,categoria_proveedor,fecha_emision,valor_bruto,fuente_origen,es_seleccionable,motivo_no_seleccionable" +
      "&order=nombre_proveedor.asc,fecha_emision.desc",
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /v_active_invoices (NC) -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

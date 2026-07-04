import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export type BatchEstado = "draft" | "exported" | "paid" | "cancelled";
export type BatchCategoriaLote = "estrategico" | "locativo" | "mixto" | null;

export interface BatchListRow {
  id: number;
  codigo_lote: string;
  es_multiproveedor: boolean;
  categoria_lote: BatchCategoriaLote;
  categoria: "CON_DESCUENTO" | "SIN_DESCUENTO";
  estado: BatchEstado;
  fecha_pago_programada: string;
  valor_bruto: number;
  valor_descuento: number;
  valor_retencion: number;
  valor_neto: number;
  created_at: string;
  paid_at: string | null;
  proveedor_nombre_single: string | null;
  num_proveedores: number;
  num_documentos: number;
  proveedores_nombres_concat: string | null;
  created_by_nombre: string | null;
}

export async function getBatchesSummaryList(): Promise<BatchListRow[]> {
  const res = await postgrestFetch("/v_batches_summary_list?select=*&order=created_at.desc", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_batches_summary_list -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

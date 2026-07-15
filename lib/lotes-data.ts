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

export interface BatchProviderBreakdownRow {
  batch_id: number;
  proveedor_id: number;
  proveedor_nombre: string;
  categoria_proveedor: string;
  num_documentos: number;
  num_facturas: number;
  num_ncs: number;
  total_bruto_facturas: number;
  total_ncs: number;
  total_descuento: number;
  total_retenciones: number;
  total_neto: number;
  valor_abonos_aplicados: number;
  total_transferido_banco: number;
  bank_account_id: number | null;
  cuenta_destino: string | null;
  banco_destino_codigo: number | null;
  tipo_transaccion: number | null;
  tipo_documento_beneficiario: number | null;
  proveedor_nit: string | null;
  email_pago: string | null;
  referencia_beneficiario: string | null;
  celular_beneficiario: string | null;
  inscrita_bancolombia: boolean;
  medio_pago: "transferencia" | "portal_proveedor" | null;
}

export async function getBatchProviderBreakdown(batchId: number): Promise<BatchProviderBreakdownRow[]> {
  const res = await postgrestFetch(`/v_batch_provider_breakdown?batch_id=eq.${batchId}&select=*&order=total_neto.desc`, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_batch_provider_breakdown -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getBatchProviderBreakdownForBatches(batchIds: number[]): Promise<BatchProviderBreakdownRow[]> {
  if (batchIds.length === 0) return [];
  const res = await postgrestFetch(
    `/v_batch_provider_breakdown?batch_id=in.(${batchIds.join(",")})&select=*&order=proveedor_nombre.asc`,
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /v_batch_provider_breakdown -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface BatchAuditLogRow {
  id: number;
  batch_id: number;
  event: string;
  event_at: string;
  user_id: string | null;
  user_nombre: string | null;
  metadata: Record<string, unknown> | null;
}

export interface BatchItemDetailRow {
  id: number;
  batch_id: number;
  proveedor_id: number;
  invoice_key: string;
  num_factura: string;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  valor_bruto: number;
  valor_descuento: number;
  valor_retencion_fuente: number;
  valor_retencion_ica: number;
  valor_retencion_iva: number;
  valor_retencion_otros: number;
  valor_neto: number;
  tipo_documento: "factura" | "nota_credito";
  descuento_manual: boolean;
  es_pago_parcial: boolean;
  valor_neto_original: number | null;
  motivo_pago_parcial: string | null;
}

export async function getBatchItemsDetail(batchId: number): Promise<BatchItemDetailRow[]> {
  const res = await postgrestFetch(`/v_batch_item_detail?batch_id=eq.${batchId}&select=*&order=fecha_emision.asc`, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_batch_item_detail -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface BatchDiscrepancyRow {
  id: number;
  codigo_lote: string;
  proveedor_id: number;
  proveedor_nombre: string;
  paid_at: string;
  valor_neto: number;
  dias_desde_pago: number;
  num_facturas: number;
  confirmadas_por_erp: number;
  pendientes_confirmacion: number;
  nivel_alerta: "NORMAL" | "ATENCION" | "CRITICA";
}

export async function getBatchDiscrepancy(batchId: number): Promise<BatchDiscrepancyRow[]> {
  const res = await postgrestFetch(`/v_batch_erp_discrepancy?id=eq.${batchId}&select=*`, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_batch_erp_discrepancy -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getBatchAuditLog(batchId: number): Promise<BatchAuditLogRow[]> {
  const res = await postgrestFetch(`/v_batch_payment_log?batch_id=eq.${batchId}&select=*&order=event_at.asc`, {}, "audit");
  if (!res.ok) throw new Error(`PostgREST /v_batch_payment_log -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

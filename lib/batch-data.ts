import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface ProviderInvoiceCalc {
  invoice_key: string;
  erp_pending_id: number;
  num_factura: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  es_nota_credito: boolean;
  valor_bruto: number;
  valor_base: number;
  valor_iva: number;
  discount_rule_id: number | null;
  tasa_descuento_aplicada: number | null;
  valor_descuento: number;
  peldano_descuento: string | null;
  valor_retencion_fuente: number;
  valor_retencion_ica: number;
  valor_retencion_iva: number;
  valor_retencion_otros: number;
  valor_neto: number;
}

export async function getProviderInvoicesWithCalc(providerId: number, fechaPago: string): Promise<ProviderInvoiceCalc[]> {
  const res = await postgrestFetch(
    "/rpc/get_provider_invoices_with_calc",
    { method: "POST", body: JSON.stringify({ p_provider_id: providerId, p_fecha_pago: fechaPago }) },
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST rpc/get_provider_invoices_with_calc -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface OwnBankAccountRow {
  id: number;
  banco_codigo: number;
  numero_cuenta: string;
  tipo_cuenta: "S" | "D";
  alias: string;
  es_default: boolean;
}

export async function getOwnBankAccounts(): Promise<OwnBankAccountRow[]> {
  const res = await postgrestFetch("/own_bank_account?activa=eq.true&select=id,banco_codigo,numero_cuenta,tipo_cuenta,alias,es_default&order=es_default.desc", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /own_bank_account -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface BatchSummaryRow {
  id: number;
  codigo_lote: string;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_nif: string | null;
  categoria: "CON_DESCUENTO" | "SIN_DESCUENTO";
  estado: "draft" | "exported" | "paid" | "cancelled";
  fecha_pago_programada: string;
  descripcion_pago: string;
  valor_bruto: number;
  valor_descuento: number;
  valor_retencion: number;
  valor_neto: number;
  ahorro_perdido: number;
  cuenta_debito: string | null;
  banco_debito_codigo: number | null;
  banco_debito_nombre: string | null;
  tipo_cuenta_debito: "S" | "D" | null;
  cuenta_destino: string | null;
  banco_destino_codigo: number | null;
  banco_destino_nombre: string | null;
  email_proveedor: string | null;
  inscrita_bancolombia: boolean | null;
  num_facturas: number;
  num_facturas_con_descuento: number;
  created_at: string;
  created_by: string | null;
  created_by_nombre: string | null;
  exported_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  notified_at: string | null;
}

export async function getActiveBatches(): Promise<BatchSummaryRow[]> {
  const res = await postgrestFetch("/v_batch_summary?estado=in.(draft,exported)&select=*&order=created_at.desc", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_batch_summary -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getBatchByCode(codigoLote: string): Promise<BatchSummaryRow | null> {
  const res = await postgrestFetch(`/v_batch_summary?codigo_lote=eq.${codigoLote}&select=*`, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_batch_summary -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as BatchSummaryRow[];
  return rows[0] ?? null;
}

export interface BatchItemRow {
  id: number;
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
}

export async function getBatchItems(batchId: number): Promise<BatchItemRow[]> {
  const res = await postgrestFetch(`/payment_batch_item?batch_id=eq.${batchId}&select=*&order=fecha_emision.asc`, {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /payment_batch_item -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface ProviderReconcilingRow {
  invoice_key: string;
  num_factura: string;
  fecha_emision_correo: string | null;
  valor_total_correo: number;
}

export async function getProviderReconciling(nombreNormalizado: string): Promise<ProviderReconcilingRow[]> {
  const res = await postgrestFetch(
    `/v_email_without_erp?proveedor_norm=eq.${nombreNormalizado}&select=invoice_key,num_factura,fecha_emision_correo,valor_total_correo&order=fecha_emision_correo.desc`,
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /v_email_without_erp -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface ProviderPaidRow {
  invoice_key: string;
  num_factura: string;
  fecha_emision_erp: string | null;
  fecha_vencimiento_erp: string | null;
  valor_total_erp: number;
}

// nombreErpLike: primera palabra del nombre display del proveedor (mismo patron
// ya usado en provider-detail-data.ts::getProviderInvoiceSummary), ya que
// erp_paid.nombre_proveedor_erp es el nombre crudo del ERP, no normalizado.
export async function getProviderPaid(nombreErpLike: string): Promise<ProviderPaidRow[]> {
  const res = await postgrestFetch(
    `/erp_paid?nombre_proveedor_erp=ilike.*${encodeURIComponent(nombreErpLike)}*&select=invoice_key,num_factura,fecha_emision_erp,fecha_vencimiento_erp,valor_total_erp&order=fecha_emision_erp.desc&limit=100`,
    {},
    "treasury"
  );
  if (!res.ok) throw new Error(`PostgREST /erp_paid -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export type PartialPaymentEstado = "conciliado" | "pendiente_confirmacion_erp" | "alerta_no_concilia" | "factura_no_encontrada_en_erp";

export interface PartialPaymentStatusRow {
  id: number;
  invoice_key: string;
  batch_id: number;
  codigo_lote: string;
  batch_item_id: number;
  proveedor_id: number | null;
  proveedor_nombre: string | null;
  valor_neto_antes: number;
  valor_pagado: number;
  saldo_esperado: number;
  valor_erp_al_momento_del_pago: number;
  valor_erp_actual: number | null;
  valor_erp_esperado_tras_pago: number;
  estado_conciliacion: PartialPaymentEstado;
  motivo: string;
  created_at: string;
  created_by: string;
  created_by_nombre: string | null;
}

export async function getPartialPaymentStatus(): Promise<PartialPaymentStatusRow[]> {
  const res = await postgrestFetch("/v_partial_payment_status?select=*&order=created_at.desc", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_partial_payment_status -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

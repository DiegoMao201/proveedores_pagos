import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface RetencionNoConfiguradaRow {
  invoice_key: string;
  proveedor_id: number;
  proveedor_nombre: string;
  categoria_proveedor: string | null;
  num_factura: string;
  valor_total_correo: number;
  valor_total_erp: number;
  diferencia: number;
  diferencia_pct: number;
  fecha_emision: string | null;
}

export async function getRetencionesNoConfiguradas(): Promise<RetencionNoConfiguradaRow[]> {
  const res = await postgrestFetch("/v_posible_retencion_no_configurada?select=*&order=diferencia_pct.desc", {}, "treasury");
  if (!res.ok) throw new Error(`PostgREST /v_posible_retencion_no_configurada -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

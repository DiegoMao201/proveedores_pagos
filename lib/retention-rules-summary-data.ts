import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface RetentionRulesSummaryRow {
  provider_id: number;
  nombre: string;
  es_autoretenedor: boolean;
  tasa_fuente: number | null;
  tasa_ica: number | null;
  tasa_iva: number | null;
  tasa_otros: number | null;
  ultima_modificacion: string | null;
  retenido_hoy: number;
}

export async function getRetentionRulesSummary(): Promise<RetentionRulesSummaryRow[]> {
  const res = await postgrestFetch("/v_retention_rules_summary?select=*", {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /v_retention_rules_summary -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

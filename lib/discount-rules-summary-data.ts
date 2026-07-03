import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface DiscountRulesSummaryRow {
  provider_id: number;
  nombre: string;
  peldanos_activos: number;
  ultima_modificacion: string | null;
  ahorro_capturable_actual: number;
  ahorro_perdido_hoy: number;
}

export async function getDiscountRulesSummary(): Promise<DiscountRulesSummaryRow[]> {
  const res = await postgrestFetch("/v_discount_rules_summary?select=*", {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /v_discount_rules_summary -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

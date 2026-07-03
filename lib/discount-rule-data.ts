import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export interface DiscountRuleFull {
  id: number;
  provider_id: number;
  peldano_orden: number;
  dias_max: number;
  tasa_descuento: number;
  nombre_regla: string | null;
  valid_from: string;
  valid_to: string | null;
  activa: boolean;
  aplica_a_notas_credito: boolean;
  notes: string | null;
}

const SELECT = "id,provider_id,peldano_orden,dias_max,tasa_descuento,nombre_regla,valid_from,valid_to,activa,aplica_a_notas_credito,notes";

export async function getActiveDiscountRulesFull(providerId: number): Promise<DiscountRuleFull[]> {
  const res = await postgrestFetch(
    `/discount_rule?provider_id=eq.${providerId}&activa=eq.true&valid_to=is.null&select=${SELECT}&order=peldano_orden.asc`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /discount_rule -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getAllActiveDiscountRules(): Promise<DiscountRuleFull[]> {
  const res = await postgrestFetch(`/discount_rule?activa=eq.true&valid_to=is.null&select=${SELECT}&order=provider_id.asc,peldano_orden.asc`, {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /discount_rule -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getInactiveDiscountRules(providerId: number): Promise<DiscountRuleFull[]> {
  const res = await postgrestFetch(
    `/discount_rule?provider_id=eq.${providerId}&or=(activa.eq.false,valid_to.not.is.null)&select=${SELECT}&order=valid_to.desc.nullslast`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /discount_rule -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface DiscountPreview {
  facturas: number;
  ahorro_potencial: number;
}

export async function previewDiscountImpact(
  providerId: number,
  diasMax: number,
  tasaDescuento: number,
  excludeRuleId?: number
): Promise<DiscountPreview> {
  const res = await postgrestFetch(
    "/rpc/preview_discount_impact",
    {
      method: "POST",
      body: JSON.stringify({
        p_provider_id: providerId,
        p_dias_max: diasMax,
        p_tasa_descuento: tasaDescuento,
        p_exclude_rule_id: excludeRuleId ?? null,
      }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST rpc/preview_discount_impact -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

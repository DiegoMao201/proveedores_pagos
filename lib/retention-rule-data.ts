import "server-only";
import { postgrestFetch } from "@/lib/postgrest";

export type TipoRetencion = "fuente" | "ica" | "iva" | "otros";
export type BaseCalculo = "valor_base" | "valor_total" | "valor_iva";

export interface RetentionRuleFull {
  id: number;
  provider_id: number;
  tipo_retencion: TipoRetencion;
  tasa: number;
  base_calculo: BaseCalculo;
  valor_minimo: number | null;
  umbral_uvt: number | null;
  aplica_acumulado_diario: boolean;
  nombre_regla: string | null;
  valid_from: string;
  valid_to: string | null;
  activa: boolean;
  notes: string | null;
}

const SELECT =
  "id,provider_id,tipo_retencion,tasa,base_calculo,valor_minimo,umbral_uvt,aplica_acumulado_diario,nombre_regla,valid_from,valid_to,activa,notes";

export async function getActiveRetentionRules(providerId: number): Promise<RetentionRuleFull[]> {
  const res = await postgrestFetch(
    `/retention_rule?provider_id=eq.${providerId}&activa=eq.true&valid_to=is.null&select=${SELECT}&order=tipo_retencion.asc`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /retention_rule -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getInactiveRetentionRules(providerId: number): Promise<RetentionRuleFull[]> {
  const res = await postgrestFetch(
    `/retention_rule?provider_id=eq.${providerId}&or=(activa.eq.false,valid_to.not.is.null)&select=${SELECT}&order=valid_to.desc.nullslast`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /retention_rule -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getAllActiveRetentionRules(): Promise<RetentionRuleFull[]> {
  const res = await postgrestFetch(
    `/retention_rule?activa=eq.true&valid_to=is.null&select=${SELECT}&order=provider_id.asc,tipo_retencion.asc`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /retention_rule -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getCurrentUvt(): Promise<number> {
  const res = await postgrestFetch("/rpc/get_uvt", { method: "POST", body: JSON.stringify({}) }, "providers");
  if (!res.ok) throw new Error(`PostgREST rpc/get_uvt -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

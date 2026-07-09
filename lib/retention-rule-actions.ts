"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import type { TipoRetencion, BaseCalculo } from "@/lib/retention-rule-data";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayBeforeIso(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Una retencion recien creada (o reactivada) no tiene una "regla anterior" que
// proteger, asi que su valid_from debe cubrir las facturas que ya estan
// pendientes de pago (no solo las que se emitan de hoy en adelante).
async function earliestPendingEmisionIso(providerId: number): Promise<string> {
  const res = await postgrestFetch(
    `/v_active_invoices?proveedor_id=eq.${providerId}&fecha_emision=not.is.null&select=fecha_emision&order=fecha_emision.asc&limit=1`,
    {},
    "treasury"
  );
  if (!res.ok) return todayIso();
  const rows = (await res.json()) as { fecha_emision: string }[];
  return rows[0]?.fecha_emision ?? todayIso();
}

export interface RetentionRuleInput {
  tipo_retencion: TipoRetencion;
  tasa: number;
  base_calculo: BaseCalculo;
  nombre_regla: string | null;
  umbral_uvt: number | null;
  valor_minimo: number | null;
  aplica_acumulado_diario: boolean;
}

export async function previewRetentionImpact(
  providerId: number,
  data: Pick<RetentionRuleInput, "tasa" | "base_calculo" | "umbral_uvt" | "valor_minimo" | "aplica_acumulado_diario">
) {
  const res = await postgrestFetch(
    "/rpc/preview_retention_impact",
    {
      method: "POST",
      body: JSON.stringify({
        p_provider_id: providerId,
        p_tasa: data.tasa,
        p_base_calculo: data.base_calculo,
        p_umbral_uvt: data.umbral_uvt,
        p_valor_minimo: data.valor_minimo,
        p_aplica_acumulado_diario: data.aplica_acumulado_diario,
      }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST rpc/preview_retention_impact -> HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ facturas: number; retenido_potencial: number; umbral_pesos: number; uvt_vigente: number }>;
}

export async function createRetentionRule(providerId: number, data: RetentionRuleInput) {
  const userId = await currentUserId();
  const validFrom = await earliestPendingEmisionIso(providerId);
  const res = await postgrestFetch(
    "/retention_rule",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        ...data,
        valid_from: validFrom,
        activa: true,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST POST /retention_rule -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  revalidatePath("/reglas-retencion");
}

export async function editRetentionRule(ruleId: number, providerId: number, data: RetentionRuleInput) {
  const userId = await currentUserId();

  // Igual que editDiscountRule: la nueva version cubre las facturas ya
  // pendientes (no hay historial real que proteger, ver comentario ahi),
  // y la regla vieja se cierra justo un dia antes para no solapar rangos.
  const validFrom = await earliestPendingEmisionIso(providerId);

  const closeRes = await postgrestFetch(
    `/retention_rule?id=eq.${ruleId}`,
    { method: "PATCH", body: JSON.stringify({ valid_to: dayBeforeIso(validFrom), updated_by: userId }) },
    "providers"
  );
  if (!closeRes.ok) throw new Error(`PostgREST PATCH /retention_rule -> HTTP ${closeRes.status}: ${await closeRes.text()}`);

  const createRes = await postgrestFetch(
    "/retention_rule",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        ...data,
        valid_from: validFrom,
        activa: true,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!createRes.ok) throw new Error(`PostgREST POST /retention_rule -> HTTP ${createRes.status}: ${await createRes.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  revalidatePath("/reglas-retencion");
}

export async function deactivateRetentionRule(ruleId: number, providerId: number, motivo: string) {
  const userId = await currentUserId();
  const existingRes = await postgrestFetch(`/retention_rule?id=eq.${ruleId}&select=notes`, {}, "providers");
  const existing = existingRes.ok ? ((await existingRes.json()) as { notes: string | null }[])[0] : null;
  const notes = [existing?.notes, motivo ? `Desactivada: ${motivo}` : "Desactivada"].filter(Boolean).join("\n");

  const res = await postgrestFetch(
    `/retention_rule?id=eq.${ruleId}`,
    { method: "PATCH", body: JSON.stringify({ activa: false, valid_to: todayIso(), updated_by: userId, notes }) },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST PATCH /retention_rule -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  revalidatePath("/reglas-retencion");
}

export async function reactivateRetentionRule(ruleId: number, providerId: number) {
  const userId = await currentUserId();
  const res = await postgrestFetch(`/retention_rule?id=eq.${ruleId}&select=*`, {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /retention_rule -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as (RetentionRuleInput & { id: number })[];
  const rule = rows[0];
  if (!rule) throw new Error("Regla no encontrada");

  const validFrom = await earliestPendingEmisionIso(providerId);

  const createRes = await postgrestFetch(
    "/retention_rule",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        tipo_retencion: rule.tipo_retencion,
        tasa: rule.tasa,
        base_calculo: rule.base_calculo,
        nombre_regla: rule.nombre_regla,
        umbral_uvt: rule.umbral_uvt,
        valor_minimo: rule.valor_minimo,
        aplica_acumulado_diario: rule.aplica_acumulado_diario,
        valid_from: validFrom,
        activa: true,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!createRes.ok) throw new Error(`PostgREST POST /retention_rule -> HTTP ${createRes.status}: ${await createRes.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  revalidatePath("/reglas-retencion");
}

export async function updateAutoretenedor(providerId: number, esAutoretenedor: boolean) {
  const userId = await currentUserId();
  const res = await postgrestFetch(
    `/provider?id=eq.${providerId}`,
    { method: "PATCH", body: JSON.stringify({ es_autoretenedor: esAutoretenedor, updated_by: userId }) },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST PATCH /provider -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
}

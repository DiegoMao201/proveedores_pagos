"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { previewDiscountImpact as previewDiscountImpactData, type DiscountPreview } from "@/lib/discount-rule-data";

export async function previewDiscountImpact(
  providerId: number,
  diasMax: number,
  tasaDescuento: number,
  excludeRuleId?: number
): Promise<DiscountPreview> {
  return previewDiscountImpactData(providerId, diasMax, tasaDescuento, excludeRuleId);
}

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Un peldano recien creado (o reactivado) no tiene una "regla anterior" que
// proteger, asi que su valid_from debe cubrir las facturas que ya estan
// pendientes de pago (no solo las que se emitan de hoy en adelante) para que
// coincida con lo que previewDiscountImpact le mostro al usuario antes de guardar.
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

function dayBeforeIso(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface DiscountRuleInput {
  dias_max: number;
  tasa_descuento: number;
  nombre_regla: string | null;
  aplica_a_notas_credito: boolean;
}

async function getNextPeldano(providerId: number): Promise<number> {
  const res = await postgrestFetch(
    `/discount_rule?provider_id=eq.${providerId}&activa=eq.true&valid_to=is.null&select=peldano_orden&order=peldano_orden.desc&limit=1`,
    {},
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST /discount_rule -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as { peldano_orden: number }[];
  return (rows[0]?.peldano_orden ?? 0) + 1;
}

export async function createDiscountRule(providerId: number, data: DiscountRuleInput) {
  const userId = await currentUserId();
  const [peldanoOrden, validFrom] = await Promise.all([getNextPeldano(providerId), earliestPendingEmisionIso(providerId)]);

  const res = await postgrestFetch(
    "/discount_rule",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        peldano_orden: peldanoOrden,
        dias_max: data.dias_max,
        tasa_descuento: data.tasa_descuento,
        nombre_regla: data.nombre_regla,
        aplica_a_notas_credito: data.aplica_a_notas_credito,
        valid_from: validFrom,
        activa: true,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST POST /discount_rule -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  revalidatePath("/reglas-descuento");
}

export async function editDiscountRule(ruleId: number, providerId: number, peldanoOrden: number, data: DiscountRuleInput) {
  const userId = await currentUserId();

  // Versionado estricto (regla H.2): nunca se modifica la fila vigente. Se cierra
  // y se crea una nueva con el mismo peldano_orden. La nueva regla cubre las
  // facturas que ya estan pendientes de pago (no solo las que se emitan de hoy
  // en adelante): no hay historial real que proteger ahi (payment_batch_item
  // guarda su propia foto del descuento aplicado al armar el lote, asi que una
  // factura ya pagada nunca vuelve a pasar por calculate_discount). La vieja
  // regla se cierra justo un dia antes de donde arranca la nueva para que no
  // se solapen sus rangos de vigencia.
  const validFrom = await earliestPendingEmisionIso(providerId);

  const closeRes = await postgrestFetch(
    `/discount_rule?id=eq.${ruleId}`,
    { method: "PATCH", body: JSON.stringify({ valid_to: dayBeforeIso(validFrom), updated_by: userId }) },
    "providers"
  );
  if (!closeRes.ok) throw new Error(`PostgREST PATCH /discount_rule -> HTTP ${closeRes.status}: ${await closeRes.text()}`);

  const createRes = await postgrestFetch(
    "/discount_rule",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        peldano_orden: peldanoOrden,
        dias_max: data.dias_max,
        tasa_descuento: data.tasa_descuento,
        nombre_regla: data.nombre_regla,
        aplica_a_notas_credito: data.aplica_a_notas_credito,
        valid_from: validFrom,
        activa: true,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!createRes.ok) throw new Error(`PostgREST POST /discount_rule -> HTTP ${createRes.status}: ${await createRes.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  revalidatePath("/reglas-descuento");
}

export async function deactivateDiscountRule(ruleId: number, providerId: number, motivo: string) {
  const userId = await currentUserId();
  const existingRes = await postgrestFetch(`/discount_rule?id=eq.${ruleId}&select=notes`, {}, "providers");
  const existing = existingRes.ok ? ((await existingRes.json()) as { notes: string | null }[])[0] : null;
  const notes = [existing?.notes, motivo ? `Desactivada: ${motivo}` : "Desactivada"].filter(Boolean).join("\n");

  const res = await postgrestFetch(
    `/discount_rule?id=eq.${ruleId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ activa: false, valid_to: todayIso(), updated_by: userId, notes }),
    },
    "providers"
  );
  if (!res.ok) throw new Error(`PostgREST PATCH /discount_rule -> HTTP ${res.status}: ${await res.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  revalidatePath("/reglas-descuento");
}

export async function reactivateDiscountRule(ruleId: number, providerId: number) {
  const userId = await currentUserId();
  const res = await postgrestFetch(`/discount_rule?id=eq.${ruleId}&select=*`, {}, "providers");
  if (!res.ok) throw new Error(`PostgREST /discount_rule -> HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as {
    peldano_orden: number;
    dias_max: number;
    tasa_descuento: number;
    nombre_regla: string | null;
    aplica_a_notas_credito: boolean;
  }[];
  const rule = rows[0];
  if (!rule) throw new Error("Regla no encontrada");

  const [peldanoOrden, validFrom] = await Promise.all([getNextPeldano(providerId), earliestPendingEmisionIso(providerId)]);

  const createRes = await postgrestFetch(
    "/discount_rule",
    {
      method: "POST",
      body: JSON.stringify({
        provider_id: providerId,
        peldano_orden: peldanoOrden,
        dias_max: rule.dias_max,
        tasa_descuento: rule.tasa_descuento,
        nombre_regla: rule.nombre_regla,
        aplica_a_notas_credito: rule.aplica_a_notas_credito,
        valid_from: validFrom,
        activa: true,
        created_by: userId,
        updated_by: userId,
      }),
    },
    "providers"
  );
  if (!createRes.ok) throw new Error(`PostgREST POST /discount_rule -> HTTP ${createRes.status}: ${await createRes.text()}`);
  revalidatePath(`/proveedores/${providerId}`);
  revalidatePath("/reglas-descuento");
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";
import { listProviders, type ProviderRow } from "@/lib/provider-detail-data";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

export async function getProvidersForAdd(excludeIds: number[]): Promise<ProviderRow[]> {
  const providers = await listProviders();
  const exclude = new Set(excludeIds);
  return providers.filter((p) => p.activo && !exclude.has(p.id));
}

function revalidateBatch(codigoLote: string) {
  revalidatePath(`/lotes/${codigoLote}`);
  revalidatePath("/lotes");
  revalidatePath("/mesa-de-pagos");
}

export async function markBatchExported(batchId: number, codigoLote: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/mark_batch_exported",
    { method: "POST", body: JSON.stringify({ p_batch_id: batchId, p_user_id: userId }) },
    "treasury"
  );
  if (!res.ok) {
    const body = await res.text();
    try {
      const parsed = JSON.parse(body) as { message?: string };
      return { ok: false, error: parsed.message ?? body };
    } catch {
      return { ok: false, error: body };
    }
  }

  revalidateBatch(codigoLote);
  return { ok: true };
}

export async function markBatchPaid(
  batchId: number,
  codigoLote: string
): Promise<{ ok: boolean; error?: string; nuevoCodigoLote?: string; facturasMovidas?: number }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    `/payment_batch?id=eq.${batchId}&estado=eq.exported`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ estado: "paid", paid_at: new Date().toISOString(), paid_by: userId }),
    },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
  const rows = (await res.json()) as unknown[];
  if (rows.length === 0) return { ok: false, error: "El lote ya no está en estado 'exportado'." };

  revalidateBatch(codigoLote);
  return { ok: true };
}

export async function markBatchPaidPartial(
  batchId: number,
  paidItemIds: number[],
  codigoLote: string
): Promise<{ ok: boolean; error?: string; nuevoCodigoLote?: string; facturasMovidas?: number }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/mark_batch_paid_partial",
    { method: "POST", body: JSON.stringify({ p_batch_id: batchId, p_paid_item_ids: paidItemIds, p_user_id: userId }) },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string; nuevo_codigo_lote?: string; facturas_movidas?: number };
  if (result.error === "BATCH_NOT_EXPORTED") return { ok: false, error: "Este lote no está en estado 'exportado'." };
  if (result.error === "BATCH_HAS_ABONOS_APLICADOS") {
    return { ok: false, error: "Este lote tiene abonos de sede aplicados -- desaplícalos primero para poder dividirlo." };
  }
  if (result.error === "NO_ITEMS_SELECTED") return { ok: false, error: "Marca al menos una factura como pagada." };
  if (result.error) return { ok: false, error: result.error };

  revalidateBatch(codigoLote);
  if (result.nuevo_codigo_lote) revalidatePath(`/lotes/${result.nuevo_codigo_lote}`);
  return { ok: true, nuevoCodigoLote: result.nuevo_codigo_lote, facturasMovidas: result.facturas_movidas };
}

export async function addInvoicesToBatch(batchId: number, invoiceKeys: string[], codigoLote: string): Promise<{ ok: boolean; error?: string; numAgregadas?: number }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };
  if (invoiceKeys.length === 0) return { ok: false, error: "Selecciona al menos una factura." };

  const res = await postgrestFetch(
    "/rpc/add_invoices_to_batch",
    { method: "POST", body: JSON.stringify({ p_batch_id: batchId, p_invoice_keys: invoiceKeys, p_user_id: userId }) },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string; num_agregadas?: number };
  if (result.error === "BATCH_NOT_EDITABLE") return { ok: false, error: "Este lote ya no se puede editar (no está en borrador ni exportado)." };
  if (result.error === "INVOICE_ALREADY_IN_ACTIVE_BATCH") return { ok: false, error: "Alguna de estas facturas ya está en otro lote activo." };
  if (result.error === "INVOICE_NOT_SELECTABLE") return { ok: false, error: "Alguna de estas facturas ya no está disponible para pagar." };
  if (result.error === "INVOICE_PROVIDER_MISMATCH") return { ok: false, error: "Estas facturas son de un proveedor distinto al del lote." };
  if (result.error) return { ok: false, error: result.error };

  revalidateBatch(codigoLote);
  return { ok: true, numAgregadas: result.num_agregadas };
}

export async function removeBatchItem(batchId: number, itemId: number, codigoLote: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/remove_batch_item",
    { method: "POST", body: JSON.stringify({ p_batch_id: batchId, p_item_id: itemId, p_user_id: userId }) },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string };
  if (result.error === "BATCH_NOT_EDITABLE") return { ok: false, error: "Este lote ya no se puede editar." };
  if (result.error === "BATCH_MUST_HAVE_AT_LEAST_ONE_ITEM") return { ok: false, error: "El lote debe tener al menos una factura. Si necesitas vaciarlo, cancélalo." };
  if (result.error) return { ok: false, error: result.error };

  revalidateBatch(codigoLote);
  return { ok: true };
}

export async function overrideBatchItemDiscount(
  batchId: number,
  itemId: number,
  valorDescuento: number,
  codigoLote: string,
  motivo?: string
): Promise<{ ok: boolean; error?: string; valorNeto?: number }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/override_batch_item_discount",
    {
      method: "POST",
      body: JSON.stringify({ p_batch_id: batchId, p_item_id: itemId, p_valor_descuento: valorDescuento, p_user_id: userId, p_motivo: motivo ?? null }),
    },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string; valor_neto?: number };
  if (result.error === "BATCH_NOT_EDITABLE") return { ok: false, error: "Este lote ya no se puede editar." };
  if (result.error === "DISCOUNT_EXCEEDS_GROSS_VALUE") return { ok: false, error: "El descuento no puede ser mayor al valor bruto de la factura." };
  if (result.error === "NEGATIVE_ITEM_NET") return { ok: false, error: "Ese descuento dejaría el neto de la factura en negativo." };
  if (result.error === "INVALID_DISCOUNT_VALUE") return { ok: false, error: "Valor de descuento inválido." };
  if (result.error) return { ok: false, error: result.error };

  revalidateBatch(codigoLote);
  return { ok: true, valorNeto: result.valor_neto };
}

export async function applyPartialPayment(
  batchId: number,
  itemId: number,
  valorPagado: number,
  motivo: string,
  codigoLote: string
): Promise<{ ok: boolean; error?: string; saldoPendiente?: number }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/apply_partial_payment",
    {
      method: "POST",
      body: JSON.stringify({ p_batch_id: batchId, p_item_id: itemId, p_valor_pagado: valorPagado, p_user_id: userId, p_motivo: motivo }),
    },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string; saldo_pendiente?: number };
  if (result.error === "BATCH_NOT_EDITABLE") return { ok: false, error: "Este lote ya no se puede editar." };
  if (result.error === "MOTIVO_MUY_CORTO") return { ok: false, error: "El motivo debe tener al menos 10 caracteres." };
  if (result.error === "ALREADY_PARTIAL") return { ok: false, error: "Esta factura ya tiene un pago parcial aplicado. Revierte el actual antes de aplicar uno nuevo." };
  if (result.error === "NOT_LESS_THAN_FULL_VALUE") return { ok: false, error: "El valor a pagar debe ser menor al neto completo de la factura." };
  if (result.error === "ABONOS_EXCEDEN_NUEVO_NETO") return { ok: false, error: "Ese pago parcial dejaría el lote por debajo de los abonos de sede ya aplicados." };
  if (result.error === "INVALID_VALUE") return { ok: false, error: "Valor inválido." };
  if (result.error) return { ok: false, error: result.error };

  revalidateBatch(codigoLote);
  return { ok: true, saldoPendiente: result.saldo_pendiente };
}

export async function revertPartialPayment(batchId: number, itemId: number, codigoLote: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };

  const res = await postgrestFetch(
    "/rpc/revert_partial_payment",
    { method: "POST", body: JSON.stringify({ p_batch_id: batchId, p_item_id: itemId, p_user_id: userId }) },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };

  const result = (await res.json()) as { ok?: boolean; error?: string };
  if (result.error === "BATCH_NOT_EDITABLE") return { ok: false, error: "Este lote ya no se puede editar." };
  if (result.error === "NOT_PARTIAL_PAYMENT") return { ok: false, error: "Esta factura no tiene un pago parcial aplicado." };
  if (result.error) return { ok: false, error: result.error };

  revalidateBatch(codigoLote);
  return { ok: true };
}

export async function cancelBatch(batchId: number, codigoLote: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "NO_SESSION" };
  if (reason.trim().length < 5) return { ok: false, error: "El motivo debe tener al menos 5 caracteres." };

  const res = await postgrestFetch(
    `/payment_batch?id=eq.${batchId}&estado=in.(draft,exported)`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ estado: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: userId, cancelled_reason: reason }),
    },
    "treasury"
  );
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
  const rows = (await res.json()) as unknown[];
  if (rows.length === 0) return { ok: false, error: "El lote ya no se puede cancelar desde su estado actual." };

  await postgrestFetch(
    "/batch_payment_log",
    {
      method: "POST",
      body: JSON.stringify({ batch_id: batchId, event: "BATCH_CANCELLED", user_id: userId, metadata: { motivo: reason } }),
    },
    "audit"
  );

  revalidateBatch(codigoLote);
  return { ok: true };
}

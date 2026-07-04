"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { postgrestFetch } from "@/lib/postgrest";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
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

export async function markBatchPaid(batchId: number, codigoLote: string): Promise<{ ok: boolean; error?: string }> {
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
